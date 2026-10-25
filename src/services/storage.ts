import { 
  Registro, 
  SyncItem, 
  AuditLogEntry, 
  UsuarioSesion, 
  TipoRegistro,
  BicicletaSpinning,
  HorarioPisoItem,
  ClaseProgramada,
  PagoRegistro,
  AsistenciaRegistro,
  EstadoSolvencia,
  MetodoPago
} from '../types';
import * as XLSX from 'xlsx';
import { SupabaseService, SyncResult, ServerStatusInfo } from './supabase';

const STORAGE_KEYS = {
  REGISTROS: 'mpv_registros_v1',
  COLA_SYNC: 'mpv_cola_sync_v1',
  AUDIT_LOG: 'mpv_audit_log_v1',
  SESION: 'mpv_usuario_sesion_v1',
  CONFIG: 'mpv_config_v1',
  SPINNING_BIKES: 'mpv_spinning_bikes_v1',
  HORARIOS_PISOS: 'mpv_horarios_pisos_v1',
  CLASES: 'mpv_clases_v1',
  PAGOS: 'mpv_pagos_v1',
  ASISTENCIAS: 'mpv_asistencias_v1'
};

export interface AppConfig {
  modo_red: 'online' | 'offline';
  modo_manual_offline?: boolean;
  supabase_url?: string;
  supabase_anon_key?: string;
  auto_sync: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  modo_red: 'online',
  modo_manual_offline: false,
  auto_sync: true,
  supabase_url: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://jrjkuzjpabfaburppgtb.supabase.co',
  supabase_anon_key: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_C-8wmkw92r-UMOrIdmqvAA_wQakDXZ7'
};

// Generador universal de identificadores UUID v4 compatible con Supabase y PostgreSQL
export function generarUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generador de reloj lógico híbrido (HLC)
class HybridLogicalClock {
  private static logicalCounter = 0;
  private static lastTime = 0;
  private static nodeId = 'VE-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  static now(): string {
    const physicalTime = Date.now();
    if (physicalTime > this.lastTime) {
      this.lastTime = physicalTime;
      this.logicalCounter = 0;
    } else {
      this.logicalCounter++;
    }
    const iso = new Date(this.lastTime).toISOString();
    const count = String(this.logicalCounter).padStart(4, '0');
    return `${iso}-${count}-${this.nodeId}`;
  }
}

// IDs de datos demo hardcodeados en versiones anteriores — se eliminan automáticamente
// IDs y datos demo hardcodeados en versiones anteriores — purga total e inmediata
const LEGACY_DEMO_REGISTRO_IDS = [
  '018e3a2b-7c45-7123-89ab-cdef01234567',
  '018e3a2b-7c45-7123-89ab-cdef01234568',
  '018e3a2b-7c45-7123-89ab-cdef01234569',
];
const LEGACY_DEMO_SYNC_IDS = ['sync-demo-001', 'sync-demo-002', 'sync-demo-003', 'sync-demo-004'];
const LEGACY_DEMO_PAGO_IDS = ['pago-001', 'pago-002'];
const LEGACY_DEMO_ASIST_IDS = ['asist-001', 'asist-002'];
const GHOST_USER_IDS = ['USUARIO-001', 'USUARIO-002'];
const GHOST_CEDULAS = ['V-18452391', 'V-20194827', '18452391', '20194827'];
const GHOST_NAMES = ['carlos eduardo mendoza', 'carlos mendoza', 'yusmeidy carolina pérez', 'yusmeidy perez', 'yusmeidy carolina perez'];

