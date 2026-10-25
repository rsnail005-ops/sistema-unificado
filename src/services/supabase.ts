import { SyncItem } from '../types';

export interface ServerStatusInfo {
  ok: boolean;
  status: 'online' | 'offline' | 'checking';
  latencyMs: number;
  message: string;
  url: string;
  version?: string;
  timestamp: string;
}

export interface SyncResult {
  total: number;
  exitosos: number;
  conflictos: number;
  errores: number;
  mensaje: string;
  hora: string;
  detalles: Array<{
    id: string;
    registro_id: string;
    tipo: string;
    operacion: string;
    resumen: string;
    hora: string;
    exito: boolean;
    error?: string;
  }>;
}

// Convierte identificadores locales a formato UUID válido para PostgreSQL
function toValidUUID(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id.toLowerCase();

  // Generar un UUID determinista a partir del string de entrada
  let hash1 = 0, hash2 = 0;
  for (let i = 0; i < id.length; i++) {
    const ch = id.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1) + ch;
    hash1 |= 0;
    hash2 = ((hash2 << 7) - hash2) + ch;
    hash2 |= 0;
  }
  const h1 = Math.abs(hash1).toString(16).padStart(8, '0');
  const h2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const pad = 'abcdef0123456789abcdef0123456789';
  const full = (h1 + h2 + pad).slice(0, 32);

  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

