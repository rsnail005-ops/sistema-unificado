/**
 * RealtimeService — Supabase Realtime via WebSocket
 *
 * Escucha cambios en todas las tablas críticas (registros, pagos, asistencias)
 * en tiempo real. Cuando el servidor notifica un cambio, se aplica inmediatamente
 * al localStorage y se disparan los eventos de React correspondientes.
 *
 * Regla central: EL SERVIDOR SIEMPRE GANA cuando la app está en línea.
 */

import { SupabaseService } from './supabase';
import { StorageService } from './storage';

const STORAGE_KEYS = {
  REGISTROS: 'mpv_registros_v1',
  PAGOS: 'mpv_pagos_v1',
  ASISTENCIAS: 'mpv_asistencias_v1',
};

type RealtimePayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: any;
  old_record: any;
  schema: string;
};

let ws: WebSocket | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isSubscribed = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 20;
const RECONNECT_BASE_MS = 3000;

// ──────────────────────────────────────────────────────────────────────────────
// Aplicadores server-first: el dato del servidor reemplaza lo local
// ──────────────────────────────────────────────────────────────────────────────

function aplicarCambioRegistro(payload: RealtimePayload) {
  const raw = localStorage.getItem(STORAGE_KEYS.REGISTROS);
  let lista: any[] = raw ? JSON.parse(raw) : [];
  let modificado = false;

  if (payload.type === 'DELETE') {
    const id = payload.old_record?.id;
    if (!id) return;
    const prevLen = lista.length;
    lista = lista.filter(r => r.id !== id);
    modificado = lista.length !== prevLen;
  } else {
    const rec = payload.record;
    if (!rec?.id) return;
    const idx = lista.findIndex(r =>
      r.id === rec.id ||
      (r.datos?.cedula && rec.datos?.cedula &&
        r.datos.cedula.trim().toUpperCase() === rec.datos.cedula.trim().toUpperCase())
    );

    if (payload.type === 'INSERT' && idx === -1) {
      lista.unshift({ ...rec, sincronizado: true });
      modificado = true;
    } else if (payload.type === 'UPDATE' && idx !== -1) {
      lista[idx] = { ...lista[idx], ...rec, sincronizado: true };
      modificado = true;
    } else if (payload.type === 'INSERT' && idx !== -1) {
      lista[idx] = { ...lista[idx], ...rec, sincronizado: true };
      modificado = true;
    }
  }

  if (modificado) {
    localStorage.setItem(STORAGE_KEYS.REGISTROS, JSON.stringify(lista));
    window.dispatchEvent(new CustomEvent('mpv-data-updated'));
    window.dispatchEvent(new CustomEvent('mpv-registros-updated'));
  }
}

function aplicarCambioPago(payload: RealtimePayload) {
  const raw = localStorage.getItem(STORAGE_KEYS.PAGOS);
  let lista: any[] = raw ? JSON.parse(raw) : [];
  let modificado = false;

  if (payload.type === 'DELETE') {
    const id = payload.old_record?.id;
    if (!id) return;
    const prevLen = lista.length;
    lista = lista.filter(p => p.id !== id);
    modificado = lista.length !== prevLen;
  } else {
    const rec = payload.record;
    if (!rec?.id) return;
    const idx = lista.findIndex(p =>
      p.id === rec.id ||
      (p.referencia && rec.referencia &&
        p.referencia.trim().toUpperCase() === rec.referencia.trim().toUpperCase())
    );

    // Extraer metadatos si vienen en observaciones
    let montoUsd = rec.monto_usd != null ? Number(rec.monto_usd) : undefined;
    let tasaBcv = rec.tasa_bcv != null ? Number(rec.tasa_bcv) : undefined;
    let tipoMembresia = rec.tipo_membresia;
    let fechaVenc = rec.fecha_vencimiento;
    let obsTexto = rec.observaciones || '';

    if (obsTexto && obsTexto.startsWith('[')) {
      const closeIdx = obsTexto.indexOf(']');
      if (closeIdx > 0) {
        const header = obsTexto.substring(1, closeIdx);
        const usdM = header.match(/USD:\s*\$?([\d.]+)/i);
        if (usdM && montoUsd == null) montoUsd = parseFloat(usdM[1]);
        const bcvM = header.match(/BCV:\s*([\d.]+)/i);
        if (bcvM && tasaBcv == null) tasaBcv = parseFloat(bcvM[1]);
        const memM = header.match(/Membresía:\s*([^|\]]+)/i);
        if (memM && !tipoMembresia) tipoMembresia = memM[1].trim() as any;
        const venM = header.match(/Vence:\s*([^|\]]+)/i);
        if (venM && !fechaVenc) fechaVenc = venM[1].trim();
        obsTexto = obsTexto.substring(closeIdx + 1).trim();
      }
    }

    const pagoLimpio = {
      ...rec,
      monto_bs: Number(rec.monto_bs) || 0,
      monto_usd: montoUsd,
      tasa_bcv: tasaBcv,
      tipo_membresia: tipoMembresia,
      fecha_vencimiento: fechaVenc,
      observaciones: obsTexto
    };

    if (payload.type === 'INSERT' && idx === -1) {
      lista.unshift(pagoLimpio);
      modificado = true;
    } else if ((payload.type === 'UPDATE' || payload.type === 'INSERT') && idx !== -1) {
      lista[idx] = { ...lista[idx], ...pagoLimpio };
      modificado = true;
    }
  }

  if (modificado) {
    localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(lista));
    window.dispatchEvent(new CustomEvent('mpv-pagos-updated'));
    window.dispatchEvent(new CustomEvent('mpv-data-updated'));
  }
}