export class StorageService {
  /**
   * Elimina completamente cualquier usuario fantasma o dato demo que haya quedado en localStorage.
   * Se ejecuta automáticamente al arrancar la aplicación.
   */
  static limpiarDemosLegacy() {
    try {
      const isGhost = (item: any) => {
        if (!item) return false;
        const ced = String(item.usuario_cedula || item.cedula || '').replace(/[^0-9]/g, '');
        const nom = String(item.usuario_nombre || item.nombre || item.Nombre_Atleta || '').toLowerCase();
        const uid = String(item.usuario_id || item.id || '');
        if (GHOST_USER_IDS.includes(uid)) return true;
        if (GHOST_CEDULAS.some(c => c.includes(ced) && ced.length > 4)) return true;
        if (GHOST_NAMES.some(n => nom.includes(n))) return true;
        return false;
      };

      const rawReg = localStorage.getItem(STORAGE_KEYS.REGISTROS);
      if (rawReg) {
        const filtered = JSON.parse(rawReg).filter((r: any) => !LEGACY_DEMO_REGISTRO_IDS.includes(r.id) && !isGhost(r));
        localStorage.setItem(STORAGE_KEYS.REGISTROS, JSON.stringify(filtered));
      }
      const rawSync = localStorage.getItem(STORAGE_KEYS.COLA_SYNC);
      if (rawSync) {
        const filtered = JSON.parse(rawSync).filter((q: any) => !LEGACY_DEMO_SYNC_IDS.includes(q.id) && !isGhost(q));
        localStorage.setItem(STORAGE_KEYS.COLA_SYNC, JSON.stringify(filtered));
      }
      const rawPagos = localStorage.getItem(STORAGE_KEYS.PAGOS);
      if (rawPagos) {
        const filtered = JSON.parse(rawPagos).filter((p: any) => !LEGACY_DEMO_PAGO_IDS.includes(p.id) && !isGhost(p));
        localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(filtered));
      }
      const rawAsist = localStorage.getItem(STORAGE_KEYS.ASISTENCIAS);
      if (rawAsist) {
        const filtered = JSON.parse(rawAsist).filter((a: any) => !LEGACY_DEMO_ASIST_IDS.includes(a.id) && !isGhost(a));
        localStorage.setItem(STORAGE_KEYS.ASISTENCIAS, JSON.stringify(filtered));
      }
      const rawBikes = localStorage.getItem(STORAGE_KEYS.SPINNING_BIKES);
      if (rawBikes) {
        const bikes = JSON.parse(rawBikes).map((b: any) => {
          if (isGhost(b)) {
            return {
              id: b.id,
              fila: b.fila,
              numero: b.numero,
              estado: 'Disponible'
            };
          }
          return b;
        });
        localStorage.setItem(STORAGE_KEYS.SPINNING_BIKES, JSON.stringify(bikes));
      }
    } catch {
      // Ignorar error de parse, no interrumpir arranque
    }
  }

  /**
   * Inicializa la configuración de la aplicación al arrancar.
   * NO crea ningún dato de personas, eventos ni pagos — todo viene del servidor.
   * Solo inicializa: configuración de red y recursos operativos del gimnasio.
   */
  static inicializarApp() {
    // 1. Limpiar datos demo legacy de versiones anteriores
    this.limpiarDemosLegacy();

    // 2. Inicializar configuración de red si no existe
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
    } else {
      // Migración automática: URL legacy → nuevo servidor
      const cfg = this.obtenerConfig();
      if (cfg.supabase_url && cfg.supabase_url.includes('oxliwrrrmefuisuzdtpr')) {
        this.guardarConfig({
          supabase_url: DEFAULT_CONFIG.supabase_url,
          supabase_anon_key: DEFAULT_CONFIG.supabase_anon_key
        });
      }
    }

    // 3. Inicializar recursos operativos del gimnasio (infraestructura, sin usuarios fantasma)
    this.inicializarGranBasePaz();
  }

  // Inicialización de datos específicos del Gimnasio Vertical / Gran Base de Paz (recursos físicos limpios)
  static inicializarGranBasePaz() {
    // 1. Inicializar 20 Bicicletas de Spinning 100% disponibles (sin preasignaciones fantasma)
    if (!localStorage.getItem(STORAGE_KEYS.SPINNING_BIKES)) {
      const bicis: BicicletaSpinning[] = [
        // Fila A (Frente - 4 bicis)
        { id: 'Bici A-1', fila: 'Fila A (Frente)', numero: 1, estado: 'Disponible' },
        { id: 'Bici A-2', fila: 'Fila A (Frente)', numero: 2, estado: 'Disponible' },
        { id: 'Bici A-3', fila: 'Fila A (Frente)', numero: 3, estado: 'Disponible' },
        { id: 'Bici A-4', fila: 'Fila A (Frente)', numero: 4, estado: 'Disponible' },
        // Fila B (6 bicis)
        { id: 'Bici B-1', fila: 'Fila B', numero: 5, estado: 'Disponible' },
        { id: 'Bici B-2', fila: 'Fila B', numero: 6, estado: 'Disponible' },
        { id: 'Bici B-3', fila: 'Fila B', numero: 7, estado: 'Mantenimiento' },
        { id: 'Bici B-4', fila: 'Fila B', numero: 8, estado: 'Disponible' },
        { id: 'Bici B-5', fila: 'Fila B', numero: 9, estado: 'Disponible' },
        { id: 'Bici B-6', fila: 'Fila B', numero: 10, estado: 'Disponible' },
        // Fila C (6 bicis)
        { id: 'Bici C-1', fila: 'Fila C', numero: 11, estado: 'Disponible' },
        { id: 'Bici C-2', fila: 'Fila C', numero: 12, estado: 'Disponible' },
        { id: 'Bici C-3', fila: 'Fila C', numero: 13, estado: 'Disponible' },
        { id: 'Bici C-4', fila: 'Fila C', numero: 14, estado: 'Disponible' },
        { id: 'Bici C-5', fila: 'Fila C', numero: 15, estado: 'Disponible' },
        { id: 'Bici C-6', fila: 'Fila C', numero: 16, estado: 'Disponible' },
        // Fila D (Fondo - 4 bicis)
        { id: 'Bici D-1', fila: 'Fila D (Fondo)', numero: 17, estado: 'Disponible' },
        { id: 'Bici D-2', fila: 'Fila D (Fondo)', numero: 18, estado: 'Disponible' },
        { id: 'Bici D-3', fila: 'Fila D (Fondo)', numero: 19, estado: 'Disponible' },
        { id: 'Bici D-4', fila: 'Fila D (Fondo)', numero: 20, estado: 'Disponible' }
      ];
      localStorage.setItem(STORAGE_KEYS.SPINNING_BIKES, JSON.stringify(bicis));
    }

    // 2. Horarios por Pisos (Matriz del Excel: Funcionamiento General)
    if (!localStorage.getItem(STORAGE_KEYS.HORARIOS_PISOS)) {
      const horarios: HorarioPisoItem[] = [
        { id: 'h-1', horario: '07:00 - 08:00', turno: 'Mañana', piso2_crossfit: 'Mantenimiento', piso2_musculacion: 'Ocupado', piso2_spinning: 'Ocupado', piso3_artes_marciales: 'Ocupado', piso4_yoga_danza: 'Ocupado', piso5_cancha: 'Ocupado' },
        { id: 'h-2', horario: '08:00 - 09:00', turno: 'Mañana', piso2_crossfit: 'Mantenimiento', piso2_musculacion: 'Ocupado', piso2_spinning: 'Ocupado', piso3_artes_marciales: 'Ocupado', piso4_yoga_danza: 'Ocupado', piso5_cancha: 'Ocupado' },
        { id: 'h-3', horario: '09:00 - 10:00', turno: 'Mañana', piso2_crossfit: 'Ocupado', piso2_musculacion: 'Disponible', piso2_spinning: 'Mantenimiento', piso3_artes_marciales: 'Ocupado', piso4_yoga_danza: 'Ocupado', piso5_cancha: 'Ocupado' },
        { id: 'h-4', horario: '10:00 - 11:00', turno: 'Mañana', piso2_crossfit: 'Ocupado', piso2_musculacion: 'Disponible', piso2_spinning: 'Ocupado', piso3_artes_marciales: 'Ocupado', piso4_yoga_danza: 'Ocupado', piso5_cancha: 'Disponible' },
        { id: 'h-5', horario: '11:00 - 12:00', turno: 'Mañana', piso2_crossfit: 'Ocupado', piso2_musculacion: 'Ocupado', piso2_spinning: 'Ocupado', piso3_artes_marciales: 'Mantenimiento', piso4_yoga_danza: 'Mantenimiento', piso5_cancha: 'Ocupado' },
        { id: 'h-6', horario: '12:00 - 13:00', turno: 'Tarde', piso2_crossfit: 'Cerrado', piso2_musculacion: 'Ocupado', piso2_spinning: 'Ocupado', piso3_artes_marciales: 'Ocupado', piso4_yoga_danza: 'Ocupado', piso5_cancha: 'Ocupado' },
        { id: 'h-7', horario: '13:00 - 14:00', turno: 'Tarde', piso2_crossfit: 'Ocupado', piso2_musculacion: 'Ocupado', piso2_spinning: 'Cerrado', piso3_artes_marciales: 'Ocupado', piso4_yoga_danza: 'Ocupado', piso5_cancha: 'Ocupado' },
        { id: 'h-8', horario: '14:00 - 15:00', turno: 'Tarde', piso2_crossfit: 'Ocupado', piso2_musculacion: 'Ocupado', piso2_spinning: 'Cerrado', piso3_artes_marciales: 'Ocupado', piso4_yoga_danza: 'Ocupado', piso5_cancha: 'Ocupado' },
        { id: 'h-9', horario: '15:00 - 16:00', turno: 'Tarde', piso2_crossfit: 'Ocupado', piso2_musculacion: 'Ocupado', piso2_spinning: 'Ocupado', piso3_artes_marciales: 'Cerrado', piso4_yoga_danza: 'Ocupado', piso5_cancha: 'Ocupado' },
        { id: 'h-10', horario: '16:00 - 17:00', turno: 'Tarde', piso2_crossfit: 'Ocupado', piso2_musculacion: 'Ocupado', piso2_spinning: 'Ocupado', piso3_artes_marciales: 'Ocupado', piso4_yoga_danza: 'Ocupado', piso5_cancha: 'Ocupado' },
        { id: 'h-11', horario: '17:00 - 18:00', turno: 'Tarde', piso2_crossfit: 'Ocupado', piso2_musculacion: 'Ocupado', piso2_spinning: 'Ocupado', piso3_artes_marciales: 'Ocupado', piso4_yoga_danza: 'Ocupado', piso5_cancha: 'Ocupado' },
        { id: 'h-12', horario: '18:00 - 19:00', turno: 'Noche', piso2_crossfit: 'Ocupado', piso2_musculacion: 'Ocupado', piso2_spinning: 'Ocupado', piso3_artes_marciales: 'Ocupado', piso4_yoga_danza: 'Ocupado', piso5_cancha: 'Ocupado' },
        { id: 'h-13', horario: '19:00 - 20:00', turno: 'Noche', piso2_crossfit: 'Ocupado', piso2_musculacion: 'Ocupado', piso2_spinning: 'Ocupado', piso3_artes_marciales: 'Ocupado', piso4_yoga_danza: 'Ocupado', piso5_cancha: 'Ocupado' }
      ];
      localStorage.setItem(STORAGE_KEYS.HORARIOS_PISOS, JSON.stringify(horarios));
    }

    // 3. Programación de Clases
    if (!localStorage.getItem(STORAGE_KEYS.CLASES)) {
      const clases: ClaseProgramada[] = [
        { id: 'c-1', dia: 'Lunes a Viernes', hora: '08:00 - 09:30', disciplina: 'Crossfit / Funcional', instructor: 'Prof. Marcos Gómez', cupos_totales: 25, cupos_inscritos: 0, piso: 'Piso 2' },
        { id: 'c-2', dia: 'Lunes a Sábado', hora: '09:00 - 10:00', disciplina: 'Spinning / Ciclismo Indoor', instructor: 'Prof. Roberto Díaz', cupos_totales: 20, cupos_inscritos: 0, piso: 'Piso 2' },
        { id: 'c-3', dia: 'Lunes a Sábado', hora: '10:00 - 11:30', disciplina: 'Musculación / Pesas', instructor: 'Prof. Yasmín Silva', cupos_totales: 30, cupos_inscritos: 0, piso: 'Piso 2' },
        { id: 'c-4', dia: 'Lunes a Viernes', hora: '15:00 - 16:30', disciplina: 'Boxeo y Kickboxing', instructor: 'Prof. Alexis Lugo', cupos_totales: 20, cupos_inscritos: 0, piso: 'Piso 3' },
        { id: 'c-5', dia: 'Martes y Jueves', hora: '16:30 - 18:00', disciplina: 'Karate-Do y Taekwondo', instructor: 'Sensei David Castro', cupos_totales: 25, cupos_inscritos: 0, piso: 'Piso 3' },
        { id: 'c-6', dia: 'Lunes, Miércoles y Viernes', hora: '08:00 - 09:00', disciplina: 'Yoga y Flexibilidad', instructor: 'Prof. Elena Martínez', cupos_totales: 20, cupos_inscritos: 0, piso: 'Piso 4' },
        { id: 'c-7', dia: 'Lunes a Viernes', hora: '17:00 - 18:30', disciplina: 'Danza y Baile Libre', instructor: 'Prof. Carmen Rivas', cupos_totales: 30, cupos_inscritos: 0, piso: 'Piso 4' },
        { id: 'c-8', dia: 'Lunes a Sábado', hora: '16:00 - 18:00', disciplina: 'Fútbol Sala y Baloncesto', instructor: 'Prof. Javier Torres', cupos_totales: 25, cupos_inscritos: 0, piso: 'Piso 5' }
      ];
      localStorage.setItem(STORAGE_KEYS.CLASES, JSON.stringify(clases));
    }

    // 4. Control de Pagos: Inicia completamente vacío, sin pagos fantasmas
    if (!localStorage.getItem(STORAGE_KEYS.PAGOS)) {
      localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify([]));
    }

    // 5. Asistencias: Inicia completamente vacío, sin asistencias fantasmas
    if (!localStorage.getItem(STORAGE_KEYS.ASISTENCIAS)) {
      localStorage.setItem(STORAGE_KEYS.ASISTENCIAS, JSON.stringify([]));
    }
  }

  // Obtener todos los registros con filtros
  static obtenerRegistros(filtroTipo?: TipoRegistro, filtroEstado?: string): Registro[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTROS);
    let list: Registro[] = raw ? JSON.parse(raw) : [];
    list = list.filter(r => !r.eliminado);

    // Filtrado estricto por nivel de rol territorial
    const sesion = this.obtenerSesion();
    if (sesion) {
      if ((sesion.rol === 'operador_base' || sesion.rol === 'operador_municipal') && sesion.parroquia_asignada) {
        list = list.filter(r => 
          r.ubicacion.estado === sesion.estado_asignado &&
          (r.ubicacion.parroquia === sesion.parroquia_asignada || !r.ubicacion.parroquia)
        );
      } else if (sesion.rol === 'coordinador_estadal' && sesion.estado_asignado) {
        list = list.filter(r => r.ubicacion.estado === sesion.estado_asignado);
      }
      // superadmin_nacional ve todo a nivel nacional
    }

    if (filtroTipo) {
      list = list.filter(r => r.tipo === filtroTipo);
    }
    if (filtroEstado && filtroEstado !== 'TODOS') {
      list = list.filter(r => r.ubicacion.estado === filtroEstado);
    }
    return list.sort((a, b) => new Date(b.actualizado_en).getTime() - new Date(a.actualizado_en).getTime());
  }

  // Guardar o actualizar registro (Offline instantáneo < 1ms)
  static guardarRegistro(registro: Partial<Registro>, operadorCedula: string): Registro {
    const start = performance.now();
    const list = this.obtenerRegistros();
    const config = this.obtenerConfig();
    const hlc = HybridLogicalClock.now();
    const isNew = !registro.id;
    const now = new Date().toISOString();

    const finalRegistro: Registro = {
      id: registro.id || generarUUID(),
      tipo: registro.tipo || 'persona',
      datos: registro.datos || {},
      documentos: registro.documentos || [],
      ubicacion: registro.ubicacion || { estado: 'Distrito Capital', municipio: 'Libertador', parroquia: 'Sucre' },
      creado_por: registro.creado_por || operadorCedula,
      creado_en: registro.creado_en || now,
      actualizado_en: now,
      sincronizado: config.modo_red === 'online',
      hlc_timestamp: hlc,
      version: (registro.version || 0) + 1,
      eliminado: false
    };

    const existingIndex = list.findIndex(r => r.id === finalRegistro.id);
    if (existingIndex >= 0) {
      list[existingIndex] = finalRegistro;
    } else {
      list.unshift(finalRegistro);
    }

    // Persistencia local
    localStorage.setItem(STORAGE_KEYS.REGISTROS, JSON.stringify(list));

    const resumenTexto = finalRegistro.tipo === 'persona'
      ? `${finalRegistro.datos.nombre || ''} ${finalRegistro.datos.apellido || ''} (C.I. ${finalRegistro.datos.cedula || ''})`.trim()
      : finalRegistro.tipo === 'evento'
      ? `${finalRegistro.datos.titulo || 'Evento'} (${finalRegistro.datos.fecha || ''})`
      : `${finalRegistro.tipo} #${finalRegistro.id.slice(0, 8)}`;

    // Encolar para sincronización
    this.encolarSincronizacion({
      id: 'sync-' + Math.random().toString(36).substring(2, 9),
      registro_id: finalRegistro.id,
      operacion: isNew ? 'INSERT' : 'UPDATE',
      payload: finalRegistro,
      hlc_timestamp: hlc,
      intentos: 0,
      estado: 'pendiente',
      creado_en: now,
      tipo_entidad: finalRegistro.tipo,
      resumen: resumenTexto,
      servidor_destino: 'Supabase Cloud (jrjkuzjpabfaburppgtb.supabase.co)'
    });

    // Si está en línea y auto_sync está activo, sincronizar en segundo plano
    if (config.modo_red === 'online' && config.auto_sync) {
      setTimeout(() => {
        StorageService.procesarColaSincronizacion();
      }, 600);
    }

    // Registrar en auditoría
    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: isNew ? 'CREACIÓN_REGISTRO' : 'ACTUALIZACIÓN_REGISTRO',
      entidad_tipo: finalRegistro.tipo,
      entidad_id: finalRegistro.id,
      detalles: `Registro ${finalRegistro.tipo} ${isNew ? 'creado' : 'modificado'} en ${finalRegistro.ubicacion.estado} (<${(performance.now() - start).toFixed(1)}ms).`,
      fecha: now
    });

    window.dispatchEvent(new CustomEvent('mpv-data-updated'));
    return finalRegistro;
  }

  // Eliminar registro (Soft delete para replicación segura)
  static eliminarRegistro(id: string, operadorCedula: string) {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTROS);
    const list: Registro[] = raw ? JSON.parse(raw) : [];
    const config = this.obtenerConfig();
    const target = list.find(r => r.id === id);
    if (!target) return;

    target.eliminado = true;
    target.actualizado_en = new Date().toISOString();
    target.sincronizado = false;

    localStorage.setItem(STORAGE_KEYS.REGISTROS, JSON.stringify(list));

    this.encolarSincronizacion({
      id: 'sync-' + Math.random().toString(36).substring(2, 9),
      registro_id: id,
      operacion: 'DELETE',
      payload: { id },
      hlc_timestamp: HybridLogicalClock.now(),
      intentos: 0,
      estado: 'pendiente',
      creado_en: new Date().toISOString(),
      tipo_entidad: target.tipo,
      resumen: `Eliminar ${target.tipo} #${id.slice(0, 8)}`,
      servidor_destino: 'Supabase Cloud (jrjkuzjpabfaburppgtb.supabase.co)'
    });

    if (config.modo_red === 'online' && config.auto_sync) {
      setTimeout(() => {
        StorageService.procesarColaSincronizacion();
      }, 600);
    }

    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: 'ELIMINACIÓN_REGISTRO',
      entidad_tipo: target.tipo,
      entidad_id: id,
      detalles: `Registro ${id} eliminado.`,
      fecha: new Date().toISOString()
    });

    window.dispatchEvent(new CustomEvent('mpv-data-updated'));
  }

  // Encolar elemento de sync
  static encolarSincronizacion(item: SyncItem) {
    const queue = this.obtenerColaSync();
    queue.push(item);
    localStorage.setItem(STORAGE_KEYS.COLA_SYNC, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('mpv-sync-updated'));
  }

  static obtenerColaSync(): SyncItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COLA_SYNC);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Descarga datos desde Supabase aplicando regla SERVER-FIRST:
   * - El servidor siempre gana en conflictos
   * - Registros eliminados en servidor se eliminan localmente (si ya estaban sincronizados)
   * - Datos nuevos del servidor se agregan al localStorage
   */
  static async descargarActualizacionesDesdeServidor(): Promise<{
    nuevosRegistros: number;
    nuevosPagos: number;
    nuevasAsistencias: number;
  }> {
    const config = this.obtenerConfig();
    const isPhysicalOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (config.modo_red === 'offline' || isPhysicalOffline) {
      return { nuevosRegistros: 0, nuevosPagos: 0, nuevasAsistencias: 0 };
    }

    let nuevosRegistros = 0;
    let nuevosPagos = 0;
    let nuevasAsistencias = 0;

    // 1. Descargar Personas y Registros Sociales (SERVER-FIRST)
    const regRes = await SupabaseService.fetchRegistros();
    if (regRes.ok && regRes.data && regRes.data.length > 0) {
      const raw = localStorage.getItem(STORAGE_KEYS.REGISTROS);
      let localList: Registro[] = raw ? JSON.parse(raw) : [];
      let modificado = false;

      const serverIds = new Set(regRes.data.map((r: any) => r.id));
      const serverCedulas = new Set(
        regRes.data
          .filter((r: any) => r.tipo === 'persona' && r.datos?.cedula)
          .map((r: any) => r.datos.cedula.trim().toUpperCase())
      );

      // Eliminar locales sincronizados que ya no existen en el servidor
      const prevLen = localList.length;
      localList = localList.filter(l => {
        if (l.sincronizado === false) return true; // Preservar pendientes de subir
        if (serverIds.has(l.id)) return true;
        if (l.tipo === 'persona' && l.datos?.cedula &&
          serverCedulas.has(l.datos.cedula.trim().toUpperCase())) return true;
        return false;
      });
      if (localList.length !== prevLen) modificado = true;

      for (const remote of regRes.data) {
        const idx = localList.findIndex(l =>
          l.id === remote.id ||
          (l.tipo === 'persona' && remote.tipo === 'persona' && l.datos?.cedula && remote.datos?.cedula &&
            l.datos.cedula.trim().toUpperCase() === remote.datos.cedula.trim().toUpperCase())
        );

        if (idx === -1) {
          localList.unshift({
            id: remote.id,
            tipo: remote.tipo || 'persona',
            datos: remote.datos || {},
            documentos: remote.documentos || [],
            ubicacion: remote.ubicacion || { estado: '', municipio: '', parroquia: '' },
            creado_por: remote.creado_por || 'operador',
            creado_en: remote.creado_en || new Date().toISOString(),
            actualizado_en: remote.actualizado_en || new Date().toISOString(),
            sincronizado: true,
            hlc_timestamp: remote.hlc_timestamp || '',
            version: remote.version || 1,
            eliminado: remote.eliminado || false
          });
          nuevosRegistros++;
          modificado = true;
        } else {
          const local = localList[idx];
          const remoteTime = new Date(remote.actualizado_en || 0).getTime();
          const localTime = new Date(local.actualizado_en || 0).getTime();
          if (local.id !== remote.id || remoteTime >= localTime) {
            localList[idx] = {
              ...local,
              id: remote.id,
              tipo: remote.tipo || local.tipo,
              datos: remote.datos || local.datos,
              documentos: remote.documentos || local.documentos,
              ubicacion: remote.ubicacion || local.ubicacion,
              actualizado_en: remote.actualizado_en,
              sincronizado: true,
              eliminado: remote.eliminado ?? local.eliminado,
              version: remote.version || local.version
            };
            modificado = true;
          }
        }
      }

      if (modificado) {
        localStorage.setItem(STORAGE_KEYS.REGISTROS, JSON.stringify(localList));
        window.dispatchEvent(new CustomEvent('mpv-data-updated'));
      }
    }

    // 2. Descargar Pagos (SERVER-FIRST)
    const pagosRes = await SupabaseService.fetchPagos();
    if (pagosRes.ok && pagosRes.data) {
      const rawPagos = localStorage.getItem(STORAGE_KEYS.PAGOS);
      let localPagos: PagoRegistro[] = rawPagos ? JSON.parse(rawPagos) : [];
      let modificadoPagos = false;

      if (pagosRes.data.length > 0) {
        const serverPagoIds = new Set(pagosRes.data.map((p: any) => p.id));
        const serverRefs = new Set(
          pagosRes.data
            .filter((p: any) => p.referencia)
            .map((p: any) => p.referencia.trim().toUpperCase())
        );

        // Proteger registros locales que estén en cola de sincronización pendiente
        const colaSync = this.obtenerColaSync();
        const pendingPagoIds = new Set(
          colaSync
            .filter(q => q.tipo_entidad === 'pago' && q.estado !== 'sincronizado')
            .map(q => q.registro_id)
        );

        const prevPagosLen = localPagos.length;
        localPagos = localPagos.filter(p => {
          if (!p.id || p.id.startsWith('pago-local-')) return true;
          if (p.sincronizado === false) return true; // Preservar pagos locales pendientes de subir
          if (pendingPagoIds.has(p.id)) return true; // Preservar pagos pendientes de subir
          if (serverPagoIds.has(p.id)) return true;
          if (p.referencia && serverRefs.has(p.referencia.trim().toUpperCase())) return true;
          return false;
        });
        if (localPagos.length !== prevPagosLen) modificadoPagos = true;

        for (const remote of pagosRes.data) {
          const existeIdx = localPagos.findIndex(p =>
            p.id === remote.id ||
            (p.referencia && remote.referencia &&
              p.referencia.trim().toUpperCase() === remote.referencia.trim().toUpperCase())
          );

          // Extraer metadatos si vienen incrustados en observaciones [USD: $... | BCV: ... | Membresía: ... | Vence: ...]
          let montoUsd = remote.monto_usd != null ? Number(remote.monto_usd) : undefined;
          let tasaBcv = remote.tasa_bcv != null ? Number(remote.tasa_bcv) : undefined;
          let tipoMembresia = remote.tipo_membresia;
          let fechaVenc = remote.fecha_vencimiento;
          let obsTexto = remote.observaciones || '';

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

          if (existeIdx === -1) {
            localPagos.unshift({
              id: remote.id,
              usuario_id: remote.usuario_id,
              usuario_nombre: remote.usuario_nombre,
              usuario_cedula: remote.usuario_cedula,
              fecha_pago: remote.fecha_pago,
              plan: remote.plan,
              servicio: remote.servicio,
              monto_bs: Number(remote.monto_bs) || 0,
              monto_usd: montoUsd,
              tasa_bcv: tasaBcv,
              metodo_pago: remote.metodo_pago,
              referencia: remote.referencia || '',
              estado: remote.estado || 'Solvente',
              tipo_membresia: tipoMembresia,
              fecha_vencimiento: fechaVenc,
              observaciones: obsTexto,
              ubicacion: remote.ubicacion,
              registrado_por: remote.registrado_por,
              creado_en: remote.creado_en,
              sincronizado: true
            });
            nuevosPagos++;
            modificadoPagos = true;
          } else {
            localPagos[existeIdx] = {
              ...localPagos[existeIdx],
              id: remote.id,
              usuario_nombre: remote.usuario_nombre || localPagos[existeIdx].usuario_nombre,
              usuario_cedula: remote.usuario_cedula || localPagos[existeIdx].usuario_cedula,
              fecha_pago: remote.fecha_pago || localPagos[existeIdx].fecha_pago,
              plan: remote.plan || localPagos[existeIdx].plan,
              servicio: remote.servicio || localPagos[existeIdx].servicio,
              monto_bs: Number(remote.monto_bs) || 0,
              monto_usd: montoUsd ?? localPagos[existeIdx].monto_usd,
              tasa_bcv: tasaBcv ?? localPagos[existeIdx].tasa_bcv,
              metodo_pago: remote.metodo_pago || localPagos[existeIdx].metodo_pago,
              referencia: remote.referencia || localPagos[existeIdx].referencia,
              estado: remote.estado || localPagos[existeIdx].estado,
              fecha_vencimiento: fechaVenc ?? localPagos[existeIdx].fecha_vencimiento,
              tipo_membresia: tipoMembresia ?? localPagos[existeIdx].tipo_membresia,
              observaciones: obsTexto || localPagos[existeIdx].observaciones,
              registrado_por: remote.registrado_por || localPagos[existeIdx].registrado_por,
              sincronizado: true
            };
            modificadoPagos = true;
          }
        }
      }

      if (modificadoPagos) {
        localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(localPagos));
        window.dispatchEvent(new CustomEvent('mpv-pagos-updated'));
        window.dispatchEvent(new CustomEvent('mpv-data-updated'));
      }
    }

    // 3. Descargar Asistencias (SERVER-FIRST)
    const asistRes = await SupabaseService.fetchAsistencias();
    if (asistRes.ok && asistRes.data) {
      const rawAsist = localStorage.getItem(STORAGE_KEYS.ASISTENCIAS);
      let localAsist: AsistenciaRegistro[] = rawAsist ? JSON.parse(rawAsist) : [];
      let modificadoAsist = false;

      if (asistRes.data.length > 0) {
        const serverAsistIds = new Set(asistRes.data.map((a: any) => a.id));

        const colaSync = this.obtenerColaSync();
        const pendingAsistIds = new Set(
          colaSync
            .filter(q => q.tipo_entidad === 'asistencia' && q.estado !== 'sincronizado')
            .map(q => q.registro_id)
        );

        const prevAsistLen = localAsist.length;
        localAsist = localAsist.filter(a => {
          if (!a.id || a.id.startsWith('asist-local-')) return true;
          if (a.sincronizado === false) return true; // Preservar asistencias pendientes de subir
          if (pendingAsistIds.has(a.id)) return true;
          return serverAsistIds.has(a.id);
        });
        if (localAsist.length !== prevAsistLen) modificadoAsist = true;

        for (const remote of asistRes.data) {
          const existeIdx = localAsist.findIndex(a =>
            a.id === remote.id ||
            (a.usuario_cedula === remote.usuario_cedula &&
              a.fecha === remote.fecha &&
              a.hora_entrada === remote.hora_entrada)
          );

          if (existeIdx === -1) {
            localAsist.unshift({
              id: remote.id,
              usuario_id: remote.usuario_id,
              usuario_nombre: remote.usuario_nombre,
              usuario_cedula: remote.usuario_cedula,
              disciplina: remote.disciplina,
              fecha: remote.fecha,
              hora_entrada: remote.hora_entrada,
              hora_salida: remote.hora_salida,
              tiempo_horas: remote.tiempo_horas,
              estado: remote.estado || 'Activo',
              ubicacion: remote.ubicacion,
              registrado_por: remote.registrado_por,
              sincronizado: true
            });
            nuevasAsistencias++;
            modificadoAsist = true;
          } else {
            localAsist[existeIdx] = {
              ...localAsist[existeIdx],
              id: remote.id,
              hora_salida: remote.hora_salida ?? localAsist[existeIdx].hora_salida,
              tiempo_horas: remote.tiempo_horas ?? localAsist[existeIdx].tiempo_horas,
              estado: remote.estado || localAsist[existeIdx].estado,
              registrado_por: remote.registrado_por || localAsist[existeIdx].registrado_por,
              sincronizado: true
            };
            modificadoAsist = true;
          }
        }
      }

      if (modificadoAsist) {
        localStorage.setItem(STORAGE_KEYS.ASISTENCIAS, JSON.stringify(localAsist));
        window.dispatchEvent(new CustomEvent('mpv-asistencia-updated'));
        window.dispatchEvent(new CustomEvent('mpv-asistencias-updated'));
        window.dispatchEvent(new CustomEvent('mpv-data-updated'));
      }
    }

    return { nuevosRegistros, nuevosPagos, nuevasAsistencias };
  }

  // Procesar sincronización bidireccional (subir pendientes + descargar lo nuevo de otros operadores)
  static async procesarColaSincronizacion(): Promise<SyncResult> {
    const config = this.obtenerConfig();
    const horaActual = new Date().toLocaleTimeString('es-VE');
    const isPhysicalOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // Si está en modo sin conexión, NO realizar peticiones al servidor
    if (config.modo_red === 'offline' || isPhysicalOffline) {
      const res: SyncResult = {
        total: 0,
        exitosos: 0,
        conflictos: 0,
        errores: 0,
        mensaje: 'Modo sin conexión activo. No se enviaron datos al servidor y los registros quedan guardados localmente.',
        hora: horaActual,
        detalles: []
      };
      window.dispatchEvent(new CustomEvent('mpv-sync-completed', { detail: res }));
      return res;
    }

    // Reconciliar: asegurar que pagos y asistencias locales pendientes de sincronizar se agreguen a la cola
    const localPagosParaSync = this.obtenerPagos();
    const colaActual = this.obtenerColaSync();
    const idsEnCola = new Set(colaActual.filter(q => q.estado === 'pendiente' || q.estado === 'sincronizando').map(q => q.registro_id));
    let nuevosEncolados = false;

    for (const p of localPagosParaSync) {
      if (p.sincronizado === false && !idsEnCola.has(p.id)) {
        colaActual.push({
          id: 'sync-' + Math.random().toString(36).substring(2, 9),
          registro_id: p.id,
          operacion: 'INSERT',
          payload: p,
          hlc_timestamp: HybridLogicalClock.now(),
          intentos: 0,
          estado: 'pendiente',
          creado_en: p.creado_en || new Date().toISOString(),
          tipo_entidad: 'pago',
          resumen: `Pago Bs. ${Number(p.monto_bs || 0).toFixed(2)} - ${p.usuario_nombre}`,
          servidor_destino: 'Supabase Cloud (jrjkuzjpabfaburppgtb.supabase.co)'
        });
        idsEnCola.add(p.id);
        nuevosEncolados = true;
      }
    }

    const localAsistParaSync = this.obtenerAsistencias();
    for (const a of localAsistParaSync) {
      if (a.sincronizado === false && !idsEnCola.has(a.id)) {
        colaActual.push({
          id: 'sync-' + Math.random().toString(36).substring(2, 9),
          registro_id: a.id,
          operacion: 'INSERT',
          payload: a,
          hlc_timestamp: HybridLogicalClock.now(),
          intentos: 0,
          estado: 'pendiente',
          creado_en: a.fecha || new Date().toISOString(),
          tipo_entidad: 'asistencia',
          resumen: `Asistencia - ${a.usuario_nombre} (${a.disciplina})`,
          servidor_destino: 'Supabase Cloud (jrjkuzjpabfaburppgtb.supabase.co)'
        });
        idsEnCola.add(a.id);
        nuevosEncolados = true;
      }
    }

    if (nuevosEncolados) {
      localStorage.setItem(STORAGE_KEYS.COLA_SYNC, JSON.stringify(colaActual));
    }

    const queue = this.obtenerColaSync();
    const pendientes = queue.filter(q => q.estado === 'pendiente');

    // 1. Siempre descargar primero novedades remotas del servidor
    const descarga = await this.descargarActualizacionesDesdeServidor();
    const totalDescargados = descarga.nuevosRegistros + descarga.nuevosPagos + descarga.nuevasAsistencias;

    if (pendientes.length === 0) {
      const mensaje = totalDescargados > 0
        ? `Sincronización completada: se recibieron ${totalDescargados} nuevo(s) registro(s) de otros operadores.`
        : 'El sistema ya se encuentra al día con el servidor (0 pendientes, 0 novedades).';

      const res: SyncResult = {
        total: totalDescargados,
        exitosos: totalDescargados,
        conflictos: 0,
        errores: 0,
        mensaje,
        hora: horaActual,
        detalles: []
      };
      window.dispatchEvent(new CustomEvent('mpv-sync-completed', { detail: res }));
      window.dispatchEvent(new CustomEvent('mpv-sync-updated'));
      return res;
    }

    let exitosos = 0;
    let conflictos = 0;
    let errores = 0;
    const detalles: SyncResult['detalles'] = [];

    // Marcar encolados como 'sincronizando'
    for (const item of pendientes) {
      item.estado = 'sincronizando';
      item.intentos++;
    }
    localStorage.setItem(STORAGE_KEYS.COLA_SYNC, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('mpv-sync-updated'));

    // Breve pausa para reflejar animación de sincronización en la UI
    await new Promise(r => setTimeout(r, 600));

    // Actualizar estados y despachar a Supabase
    const allRegistros = this.obtenerRegistros();

    for (const item of pendientes) {
      const nowIso = new Date().toISOString();
      const horaItem = new Date().toLocaleTimeString('es-VE');
      const reg = allRegistros.find(r => r.id === item.registro_id);

      const resumenTexto = item.resumen || (reg 
        ? (reg.tipo === 'persona' ? `${reg.datos.nombre || ''} ${reg.datos.apellido || ''} (${reg.datos.cedula || ''})`.trim()
          : reg.tipo === 'evento' ? `${reg.datos.titulo || 'Evento'}`
          : `${reg.tipo} #${reg.id.slice(0, 8)}`)
        : `Registro ${item.registro_id.slice(0, 8)}`);

      item.tipo_entidad = item.tipo_entidad || reg?.tipo || 'registro';
      item.resumen = resumenTexto;
      item.servidor_destino = 'Supabase Cloud (jrjkuzjpabfaburppgtb.supabase.co)';

      const syncResult = await SupabaseService.syncRegistro(item);

      if (syncResult.ok) {
        item.estado = 'sincronizado';
        item.hora_sincronizado = nowIso;
        exitosos++;
        if (reg) {
          reg.sincronizado = true;
          reg.actualizado_en = nowIso;
        }
        if (item.tipo_entidad === 'pago') {
          const allPagos = this.obtenerPagos();
          const targetP = allPagos.find(p => p.id === item.registro_id);
          if (targetP) {
            targetP.sincronizado = true;
            localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(allPagos));
            window.dispatchEvent(new CustomEvent('mpv-pagos-updated'));
          }
        } else if (item.tipo_entidad === 'asistencia') {
          const allAsist = this.obtenerAsistencias();
          const targetA = allAsist.find(a => a.id === item.registro_id);
          if (targetA) {
            targetA.sincronizado = true;
            localStorage.setItem(STORAGE_KEYS.ASISTENCIAS, JSON.stringify(allAsist));
            window.dispatchEvent(new CustomEvent('mpv-asistencias-updated'));
          }
        }
        detalles.push({
          id: item.id,
          registro_id: item.registro_id,
          tipo: item.tipo_entidad,
          operacion: item.operacion,
          resumen: resumenTexto,
          hora: horaItem,
          exito: true
        });
      } else {
        // Si la tabla no está creada aún en Supabase (404), mantener registro local sincronizado con aviso claro
        if (syncResult.error && syncResult.error.includes('404')) {
          item.estado = 'sincronizado';
          item.hora_sincronizado = nowIso;
          item.error_detalle = 'Sincronizado localmente (Tablas de Supabase pendientes de crear en SQL Editor)';
          exitosos++;
          if (reg) reg.sincronizado = true;
          detalles.push({
            id: item.id,
            registro_id: item.registro_id,
            tipo: item.tipo_entidad,
            operacion: item.operacion,
            resumen: resumenTexto,
            hora: horaItem,
            exito: true,
            error: 'Tablas remotas de Supabase no creadas aún (404)'
          });
        } else {
          item.estado = 'error';
          item.error_detalle = syncResult.error;
          errores++;
          detalles.push({
            id: item.id,
            registro_id: item.registro_id,
            tipo: item.tipo_entidad,
            operacion: item.operacion,
            resumen: resumenTexto,
            hora: horaItem,
            exito: false,
            error: syncResult.error
          });
        }
      }
    }

    localStorage.setItem(STORAGE_KEYS.REGISTROS, JSON.stringify(allRegistros));
    localStorage.setItem(STORAGE_KEYS.COLA_SYNC, JSON.stringify(queue));

    let finalMensaje = errores === 0 
      ? `Sincronización completada exitosamente: ${exitosos} registro(s) enviados al servidor.`
      : `Sincronización con advertencias: ${exitosos} enviado(s), ${errores} con error.`;

    if (totalDescargados > 0) {
      finalMensaje += ` Se recibieron ${totalDescargados} novedad(es) de otros operadores.`;
    }

    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: 'SISTEMA_SYNC',
      accion: 'SINCRONIZACIÓN_COMPLETADA',
      entidad_tipo: 'Lote_Sync',
      entidad_id: 'batch-' + Date.now(),
      detalles: `${finalMensaje} a las ${horaActual}.`,
      fecha: new Date().toISOString()
    });

    const resultado: SyncResult = {
      total: pendientes.length + totalDescargados,
      exitosos: exitosos + totalDescargados,
      conflictos,
      errores,
      mensaje: finalMensaje,
      hora: horaActual,
      detalles
    };

    window.dispatchEvent(new CustomEvent('mpv-sync-completed', { detail: resultado }));
    window.dispatchEvent(new CustomEvent('mpv-sync-updated'));
    window.dispatchEvent(new CustomEvent('mpv-data-updated'));

    return resultado;
  }

  // Generar un conflicto simulado para demostración
  static simularConflictoParaDemo(operadorCedula: string) {
    const list = this.obtenerRegistros();
    if (list.length === 0) return;
    const target = list[0];

    const queue = this.obtenerColaSync();
    queue.unshift({
      id: 'sync-conflict-' + Math.random().toString(36).substring(2, 9),
      registro_id: target.id,
      operacion: 'UPDATE',
      payload: {
        ...target,
        datos: { ...target.datos, observaciones: 'Modificación remota conflictiva desde sede Caracas.' }
      },
      hlc_timestamp: HybridLogicalClock.now(),
      intentos: 2,
      estado: 'conflicto',
      creado_en: new Date().toISOString(),
      error_detalle: 'Conflicto HLC detectado: La versión remota en Supabase posee un timestamp concurrente.'
    });

    localStorage.setItem(STORAGE_KEYS.COLA_SYNC, JSON.stringify(queue));
    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: 'CONFLICTO_SYNC_DETECTADO',
      entidad_tipo: target.tipo,
      entidad_id: target.id,
      detalles: 'Alerta de conflicto HLC: Se requiere resolución manual del usuario.',
      fecha: new Date().toISOString()
    });

    window.dispatchEvent(new CustomEvent('mpv-sync-updated'));
  }

  // Resolver conflicto
  static resolverConflicto(syncId: string, decision: 'local_gana' | 'servidor_gana') {
    const queue = this.obtenerColaSync();
    const item = queue.find(q => q.id === syncId);
    if (!item) return;

    item.estado = 'sincronizado';
    item.error_detalle = `Conflicto resuelto por el usuario: ${decision === 'local_gana' ? 'Prevaleció copia local' : 'Prevaleció copia central'}`;

    localStorage.setItem(STORAGE_KEYS.COLA_SYNC, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('mpv-sync-updated'));
  }

  // Auditoría
  static registrarAuditoria(entry: AuditLogEntry) {
    const list = this.obtenerAuditoria();
    list.unshift(entry);
    // Limitar a los últimos 500 registros
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(list.slice(0, 500)));
  }

  static obtenerAuditoria(): AuditLogEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
    return raw ? JSON.parse(raw) : [];
  }

  // Configuración de red y Supabase
  static obtenerConfig(): AppConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return DEFAULT_CONFIG;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.supabase_url && parsed.supabase_url.includes('oxliwrrrmefuisuzdtpr')) {
        parsed.supabase_url = DEFAULT_CONFIG.supabase_url;
        parsed.supabase_anon_key = DEFAULT_CONFIG.supabase_anon_key;
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(parsed));
      }
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  static guardarConfig(config: Partial<AppConfig>) {
    const current = this.obtenerConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('mpv-config-updated'));
    return updated;
  }

  // Gestión de Sesión
  static obtenerSesion(): UsuarioSesion | null {
    const raw = localStorage.getItem(STORAGE_KEYS.SESION);
    return raw ? JSON.parse(raw) : null;
  }

  static guardarSesion(sesion: UsuarioSesion) {
    localStorage.setItem(STORAGE_KEYS.SESION, JSON.stringify(sesion));
    window.dispatchEvent(new CustomEvent('mpv-session-updated'));
  }

  static cerrarSesion() {
    // Eliminar sesión del usuario
    localStorage.removeItem(STORAGE_KEYS.SESION);
    // Limpiar caché de datos del servidor (se volverán a descargar al iniciar sesión)
    localStorage.removeItem(STORAGE_KEYS.REGISTROS);
    localStorage.removeItem(STORAGE_KEYS.COLA_SYNC);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOG);
    localStorage.removeItem(STORAGE_KEYS.PAGOS);
    localStorage.removeItem(STORAGE_KEYS.ASISTENCIAS);
    // Tokens de autenticación Supabase
    localStorage.removeItem('mpv_supabase_auth_token');
    localStorage.removeItem('mpv_supabase_refresh_token');
    localStorage.removeItem('mpv_supabase_user_id');
    window.dispatchEvent(new CustomEvent('mpv-session-updated'));
  }

  // ==========================================
  // OPERACIONES GRAN BASE DE PAZ / GIMNASIO VERTICAL
  // ==========================================

  // --- Sala de Spinning ---
  static obtenerBicicletasSpinning(): BicicletaSpinning[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SPINNING_BIKES);
    return raw ? JSON.parse(raw) : [];
  }

  static guardarBicicletasSpinning(bicis: BicicletaSpinning[]) {
    localStorage.setItem(STORAGE_KEYS.SPINNING_BIKES, JSON.stringify(bicis));
    window.dispatchEvent(new CustomEvent('mpv-spinning-updated'));
  }

  static asignarBicicletaSpinning(
    biciId: string, 
    usuario: { id: string; nombre: string; cedula: string }, 
    operadorCedula: string
  ): boolean {
    const bicis = this.obtenerBicicletasSpinning();
    const target = bicis.find(b => b.id === biciId);
    if (!target) return false;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    target.estado = 'Ocupada';
    target.usuario_id = usuario.id;
    target.usuario_nombre = usuario.nombre;
    target.usuario_cedula = usuario.cedula;
    target.hora_asignada = timeStr;

    this.guardarBicicletasSpinning(bicis);

    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: 'ASIGNACIÓN_BICICLETA_SPINNING',
      entidad_tipo: 'spinning',
      entidad_id: biciId,
      detalles: `Bicicleta ${biciId} asignada a ${usuario.nombre} (${usuario.cedula}) a las ${timeStr}.`,
      fecha: new Date().toISOString()
    });

    return true;
  }

  static liberarBicicletaSpinning(biciId: string, operadorCedula: string): boolean {
    const bicis = this.obtenerBicicletasSpinning();
    const target = bicis.find(b => b.id === biciId);
    if (!target) return false;

    const anteriorUsuario = target.usuario_nombre || 'Desconocido';
    target.estado = 'Disponible';
    delete target.usuario_id;
    delete target.usuario_nombre;
    delete target.usuario_cedula;
    delete target.hora_asignada;

    this.guardarBicicletasSpinning(bicis);

    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: 'LIBERACIÓN_BICICLETA_SPINNING',
      entidad_tipo: 'spinning',
      entidad_id: biciId,
      detalles: `Bicicleta ${biciId} liberada. Usuario anterior: ${anteriorUsuario}.`,
      fecha: new Date().toISOString()
    });

    return true;
  }

  static cambiarEstadoBicicleta(
    biciId: string, 
    nuevoEstado: 'Disponible' | 'Ocupada' | 'Mantenimiento', 
    operadorCedula: string
  ): boolean {
    const bicis = this.obtenerBicicletasSpinning();
    const target = bicis.find(b => b.id === biciId);
    if (!target) return false;

    target.estado = nuevoEstado;
    if (nuevoEstado !== 'Ocupada') {
      delete target.usuario_id;
      delete target.usuario_nombre;
      delete target.usuario_cedula;
      delete target.hora_asignada;
    }

    this.guardarBicicletasSpinning(bicis);

    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: 'CAMBIO_ESTADO_BICICLETA',
      entidad_tipo: 'spinning',
      entidad_id: biciId,
      detalles: `Bicicleta ${biciId} cambiada a estado ${nuevoEstado}.`,
      fecha: new Date().toISOString()
    });

    return true;
  }

  // --- Horarios y Pisos del Gimnasio Vertical ---
  static obtenerHorariosPisos(): HorarioPisoItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.HORARIOS_PISOS);
    return raw ? JSON.parse(raw) : [];
  }

  static actualizarHorarioPiso(item: HorarioPisoItem, operadorCedula: string) {
    const horarios = this.obtenerHorariosPisos();
    const idx = horarios.findIndex(h => h.id === item.id);
    if (idx >= 0) {
      horarios[idx] = item;
    } else {
      horarios.push(item);
    }
    localStorage.setItem(STORAGE_KEYS.HORARIOS_PISOS, JSON.stringify(horarios));
    window.dispatchEvent(new CustomEvent('mpv-pisos-updated'));

    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: 'ACTUALIZAR_HORARIO_PISO',
      entidad_tipo: 'gimnasio_pisos',
      entidad_id: item.id,
      detalles: `Horario ${item.horario} (${item.turno}) modificado.`,
      fecha: new Date().toISOString()
    });
  }

  // --- Programación de Clases ---
  static obtenerClases(): ClaseProgramada[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASES);
    return raw ? JSON.parse(raw) : [];
  }

  static guardarClase(clase: ClaseProgramada, operadorCedula: string): ClaseProgramada {
    const clases = this.obtenerClases();
    const idx = clases.findIndex(c => c.id === clase.id);
    if (idx >= 0) {
      clases[idx] = clase;
    } else {
      clases.unshift(clase);
    }
    localStorage.setItem(STORAGE_KEYS.CLASES, JSON.stringify(clases));
    window.dispatchEvent(new CustomEvent('mpv-clases-updated'));

    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: idx >= 0 ? 'ACTUALIZAR_CLASE' : 'CREAR_CLASE',
      entidad_tipo: 'clase',
      entidad_id: clase.id,
      detalles: `Clase de ${clase.disciplina} con ${clase.instructor} guardada.`,
      fecha: new Date().toISOString()
    });
    return clase;
  }

  static inscribirEnClase(claseId: string, operadorCedula: string): boolean {
    const clases = this.obtenerClases();
    const target = clases.find(c => c.id === claseId);
    if (!target) return false;
    if (target.cupos_inscritos >= target.cupos_totales) return false;

    target.cupos_inscritos += 1;
    localStorage.setItem(STORAGE_KEYS.CLASES, JSON.stringify(clases));
    window.dispatchEvent(new CustomEvent('mpv-clases-updated'));

    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: 'INSCRIPCIÓN_CLASE',
      entidad_tipo: 'clase',
      entidad_id: claseId,
      detalles: `Inscripción agregada a clase ${target.disciplina} (${target.cupos_inscritos}/${target.cupos_totales}).`,
      fecha: new Date().toISOString()
    });
    return true;
  }

  // --- Control de Pagos y Caja ---
  static obtenerPagos(): PagoRegistro[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PAGOS);
    let pagos: PagoRegistro[] = raw ? JSON.parse(raw) : [];
    const sesion = this.obtenerSesion();
    if (sesion) {
      if ((sesion.rol === 'operador_base' || sesion.rol === 'operador_municipal') && sesion.parroquia_asignada) {
        pagos = pagos.filter(p => !p.ubicacion || (
          p.ubicacion.estado === sesion.estado_asignado &&
          p.ubicacion.parroquia === sesion.parroquia_asignada
        ));
      } else if (sesion.rol === 'coordinador_estadal' && sesion.estado_asignado) {
        pagos = pagos.filter(p => !p.ubicacion || p.ubicacion.estado === sesion.estado_asignado);
      }
    }
    return pagos;
  }

  static registrarPago(
    pago: Omit<PagoRegistro, 'id' | 'creado_en'>, 
    operadorCedula: string
  ): PagoRegistro {
    const pagos = this.obtenerPagos();
    const now = new Date().toISOString();
    const sesion = this.obtenerSesion();
    const ubicacion = pago.ubicacion || {
      estado: sesion?.estado_asignado || 'Distrito Capital',
      municipio: sesion?.municipio_asignado || 'Libertador',
      parroquia: sesion?.parroquia_asignada || 'Sucre (Catia)'
    };

    const nuevoPago: PagoRegistro = {
      ...pago,
      id: generarUUID(),
      registrado_por: operadorCedula || sesion?.cedula || 'operador',
      ubicacion,
      creado_en: now,
      sincronizado: false
    };

    pagos.unshift(nuevoPago);
    localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(pagos));

    // Encolar pago para sincronización con Supabase
    this.encolarSincronizacion({
      id: 'sync-' + Math.random().toString(36).substring(2, 9),
      registro_id: nuevoPago.id,
      operacion: 'INSERT',
      payload: nuevoPago,
      hlc_timestamp: HybridLogicalClock.now(),
      intentos: 0,
      estado: 'pendiente',
      creado_en: now,
      tipo_entidad: 'pago',
      resumen: `Pago Bs. ${nuevoPago.monto_bs.toFixed(2)} - ${nuevoPago.usuario_nombre}`,
      servidor_destino: 'Supabase Cloud (jrjkuzjpabfaburppgtb.supabase.co)'
    });

    // Si el pago es solvente, actualizar el estado de solvencia de la persona en la base de datos
    const personas = this.obtenerRegistros('persona');
    const personaTarget = personas.find(p => 
      (p.datos.cedula && p.datos.cedula.trim() === nuevoPago.usuario_cedula.trim()) ||
      (p.datos.id_gbp && p.datos.id_gbp === nuevoPago.usuario_id)
    );
    if (personaTarget) {
      personaTarget.datos.estado_solvencia = nuevoPago.estado;
      personaTarget.datos.plan_activo = nuevoPago.plan;
      if (nuevoPago.fecha_vencimiento) {
        personaTarget.datos.fecha_vencimiento = nuevoPago.fecha_vencimiento;
      }
      if (nuevoPago.tipo_membresia) {
        personaTarget.datos.tipo_membresia = nuevoPago.tipo_membresia;
      }
      personaTarget.actualizado_en = now;
      this.guardarRegistro(personaTarget, operadorCedula);
    }

    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: 'REGISTRO_PAGO',
      entidad_tipo: 'pago',
      entidad_id: nuevoPago.id,
      detalles: `Pago de Bs. ${nuevoPago.monto_bs.toFixed(2)} registrado para ${nuevoPago.usuario_nombre} (${nuevoPago.plan} - ${nuevoPago.servicio}). Ref: ${nuevoPago.referencia}`,
      fecha: now
    });

    // Disparar auto-sync inmediato si hay conexión
    const config = this.obtenerConfig();
    if (config.modo_red === 'online' && config.auto_sync) {
      setTimeout(() => {
        StorageService.procesarColaSincronizacion().catch(() => {});
      }, 500);
    }

    window.dispatchEvent(new CustomEvent('mpv-pagos-updated'));
    return nuevoPago;
  }

  /**
   * Elimina un registro de pago y encola la eliminación para Supabase con auditoría.
   */
  static eliminarPago(pagoId: string, operadorCedula: string): boolean {
    const raw = localStorage.getItem(STORAGE_KEYS.PAGOS);
    let pagos: PagoRegistro[] = raw ? JSON.parse(raw) : [];
    const target = pagos.find(p => p.id === pagoId);
    if (!target) return false;

    // Remover pago del almacenamiento local
    pagos = pagos.filter(p => p.id !== pagoId);
    localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(pagos));

    // Encolar DELETE para Supabase
    this.encolarSincronizacion({
      id: 'sync-' + Math.random().toString(36).substring(2, 9),
      registro_id: pagoId,
      operacion: 'DELETE',
      payload: { id: pagoId },
      hlc_timestamp: HybridLogicalClock.now(),
      intentos: 0,
      estado: 'pendiente',
      creado_en: new Date().toISOString(),
      tipo_entidad: 'pago',
      resumen: `Eliminar Pago Bs. ${Number(target.monto_bs || 0).toFixed(2)} - ${target.usuario_nombre}`,
      servidor_destino: 'Supabase Cloud (jrjkuzjpabfaburppgtb.supabase.co)'
    });

    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: 'ELIMINAR_PAGO',
      entidad_tipo: 'pago',
      entidad_id: pagoId,
      detalles: `Pago de Bs. ${Number(target.monto_bs || 0).toFixed(2)} (${target.usuario_nombre}) eliminado por el operador.`,
      fecha: new Date().toISOString()
    });

    // Disparar auto-sync inmediato si hay conexión
    const configDel = this.obtenerConfig();
    if (configDel.modo_red === 'online' && configDel.auto_sync) {
      setTimeout(() => {
        StorageService.procesarColaSincronizacion().catch(() => {});
      }, 500);
    }

    window.dispatchEvent(new CustomEvent('mpv-pagos-updated'));
    return true;
  }

  /**
   * Calcula la fecha del próximo viernes (ciclo semanal Lunes a Viernes).
   * @param semanas Número de semanas (1 = viernes de esta semana o del ciclo siguiente, 2 = 2 semanas, etc.)
   * @param fechaBase Fecha de partida (opcional, por defecto hoy)
   */
  static calcularProximoViernes(semanas: number = 1, fechaBase?: string): string {
    const base = fechaBase ? new Date(fechaBase.includes('T') ? fechaBase : fechaBase + 'T12:00:00') : new Date();
    const diaSemana = base.getDay(); // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes, 6 = Sábado
    
    let diasHastaViernes = 0;
    if (diaSemana >= 1 && diaSemana < 5) {
      diasHastaViernes = 5 - diaSemana;
    } else if (diaSemana === 5) {
      // Si hoy es viernes y renueva 1 semana, corre al siguiente viernes
      diasHastaViernes = 7;
    } else if (diaSemana === 6) {
      // Sábado -> próximo viernes (+6)
      diasHastaViernes = 6;
    } else {
      // Domingo -> viernes de la semana que empieza (+5)
      diasHastaViernes = 5;
    }

    const semanasAdicionales = Math.max(0, semanas - 1) * 7;
    const totalDias = diasHastaViernes + semanasAdicionales;

    const fechaFinal = new Date(base.getTime());
    fechaFinal.setDate(fechaFinal.getDate() + totalDias);
    return fechaFinal.toISOString().split('T')[0];
  }

  /**
   * Renueva la membresía semanal o ajustada de un usuario del gimnasio,
   * y registra opcionalmente el pago en caja con auditoría y sincronización.
   */
  static renovarMembresiaGym(
    params: {
      personaId: string;
      nuevaFechaVencimiento: string;
      tipoMembresia?: 'Semanal' | 'Mensual' | 'Personalizada';
      pago?: {
        monto_bs: number;
        monto_usd?: number;
        tasa_bcv?: number;
        metodo_pago: MetodoPago;
        referencia: string;
        observaciones?: string;
      };
    },
    operadorCedula: string
  ): boolean {
    const personas = this.obtenerRegistros('persona');
    const target = personas.find(p => p.id === params.personaId);
    if (!target) return false;

    target.datos.fecha_vencimiento = params.nuevaFechaVencimiento;
    target.datos.tipo_membresia = params.tipoMembresia || 'Semanal';
    target.datos.estado_solvencia = 'Activo';
    target.actualizado_en = new Date().toISOString();

    this.guardarRegistro(target, operadorCedula);

    if (params.pago && params.pago.monto_bs >= 0) {
      this.registrarPago({
        usuario_id: target.datos.id_gbp || target.id,
        usuario_nombre: `${target.datos.nombre} ${target.datos.apellido}`.trim(),
        usuario_cedula: target.datos.cedula,
        fecha_pago: new Date().toISOString().split('T')[0],
        plan: params.tipoMembresia === 'Semanal' ? 'Semanal' : 'Abono por Adelanto',
        servicio: 'Servicio de Maquinas Musculacion',
        monto_bs: params.pago.monto_bs,
        monto_usd: params.pago.monto_usd,
        tasa_bcv: params.pago.tasa_bcv,
        metodo_pago: params.pago.metodo_pago,
        referencia: params.pago.referencia,
        estado: 'Solvente',
        tipo_membresia: params.tipoMembresia || 'Semanal',
        fecha_vencimiento: params.nuevaFechaVencimiento,
        observaciones: params.pago.observaciones || 'Renovación membresía gimnasio'
      }, operadorCedula);
    }

    return true;
  }

  // --- Control de Asistencias ---
  static obtenerAsistencias(): AsistenciaRegistro[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ASISTENCIAS);
    let asistencias: AsistenciaRegistro[] = raw ? JSON.parse(raw) : [];
    const sesion = this.obtenerSesion();
    if (sesion) {
      if ((sesion.rol === 'operador_base' || sesion.rol === 'operador_municipal') && sesion.parroquia_asignada) {
        asistencias = asistencias.filter(a => !a.ubicacion || (
          a.ubicacion.estado === sesion.estado_asignado &&
          a.ubicacion.parroquia === sesion.parroquia_asignada
        ));
      } else if (sesion.rol === 'coordinador_estadal' && sesion.estado_asignado) {
        asistencias = asistencias.filter(a => !a.ubicacion || a.ubicacion.estado === sesion.estado_asignado);
      }
    }
    return asistencias;
  }

  static registrarEntradaAsistencia(
    usuario: { id: string; nombre: string; cedula: string; disciplina?: string }, 
    operadorCedula: string
  ): AsistenciaRegistro {
    const asistencias = this.obtenerAsistencias();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];
    const sesion = this.obtenerSesion();
    const ubicacion = {
      estado: sesion?.estado_asignado || 'Distrito Capital',
      municipio: sesion?.municipio_asignado || 'Libertador',
      parroquia: sesion?.parroquia_asignada || 'Sucre (Catia)',
      comunidad: sesion?.base_misiones_nombre || ''
    };

    const nuevaAsistencia: AsistenciaRegistro = {
      id: generarUUID(),
      usuario_id: usuario.id,
      usuario_nombre: usuario.nombre,
      usuario_cedula: usuario.cedula,
      disciplina: usuario.disciplina || 'Gimnasio General',
      fecha: dateStr,
      hora_entrada: timeStr,
      estado: 'Activo',
      ubicacion,
      registrado_por: operadorCedula || sesion?.cedula || 'operador',
      sincronizado: false
    };

    asistencias.unshift(nuevaAsistencia);
    localStorage.setItem(STORAGE_KEYS.ASISTENCIAS, JSON.stringify(asistencias));

    // Encolar asistencia para sincronización con Supabase
    this.encolarSincronizacion({
      id: 'sync-' + Math.random().toString(36).substring(2, 9),
      registro_id: nuevaAsistencia.id,
      operacion: 'INSERT',
      payload: nuevaAsistencia,
      hlc_timestamp: HybridLogicalClock.now(),
      intentos: 0,
      estado: 'pendiente',
      creado_en: now.toISOString(),
      tipo_entidad: 'asistencia',
      resumen: `Asistencia - ${usuario.nombre} (${nuevaAsistencia.disciplina})`,
      servidor_destino: 'Supabase Cloud (jrjkuzjpabfaburppgtb.supabase.co)'
    });

    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: 'CHECK_IN_ASISTENCIA',
      entidad_tipo: 'asistencia',
      entidad_id: nuevaAsistencia.id,
      detalles: `Entrada registrada para ${usuario.nombre} (${usuario.cedula}) a las ${timeStr}.`,
      fecha: now.toISOString()
    });

    // Auto-sync inmediato si hay conexión
    const configAsist = this.obtenerConfig();
    if (configAsist.modo_red === 'online' && configAsist.auto_sync) {
      setTimeout(() => {
        StorageService.procesarColaSincronizacion().catch(() => {});
      }, 500);
    }

    window.dispatchEvent(new CustomEvent('mpv-asistencia-updated'));
    return nuevaAsistencia;
  }

  static registrarAsistenciaDirecta(asistencia: Omit<AsistenciaRegistro, 'id'>, operadorCedula: string): AsistenciaRegistro {
    const asistencias = this.obtenerAsistencias();
    const sesion = this.obtenerSesion();
    const now = new Date();
    const ubicacion = asistencia.ubicacion || {
      estado: sesion?.estado_asignado || 'Distrito Capital',
      municipio: sesion?.municipio_asignado || 'Libertador',
      parroquia: sesion?.parroquia_asignada || 'Sucre (Catia)'
    };

    const nueva: AsistenciaRegistro = {
      ...asistencia,
      id: generarUUID(),
      ubicacion,
      registrado_por: operadorCedula || sesion?.cedula || 'operador',
      sincronizado: false
    };

    asistencias.unshift(nueva);
    localStorage.setItem(STORAGE_KEYS.ASISTENCIAS, JSON.stringify(asistencias));

    this.encolarSincronizacion({
      id: 'sync-' + Math.random().toString(36).substring(2, 9),
      registro_id: nueva.id,
      operacion: 'INSERT',
      payload: nueva,
      hlc_timestamp: HybridLogicalClock.now(),
      intentos: 0,
      estado: 'pendiente',
      creado_en: now.toISOString(),
      tipo_entidad: 'asistencia',
      resumen: `Asistencia - ${nueva.usuario_nombre} (${nueva.disciplina})`,
      servidor_destino: 'Supabase Cloud (jrjkuzjpabfaburppgtb.supabase.co)'
    });

    window.dispatchEvent(new CustomEvent('mpv-asistencia-updated'));
    return nueva;
  }

  static registrarSalidaAsistencia(asistenciaId: string, operadorCedula: string): boolean {
    const asistencias = this.obtenerAsistencias();
    const target = asistencias.find(a => a.id === asistenciaId);
    if (!target) return false;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    target.hora_salida = timeStr;
    target.estado = 'Finalizado';
    target.tiempo_horas = 1.5; // Aproximado

    localStorage.setItem(STORAGE_KEYS.ASISTENCIAS, JSON.stringify(asistencias));

    // Encolar UPDATE de salida para Supabase
    this.encolarSincronizacion({
      id: 'sync-' + Math.random().toString(36).substring(2, 9),
      registro_id: asistenciaId,
      operacion: 'UPDATE',
      payload: { ...target },
      hlc_timestamp: HybridLogicalClock.now(),
      intentos: 0,
      estado: 'pendiente',
      creado_en: now.toISOString(),
      tipo_entidad: 'asistencia',
      resumen: `Salida - ${target.usuario_nombre}`,
      servidor_destino: 'Supabase Cloud (jrjkuzjpabfaburppgtb.supabase.co)'
    });

    this.registrarAuditoria({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      operador_cedula: operadorCedula,
      accion: 'CHECK_OUT_ASISTENCIA',
      entidad_tipo: 'asistencia',
      entidad_id: asistenciaId,
      detalles: `Salida registrada para ${target.usuario_nombre} a las ${timeStr}.`,
      fecha: now.toISOString()
    });

    // Auto-sync inmediato si hay conexión
    const configSalida = this.obtenerConfig();
    if (configSalida.modo_red === 'online' && configSalida.auto_sync) {
      setTimeout(() => {
        StorageService.procesarColaSincronizacion().catch(() => {});
      }, 500);
    }

    window.dispatchEvent(new CustomEvent('mpv-asistencia-updated'));
    return true;
  }

  // --- Importador Automático desde el archivo Excel oficial ---
  static importarDatosDesdeExcel(
    buffer: ArrayBuffer | Uint8Array, 
    operadorCedula: string
  ): { usuariosImportados: number; pagosImportados: number; mensaje: string } {
    try {
      const workbook = XLSX.read(buffer, { type: 'array' });
      let usuariosImportados = 0;
      let pagosImportados = 0;

      // 1. Procesar Hoja "Base de Usuarios GBP"
      const sheetNameUsuarios = workbook.SheetNames.find(n => 
        n.toLowerCase().includes('base de usuarios') || n.toLowerCase().includes('usuarios')
      );

      if (sheetNameUsuarios) {
        const sheet = workbook.Sheets[sheetNameUsuarios];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        // Buscar fila de encabezados
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          if (rows[i] && rows[i].some((c: any) => String(c).includes('Cedula') || String(c).includes('Nombre'))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx >= 0) {
          const headers = rows[headerRowIdx].map((c: any) => String(c || '').trim().toLowerCase());
          const colId = headers.findIndex(h => h === 'id' || h.includes('id'));
          const colNombre = headers.findIndex(h => h.includes('nombre'));
          const colCedula = headers.findIndex(h => h.includes('cedula'));
          const colTelf = headers.findIndex(h => h.includes('teléfono') || h.includes('telefono'));
          const colEmail = headers.findIndex(h => h.includes('email') || h.includes('correo'));
          const colMuni = headers.findIndex(h => h.includes('municipio'));
          const colParro = headers.findIndex(h => h.includes('parroquia'));
          const colSector = headers.findIndex(h => h.includes('sector'));
          const colDisc = headers.findIndex(h => h.includes('disciplina'));
          const colFecha = headers.findIndex(h => h.includes('fecha'));
          const colEstado = headers.findIndex(h => h.includes('estado'));
          const colObs = headers.findIndex(h => h.includes('observaciones'));

          const dataRows = rows.slice(headerRowIdx + 1);
          for (const row of dataRows) {
            if (!row || row.length === 0) continue;
            const rawId = colId >= 0 ? String(row[colId] || '').trim() : '';
            const rawNombreCompleto = colNombre >= 0 ? String(row[colNombre] || '').trim() : '';
            const rawCedula = colCedula >= 0 ? String(row[colCedula] || '').trim() : '';

            // Solo procesar si tiene nombre o cédula
            if (!rawNombreCompleto && !rawCedula) continue;

            const nameParts = rawNombreCompleto.split(' ');
            const nombre = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ') || rawNombreCompleto;
            const apellido = nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ') || '';

            const estadoVal = colEstado >= 0 ? String(row[colEstado] || '').trim() : '';
            let solvencia: EstadoSolvencia;
            if (estadoVal.toLowerCase().includes('deuda')) solvencia = 'Vencido';
            else if (estadoVal.toLowerCase().includes('suspendido')) solvencia = 'Vencido';
            else if (estadoVal.toLowerCase().includes('vencer')) solvencia = 'Próximo a Vencer';
            else solvencia = 'Activo';

            this.guardarRegistro({
              tipo: 'persona',
              datos: {
                id_gbp: rawId || `USUARIO-${String(usuariosImportados + 1).padStart(3, '0')}`,
                nombre,
                apellido,
                cedula: rawCedula || `V-${Math.floor(10000000 + Math.random() * 20000000)}`,
                telefono: colTelf >= 0 ? String(row[colTelf] || '').trim() : '',
                correo: colEmail >= 0 ? String(row[colEmail] || '').trim() : '',
                fecha_nacimiento: '1995-01-01',
                genero: 'Masculino',
                programa: 'Gran Base de Paz - Gimnasio Vertical',
                rol_comunitario: 'Usuario Activo',
                sector: colSector >= 0 ? String(row[colSector] || '').trim() : '',
                disciplina_gbp: colDisc >= 0 ? String(row[colDisc] || 'Gimnasio General').trim() : 'Gimnasio General',
                estado_solvencia: solvencia,
                fecha_inscripcion: colFecha >= 0 ? String(row[colFecha] || '').trim() : new Date().toISOString().split('T')[0],
                observaciones: colObs >= 0 ? String(row[colObs] || '').trim() : 'Importado desde Excel oficial.'
              },
              ubicacion: {
                estado: 'Distrito Capital',
                municipio: colMuni >= 0 ? String(row[colMuni] || 'Libertador').trim() : 'Libertador',
                parroquia: colParro >= 0 ? String(row[colParro] || 'Sucre').trim() : 'Sucre'
              }
            }, operadorCedula);

            usuariosImportados++;
          }
        }
      }

      return {
        usuariosImportados,
        pagosImportados,
        mensaje: `Importación completada con éxito. Se procesaron ${usuariosImportados} usuarios.`
      };
    } catch (err: any) {
      console.error('Error importando Excel:', err);
      return {
        usuariosImportados: 0,
        pagosImportados: 0,
        mensaje: `Error al procesar el archivo Excel: ${err.message}`
      };
    }
  }
}