export class SupabaseService {
  static getUrl(): string {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('mpv_config_v1');
      if (raw) {
        try {
          const config = JSON.parse(raw);
          if (config.supabase_url && config.supabase_url.includes('oxliwrrrmefuisuzdtpr')) {
            config.supabase_url = 'https://jrjkuzjpabfaburppgtb.supabase.co';
            config.supabase_anon_key = 'sb_publishable_C-8wmkw92r-UMOrIdmqvAA_wQakDXZ7';
            localStorage.setItem('mpv_config_v1', JSON.stringify(config));
          } else if (config.supabase_url) {
            return config.supabase_url;
          }
        } catch {}
      }
    }
    return (import.meta as any).env?.VITE_SUPABASE_URL || 'https://jrjkuzjpabfaburppgtb.supabase.co';
  }

  static getKey(): string {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('mpv_config_v1');
      if (raw) {
        try {
          const config = JSON.parse(raw);
          if (config.supabase_anon_key && !config.supabase_url?.includes('oxliwrrrmefuisuzdtpr') && !config.supabase_anon_key.includes('oxliwrrrmefuisuzdtpr')) {
            return config.supabase_anon_key;
          }
        } catch {}
      }
    }
    return (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_C-8wmkw92r-UMOrIdmqvAA_wQakDXZ7';
  }

  static isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp) return false;
      return (payload.exp * 1000) < (Date.now() + 60000);
    } catch {
      return false;
    }
  }

  static async refreshToken(): Promise<boolean> {
    try {
      if (typeof localStorage === 'undefined') return false;
      const refreshToken = localStorage.getItem('mpv_supabase_refresh_token');
      if (!refreshToken) return false;

      const url = this.getUrl();
      const key = this.getKey();

      const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data && data.access_token) {
        localStorage.setItem('mpv_supabase_auth_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('mpv_supabase_refresh_token', data.refresh_token);
        }
        return true;
      }
    } catch {
      // Ignorar error de refresh
    }
    return false;
  }

  static getAuthToken(): string {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('mpv_supabase_auth_token');
      if (token) {
        if (this.isTokenExpired(token)) {
          this.refreshToken().catch(() => {});
        }
        return token;
      }
    }
    return this.getKey();
  }

  static getHeaders(extra?: Record<string, string>): Record<string, string> {
    const key = this.getKey();
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=representation',
      ...(extra || {})
    };
  }

  /**
   * Inicia sesión en Supabase Auth via GoTrue REST API (/auth/v1/token?grant_type=password)
   * y guarda el token JWT de usuario autenticado para RLS
   */
  static async loginAuth(email: string, pass: string): Promise<{ ok: boolean; token?: string; user?: any; error?: string }> {
    try {
      const url = this.getUrl();
      const key = this.getKey();

      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: pass
        })
      });

      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error_description || data.msg || data.message || `Error ${res.status}` };
      }

      if (data && data.access_token) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('mpv_supabase_auth_token', data.access_token);
          localStorage.setItem('mpv_supabase_refresh_token', data.refresh_token || '');
          localStorage.setItem('mpv_supabase_user_id', data.user?.id || '');
        }
        return { ok: true, token: data.access_token, user: data.user };
      }

      return { ok: false, error: 'No se obtuvo sesión válida de Supabase' };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Registra un nuevo usuario en Supabase Auth via GoTrue REST API (/auth/v1/signup).
   * El trigger de base de datos 'on_auth_user_created' crea automáticamente su perfil en 'public.perfiles'.
   */
  static async signUpAuth(params: {
    correo: string;
    pass: string;
    cedula: string;
    nombres: string;
    apellidos: string;
    rol: string;
    estado_asignado: string;
    municipio_asignado?: string;
    parroquia_asignada?: string;
  }): Promise<{ ok: boolean; user?: any; error?: string }> {
    try {
      const url = this.getUrl();
      const key = this.getKey();

      const res = await fetch(`${url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key
        },
        body: JSON.stringify({
          email: params.correo.trim().toLowerCase(),
          password: params.pass,
          data: {
            cedula: params.cedula.trim().toUpperCase(),
            nombres: params.nombres.trim(),
            apellidos: params.apellidos.trim(),
            rol: params.rol,
            estado_asignado: params.estado_asignado,
            municipio_asignado: params.municipio_asignado || '',
            parroquia_asignada: params.parroquia_asignada || ''
          }
        })
      });

      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error_description || data.msg || data.message || `Error ${res.status}` };
      }

      return { ok: true, user: data.user || data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Cierra sesión remota y elimina token de autenticación local
   */
  static async logoutAuth(): Promise<void> {
    try {
      const url = this.getUrl();
      const key = this.getKey();
      const token = this.getAuthToken();

      if (token && token !== key) {
        await fetch(`${url}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {});
      }
    } catch {
      // Ignorar errores al cerrar sesión
    } finally {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('mpv_supabase_auth_token');
        localStorage.removeItem('mpv_supabase_refresh_token');
        localStorage.removeItem('mpv_supabase_user_id');
      }
    }
  }

  /**
   * Verifica la conectividad en tiempo real y mide la latencia con el servidor Supabase
   */
  static async checkConnection(): Promise<ServerStatusInfo> {
    const url = this.getUrl();
    const key = this.getKey();
    const startTime = performance.now();
    const hora = new Date().toLocaleTimeString('es-VE');

    if (!url || !key) {
      return {
        ok: false,
        status: 'offline',
        latencyMs: 0,
        message: 'Servidor no configurado. Ingrese URL y Clave API en Configuración.',
        url: url || 'No configurada',
        timestamp: hora
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${url}/auth/v1/health`, {
        method: 'GET',
        headers: {
          'apikey': key
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);

      if (res.ok) {
        let version = 'GoTrue';
        try {
          const data = await res.json();
          if (data && data.version) version = `${data.name || 'GoTrue'} ${data.version}`;
        } catch {
          // json parse opcional
        }

        return {
          ok: true,
          status: 'online',
          latencyMs,
          message: `Servidor en línea y respondiendo activamente (${latencyMs} ms).`,
          url,
          version,
          timestamp: hora
        };
      } else {
        return {
          ok: false,
          status: 'offline',
          latencyMs,
          message: `El servidor respondió con código HTTP ${res.status} (${res.statusText}).`,
          url,
          timestamp: hora
        };
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        ok: false,
        status: 'offline',
        latencyMs,
        message: err.name === 'AbortError' 
          ? 'Tiempo de espera agotado al conectar con el servidor Supabase (>6s).'
          : `Sin conexión al servidor: ${err.message}`,
        url,
        timestamp: hora
      };
    }
  }

  /**
   * Despacha un registro hacia la tabla 'registros' de Supabase
   */
  static async syncRegistro(item: SyncItem): Promise<{ ok: boolean; error?: string }> {
    try {
      const url = this.getUrl();
      const key = this.getKey();

      if (!url || !key) {
        return { ok: false, error: 'Credenciales de Supabase no disponibles' };
      }

      const headers = this.getHeaders();
      const raw = item.payload;
      const targetUUID = toValidUUID(item.registro_id || raw?.id || item.id);

      // Determinar tabla destino
      const tableName = item.tipo_entidad === 'pago' ? 'pagos'
                      : item.tipo_entidad === 'asistencia' ? 'asistencias'
                      : 'registros';

      // ── Construir payload limpio según la tabla ──────────────────────────────
      let payload: Record<string, any>;

      if (tableName === 'pagos') {
        // Formatear observaciones para preservar metadatos de membresía y divisas sin requerir columnas extra
        let obsTexto = (raw.observaciones || '').trim();
        const metaParts: string[] = [];
        if (raw.monto_usd != null && !obsTexto.includes('USD:')) metaParts.push(`USD: $${Number(raw.monto_usd).toFixed(2)}`);
        if (raw.tasa_bcv != null && !obsTexto.includes('BCV:')) metaParts.push(`BCV: ${Number(raw.tasa_bcv).toFixed(4)}`);
        if (raw.tipo_membresia && !obsTexto.includes('Membresía:')) metaParts.push(`Membresía: ${raw.tipo_membresia}`);
        if (raw.fecha_vencimiento && !obsTexto.includes('Vence:')) metaParts.push(`Vence: ${raw.fecha_vencimiento}`);
        
        if (metaParts.length > 0) {
          const metaHeader = `[${metaParts.join(' | ')}]`;
          obsTexto = obsTexto ? `${metaHeader} ${obsTexto}` : metaHeader;
        }

        // Solo las 15 columnas exactas de la tabla "pagos" en Supabase:
        // id, usuario_id, usuario_nombre, usuario_cedula, fecha_pago, plan, servicio, monto_bs, metodo_pago, referencia, estado, observaciones, ubicacion, registrado_por, creado_en
        payload = {
          id: targetUUID,
          usuario_id: String(raw.usuario_id || ''),
          usuario_nombre: String(raw.usuario_nombre || 'Usuario'),
          usuario_cedula: String(raw.usuario_cedula || 'V-00000000'),
          fecha_pago: raw.fecha_pago || new Date().toISOString().split('T')[0],
          plan: raw.plan || 'Mensual',
          servicio: raw.servicio || 'Gimnasio',
          monto_bs: Number(raw.monto_bs) || 0,
          monto_usd: raw.monto_usd != null ? Number(raw.monto_usd) : null,
          tasa_bcv: raw.tasa_bcv != null ? Number(raw.tasa_bcv) : null,
          tipo_membresia: raw.tipo_membresia || null,
          fecha_vencimiento: raw.fecha_vencimiento || null,
          metodo_pago: raw.metodo_pago || 'Punto de Venta',
          referencia: String(raw.referencia || ''),
          estado: raw.estado || 'Solvente',
          observaciones: obsTexto,
          ubicacion: raw.ubicacion || { estado: '', municipio: '', parroquia: '' },
          registrado_por: String(raw.registrado_por || raw.creado_por || 'operador'),
          creado_en: raw.creado_en || new Date().toISOString()
        };

      } else if (tableName === 'asistencias') {
        // Columnas oficiales de la tabla "asistencias" en Supabase:
        // id, usuario_id, usuario_nombre, usuario_cedula, disciplina, fecha, hora_entrada, hora_salida, estado, ubicacion, registrado_por, creado_en
        payload = {
          id: targetUUID,
          usuario_id: String(raw.usuario_id || ''),
          usuario_nombre: String(raw.usuario_nombre || 'Usuario'),
          usuario_cedula: String(raw.usuario_cedula || 'V-00000000'),
          disciplina: raw.disciplina || 'General',
          fecha: raw.fecha || new Date().toISOString().split('T')[0],
          hora_entrada: raw.hora_entrada || new Date().toTimeString().split(' ')[0],
          estado: raw.estado || 'Activo',
          ubicacion: raw.ubicacion || { estado: '', municipio: '', parroquia: '' },
          registrado_por: String(raw.registrado_por || raw.creado_por || 'operador'),
          creado_en: raw.creado_en || new Date().toISOString()
        };
        if (raw.hora_salida) payload.hora_salida = raw.hora_salida;
        if (raw.tiempo_horas != null) payload.tiempo_horas = Number(raw.tiempo_horas);

      } else {
        // Tabla "registros" — schema de 12 columnas oficiales
        payload = {
          id: targetUUID,
          tipo: raw.tipo || 'persona',
          datos: raw.datos || {},
          documentos: Array.isArray(raw.documentos) ? raw.documentos : [],
          ubicacion: raw.ubicacion || { estado: '', municipio: '', parroquia: '' },
          creado_por: raw.creado_por || raw.registrado_por || 'operador',
          creado_en: raw.creado_en || new Date().toISOString(),
          actualizado_en: new Date().toISOString(),
          sincronizado: true,
          hlc_timestamp: item.hlc_timestamp || raw.hlc_timestamp || new Date().toISOString(),
          version: typeof raw.version === 'number' ? raw.version : 1,
          eliminado: Boolean(raw.eliminado)
        };
      }

      // ── Ejecutar operación ───────────────────────────────────────────────────
      if (item.operacion === 'INSERT') {
        const res = await fetch(`${url}/rest/v1/${tableName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          // Fallback: si ya existe, hacer PATCH
          if (res.status === 409 || errText.includes('duplicate key') || errText.includes('23505')) {
            const updateRes = await fetch(`${url}/rest/v1/${tableName}?id=eq.${targetUUID}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(payload)
            });
            if (updateRes.ok) return { ok: true };
          }
          return { ok: false, error: `Error ${res.status}: ${errText}` };
        }
        return { ok: true };

      } else if (item.operacion === 'UPDATE') {
        const res = await fetch(`${url}/rest/v1/${tableName}?id=eq.${targetUUID}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 404) {
            const insertRes = await fetch(`${url}/rest/v1/${tableName}`, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload)
            });
            if (insertRes.ok) return { ok: true };
          }
          return { ok: false, error: `Error ${res.status}: ${errText}` };
        }
        return { ok: true };

      } else if (item.operacion === 'DELETE') {
        const res = await fetch(`${url}/rest/v1/${tableName}?id=eq.${targetUUID}`, {
          method: 'DELETE',
          headers
        });
        if (!res.ok) {
          const errText = await res.text();
          return { ok: false, error: `Error ${res.status}: ${errText}` };
        }
        return { ok: true };
      }

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Descarga todos los registros sociales (personas, beneficiarios, etc.) desde Supabase
   */
  static async fetchRegistros(): Promise<{ ok: boolean; data?: any[]; error?: string }> {
    try {
      const url = this.getUrl();
      const key = this.getKey();
      if (!url || !key) return { ok: false, error: 'Credenciales de Supabase no configuradas' };

      const res = await fetch(`${url}/rest/v1/registros?select=*&order=actualizado_en.desc`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!res.ok) {
        return { ok: false, error: `Error ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Descarga todos los pagos registrados desde Supabase
   */
  static async fetchPagos(): Promise<{ ok: boolean; data?: any[]; error?: string }> {
    try {
      const url = this.getUrl();
      const key = this.getKey();
      if (!url || !key) return { ok: false, error: 'Credenciales de Supabase no configuradas' };

      const res = await fetch(`${url}/rest/v1/pagos?select=*&order=creado_en.desc`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!res.ok) {
        return { ok: false, error: `Error ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Descarga todas las asistencias registradas desde Supabase
   */
  static async fetchAsistencias(): Promise<{ ok: boolean; data?: any[]; error?: string }> {
    try {
      const url = this.getUrl();
      const key = this.getKey();
      if (!url || !key) return { ok: false, error: 'Credenciales de Supabase no configuradas' };

      const res = await fetch(`${url}/rest/v1/asistencias?select=*&order=creado_en.desc`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!res.ok) {
        return { ok: false, error: `Error ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Sincroniza o actualiza un perfil de usuario / rol en el servidor Supabase
   */
  static async syncPerfil(perfil: any): Promise<{ ok: boolean; error?: string }> {
    try {
      const url = this.getUrl();
      const key = this.getKey();
      if (!url || !key) return { ok: false, error: 'Credenciales de Supabase no configuradas' };

      const headers = this.getHeaders({
        'Prefer': 'resolution=merge-duplicates'
      });

      const payload: any = {
        cedula: perfil.cedula,
        nombres: perfil.nombre || perfil.nombres,
        apellidos: perfil.apellido || perfil.apellidos,
        correo: perfil.correo,
        telefono: perfil.telefono || '',
        rol: perfil.rol || 'operador_base',
        estado_asignado: perfil.estado_asignado || 'Distrito Capital',
        municipio_asignado: perfil.municipio_asignado || '',
        parroquia_asignada: perfil.parroquia_asignada || '',
        activo: true,
        actualizado_en: new Date().toISOString()
      };

      if (perfil.id && perfil.id.length === 36) {
        payload.id = perfil.id;
      }

      const res = await fetch(`${url}/rest/v1/perfiles?on_conflict=cedula`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: `Error ${res.status}: ${errText}` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Descarga todos los perfiles de operadores y sus roles desde el servidor Supabase
   */
  static async fetchPerfiles(): Promise<{ ok: boolean; data?: any[]; error?: string }> {
    try {
      const url = this.getUrl();
      const key = this.getKey();
      if (!url || !key) return { ok: false, error: 'Credenciales de Supabase no configuradas' };

      const res = await fetch(`${url}/rest/v1/perfiles?select=*`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!res.ok) {
        return { ok: false, error: `Error ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // ─── Biblioteca de Bases de Misiones ──────────────────────────────────────

  static async listarBases(): Promise<{ ok: boolean; data?: any[]; error?: string }> {
    try {
      const url = this.getUrl();
      if (!url) return { ok: false, error: 'Sin URL' };
      const res = await fetch(
        `${url}/rest/v1/bases_misiones?select=*&order=id.asc`,
        { headers: this.getHeaders() }
      );
      if (!res.ok) return { ok: false, error: `Error ${res.status}` };
      const data = await res.json();
      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  static async actualizarBase(id: string, payload: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
    try {
      const url = this.getUrl();
      if (!url) return { ok: false, error: 'Sin URL' };
      const body = { ...payload, actualizado_en: new Date().toISOString() };
      const res = await fetch(
        `${url}/rest/v1/bases_misiones?id=eq.${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { ...this.getHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) return { ok: false, error: `Error ${res.status}` };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  static async listarDisciplinas(baseId: string): Promise<{ ok: boolean; data?: any[]; error?: string }> {
    try {
      const url = this.getUrl();
      if (!url) return { ok: false, error: 'Sin URL' };
      const res = await fetch(
        `${url}/rest/v1/base_disciplinas?base_id=eq.${encodeURIComponent(baseId)}&order=piso.asc,nombre.asc`,
        { headers: this.getHeaders() }
      );
      if (!res.ok) return { ok: false, error: `Error ${res.status}` };
      const data = await res.json();
      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  static async crearDisciplina(payload: Record<string, any>): Promise<{ ok: boolean; data?: any; error?: string }> {
    try {
      const url = this.getUrl();
      if (!url) return { ok: false, error: 'Sin URL' };
      const res = await fetch(
        `${url}/rest/v1/base_disciplinas`,
        {
          method: 'POST',
          headers: { ...this.getHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) return { ok: false, error: `Error ${res.status}` };
      const data = await res.json();
      return { ok: true, data: Array.isArray(data) ? data[0] : data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  static async actualizarDisciplina(id: string, payload: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
    try {
      const url = this.getUrl();
      if (!url) return { ok: false, error: 'Sin URL' };
      const res = await fetch(
        `${url}/rest/v1/base_disciplinas?id=eq.${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { ...this.getHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) return { ok: false, error: `Error ${res.status}` };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  static async eliminarDisciplina(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const url = this.getUrl();
      if (!url) return { ok: false, error: 'Sin URL' };
      const res = await fetch(
        `${url}/rest/v1/base_disciplinas?id=eq.${encodeURIComponent(id)}`,
        { method: 'DELETE', headers: this.getHeaders() }
      );
      if (!res.ok) return { ok: false, error: `Error ${res.status}` };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  static async obtenerStatsBase(baseId: string): Promise<{ ok: boolean; data?: any; error?: string }> {
    try {
      const url = this.getUrl();
      if (!url) return { ok: false, error: 'Sin URL' };
      const headers = this.getHeaders();

      const [rPersonas, rPagos, rAsistencias] = await Promise.all([
        fetch(`${url}/rest/v1/perfiles?base_misiones_id=eq.${encodeURIComponent(baseId)}&select=id,estado_solvencia`, { headers }),
        fetch(`${url}/rest/v1/pagos?base_misiones_id=eq.${encodeURIComponent(baseId)}&select=monto_bs,monto_usd,creado_en`, { headers }),
        fetch(`${url}/rest/v1/asistencias?base_misiones_id=eq.${encodeURIComponent(baseId)}&select=id,fecha`, { headers }),
      ]);

      const personas     = rPersonas.ok ? await rPersonas.json() : [];
      const pagos        = rPagos.ok ? await rPagos.json() : [];
      const asistencias  = rAsistencias.ok ? await rAsistencias.json() : [];

      const personasArr   = Array.isArray(personas) ? personas : [];
      const pagosArr      = Array.isArray(pagos) ? pagos : [];
      const asistenciasArr = Array.isArray(asistencias) ? asistencias : [];

      const ingresos_bs  = pagosArr.reduce((s: number, p: any) => s + (Number(p.monto_bs) || 0), 0);
      const ingresos_usd = pagosArr.reduce((s: number, p: any) => s + (Number(p.monto_usd) || 0), 0);
      const personas_activas = personasArr.filter((p: any) => {
        const e = (p.estado_solvencia || '').toLowerCase();
        return e === 'activo' || e === 'solvente';
      }).length;

      return {
        ok: true,
        data: {
          total_personas: personasArr.length,
          total_pagos: pagosArr.length,
          total_asistencias: asistenciasArr.length,
          personas_activas,
          ingresos_bs,
          ingresos_usd,
        }
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  static async listarReportes(baseId: string, tipo?: string): Promise<{ ok: boolean; data?: any[]; error?: string }> {
    try {
      const url = this.getUrl();
      if (!url) return { ok: false, error: 'Sin URL' };
      let endpoint = `${url}/rest/v1/base_reportes?base_id=eq.${encodeURIComponent(baseId)}&order=generado_en.desc&limit=50`;
      if (tipo) endpoint += `&tipo=eq.${encodeURIComponent(tipo)}`;
      const res = await fetch(endpoint, { headers: this.getHeaders() });
      if (!res.ok) return { ok: false, error: `Error ${res.status}` };
      const data = await res.json();
      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  static async generarReporteManual(
    baseId: string,
    tipo: 'semanal' | 'mensual',
    datos_json: Record<string, any>,
    periodo: string,
    generado_por: string
  ): Promise<{ ok: boolean; data?: any; error?: string }> {
    try {
      const url = this.getUrl();
      if (!url) return { ok: false, error: 'Sin URL' };
      const payload = { base_id: baseId, tipo, periodo, datos_json, generado_por };
      const res = await fetch(`${url}/rest/v1/base_reportes`, {
        method: 'POST',
        headers: { ...this.getHeaders(), 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, error: `Error ${res.status}` };
      const data = await res.json();
      return { ok: true, data: Array.isArray(data) ? data[0] : data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  static async listarPersonasBase(baseId: string): Promise<{ ok: boolean; data?: any[]; error?: string }> {
    try {
      const url = this.getUrl();
      if (!url) return { ok: false, error: 'Sin URL' };
      const res = await fetch(
        `${url}/rest/v1/perfiles?base_misiones_id=eq.${encodeURIComponent(baseId)}&select=id,nombres,apellidos,cedula,estado_solvencia,plan_activo,tipo_membresia,fecha_vencimiento&order=apellidos.asc&limit=500`,
        { headers: this.getHeaders() }
      );
      if (!res.ok) return { ok: false, error: `Error ${res.status}` };
      const data = await res.json();
      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }
}