function aplicarCambioAsistencia(payload: RealtimePayload) {
  const raw = localStorage.getItem(STORAGE_KEYS.ASISTENCIAS);
  let lista: any[] = raw ? JSON.parse(raw) : [];
  let modificado = false;

  if (payload.type === 'DELETE') {
    const id = payload.old_record?.id;
    if (!id) return;
    const prevLen = lista.length;
    lista = lista.filter(a => a.id !== id);
    modificado = lista.length !== prevLen;
  } else {
    const rec = payload.record;
    if (!rec?.id) return;
    const idx = lista.findIndex(a =>
      a.id === rec.id ||
      (a.usuario_cedula === rec.usuario_cedula &&
        a.fecha === rec.fecha &&
        a.hora_entrada === rec.hora_entrada)
    );

    if (payload.type === 'INSERT' && idx === -1) {
      lista.unshift({ ...rec });
      modificado = true;
    } else if ((payload.type === 'UPDATE' || payload.type === 'INSERT') && idx !== -1) {
      lista[idx] = { ...lista[idx], ...rec };
      modificado = true;
    }
  }

  if (modificado) {
    localStorage.setItem(STORAGE_KEYS.ASISTENCIAS, JSON.stringify(lista));
    window.dispatchEvent(new CustomEvent('mpv-asistencias-updated'));
    window.dispatchEvent(new CustomEvent('mpv-data-updated'));
  }
}

function despacharCambio(payload: RealtimePayload) {
  switch (payload.table) {
    case 'registros': aplicarCambioRegistro(payload); break;
    case 'pagos': aplicarCambioPago(payload); break;
    case 'asistencias': aplicarCambioAsistencia(payload); break;
    default: break;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// WebSocket Realtime (Supabase Phoenix protocol)
// ──────────────────────────────────────────────────────────────────────────────

function construirWsUrl(supabaseUrl: string, anonKey: string): string {
  const base = supabaseUrl.replace(/^https?:\/\//, '');
  return `wss://${base}/realtime/v1/websocket?apikey=${anonKey}&vsn=1.0.0`;
}

function enviarMensaje(data: object) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function suscribirTablas() {
  const tablas = ['registros', 'pagos', 'asistencias'];
  tablas.forEach(tabla => {
    enviarMensaje({
      topic: `realtime:public:${tabla}`,
      event: 'phx_join',
      payload: {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
          postgres_changes: [{ event: '*', schema: 'public', table: tabla }]
        }
      },
      ref: `join_${tabla}`
    });
  });
}

function iniciarHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    enviarMensaje({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: null });
  }, 20000);
}

function detenerHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function programarReconexion() {
  if (reconnectTimer) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[Realtime] Máximo de reconexiones alcanzado. Desistiendo.');
    return;
  }

  const delay = Math.min(RECONNECT_BASE_MS * Math.pow(1.5, reconnectAttempts), 30000);
  reconnectAttempts++;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    conectar();
  }, delay);
}

function conectar() {
  const url = SupabaseService.getUrl();
  const key = SupabaseService.getKey();
  const config = StorageService.obtenerConfig();

  if (!url || !key) return;
  if (config.modo_red === 'offline') return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  try {
    ws = new WebSocket(construirWsUrl(url, key));

    ws.onopen = () => {
      reconnectAttempts = 0;
      isSubscribed = true;
      suscribirTablas();
      iniciarHeartbeat();
      window.dispatchEvent(new CustomEvent('mpv-realtime-connected'));
      console.info('[Realtime] Conectado y suscrito a cambios del servidor.');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.event === 'phx_reply' && msg.payload?.status === 'ok') return;

        // Formato v1
        if (msg.event === 'postgres_changes' || msg.event === '*') {
          const chg = msg.payload?.data || msg.payload;
          if (chg?.type && chg?.table) {
            despacharCambio(chg as RealtimePayload);
          }
        }

        // Formato v2 (wrapped)
        if (msg.payload?.data?.type && msg.payload?.data?.table) {
          despacharCambio(msg.payload.data as RealtimePayload);
        }
      } catch {
        // Ignorar mensajes malformados
      }
    };

    ws.onerror = () => {
      // El onclose manejará la reconexión
    };

    ws.onclose = (ev) => {
      isSubscribed = false;
      detenerHeartbeat();
      window.dispatchEvent(new CustomEvent('mpv-realtime-disconnected'));

      if (ev.code !== 1000) {
        programarReconexion();
      }
    };
  } catch (err) {
    console.warn('[Realtime] No se pudo crear WebSocket:', err);
    programarReconexion();
  }
}

function desconectar() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  detenerHeartbeat();
  if (ws) {
    ws.close(1000, 'Cierre intencional');
    ws = null;
  }
  isSubscribed = false;
  reconnectAttempts = 0;
}

// ──────────────────────────────────────────────────────────────────────────────
// API pública
// ──────────────────────────────────────────────────────────────────────────────

export const RealtimeService = {
  iniciar() {
    conectar();
  },

  detener() {
    desconectar();
  },

  estaConectado(): boolean {
    return isSubscribed && ws?.readyState === WebSocket.OPEN;
  },

  async sincronizarDesdeServidor(): Promise<void> {
    const config = StorageService.obtenerConfig();
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (config.modo_red === 'offline' || isOffline) return;

    try {
      await StorageService.descargarActualizacionesDesdeServidor();
      window.dispatchEvent(new CustomEvent('mpv-data-updated'));
    } catch (err) {
      console.warn('[Realtime] Error al sincronizar desde servidor:', err);
    }
  }
};
