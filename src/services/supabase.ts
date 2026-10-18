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
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('mpv_config_v1') : null;
    const config = raw ? JSON.parse(raw) : {};
    return config.supabase_url || (import.meta as any).env?.VITE_SUPABASE_URL || 'https://oxliwrrrmefuisuzdtpr.supabase.co';
  }

  static getKey(): string {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('mpv_config_v1') : null;
    const config = raw ? JSON.parse(raw) : {};
    return config.supabase_anon_key || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XE6powc_BwOMu-vh3CY6tQ_OJq3m4Z5';
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

      // Adecuar payload al esquema oficial de Supabase
      const payload = { ...item.payload };
      const targetUUID = toValidUUID(item.registro_id || payload.id || item.id);
      payload.id = targetUUID;
      payload.sincronizado = true;
      payload.actualizado_en = new Date().toISOString();
      if (!payload.creado_por) payload.creado_por = 'operador';
      if (!payload.hlc_timestamp) payload.hlc_timestamp = item.hlc_timestamp || new Date().toISOString();
      if (!payload.ubicacion) payload.ubicacion = { estado: '', municipio: '', parroquia: '' };

      // Determinar tabla destino en Supabase según tipo de entidad
      const tableName = item.tipo_entidad === 'pago' ? 'pagos' 
                      : item.tipo_entidad === 'asistencia' ? 'asistencias' 
                      : 'registros';

      if (tableName === 'pagos' && !payload.registrado_por) {
        payload.registrado_por = payload.creado_por || 'operador';
      }
      if (tableName === 'asistencias' && !payload.registrado_por) {
        payload.registrado_por = payload.creado_por || 'operador';
      }

      if (item.operacion === 'INSERT') {
        const res = await fetch(`${url}/rest/v1/${tableName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          // Si el registro ya existe en el servidor remoto, hacer fallback a PATCH/UPDATE
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
}
