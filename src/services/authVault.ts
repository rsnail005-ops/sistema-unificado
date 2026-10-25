import { UsuarioSesion, RolUsuario } from '../types';
import { StorageService } from './storage';
import { SupabaseService } from './supabase';

export interface UsuarioGuardado {
  id: string;
  cedula: string;
  correo: string;
  nombre: string;
  apellido: string;
  salt: string;
  password_hash: string;
  rol: RolUsuario;
  estado_asignado: string;
  municipio_asignado?: string;
  parroquia_asignada?: string;
  base_misiones_nombre?: string;
  cuenta_verificada: boolean;
  creado_en: string;
  ultimo_acceso?: string;
}

const VAULT_STORAGE_KEY = 'mpv_secure_auth_vault_x89';

export class AuthVaultService {
  /**
   * Hashea una contraseña usando SHA-256 + Salt con la Web Crypto API
   */
  static async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt + 'MPV_PEPPER_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static generarSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async inicializarBoveda() {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw || JSON.parse(raw).length === 0) {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify([]));
    }
  }

  static obtenerUsuarios(): UsuarioGuardado[] {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }





  /**
   * Autenticación con credenciales almacenadas
   */
  static async autenticar(identificador: string, contrasenaPlana: string): Promise<{
    exito: boolean;
    mensaje: string;
    usuario?: UsuarioSesion;
  }> {
    await this.inicializarBoveda();
    let usuarios = this.obtenerUsuarios();
    const limpio = identificador.trim().toLowerCase();

    const config = StorageService.obtenerConfig();
    const isOnline = config.modo_red === 'online' && !config.modo_manual_offline && (typeof navigator === 'undefined' || navigator.onLine);

    // 1. Si estamos en línea, verificar SIEMPRE contra el servidor Supabase
    if (isOnline) {
      let emailParaLogin = limpio;

      // Si el usuario ingresó una cédula (no un correo), buscar el email asociado
      if (!limpio.includes('@')) {
        // Primero intentar en caché local
        const localUser = usuarios.find(u => u.cedula.toLowerCase() === limpio);
        if (localUser && localUser.correo) {
          emailParaLogin = localUser.correo.toLowerCase();
        } else {
          // Si no hay caché local, buscar el correo en la tabla perfiles del servidor
          try {
            const url = SupabaseService.getUrl();
            const key = SupabaseService.getKey();
            const cedulaBuscar = limpio.toUpperCase();
            const perfilBusqueda = await fetch(
              `${url}/rest/v1/perfiles?cedula=eq.${encodeURIComponent(cedulaBuscar)}&select=correo,id`,
              {
                headers: {
                  'apikey': key,
                  'Authorization': `Bearer ${key}`
                }
              }
            );
            if (perfilBusqueda.ok) {
              const perfiles = await perfilBusqueda.json();
              if (Array.isArray(perfiles) && perfiles.length > 0 && perfiles[0].correo) {
                emailParaLogin = perfiles[0].correo.toLowerCase();
              }
            }
          } catch (e) {
            console.warn('No se pudo buscar cédula en el servidor:', e);
          }

          // Si sigue sin tener email, el usuario no existe en el sistema
          if (!emailParaLogin.includes('@')) {
            return {
              exito: false,
              mensaje: 'No se encontró una cuenta asociada a esta cédula. Verifique los datos o contacte a la Dirección Nacional.'
            };
          }
        }
      }

      // Autenticar contra el endpoint de Supabase Auth
      const remoteAuth = await SupabaseService.loginAuth(emailParaLogin, contrasenaPlana);
      if (!remoteAuth.ok || !remoteAuth.token || !remoteAuth.user) {
        // Dar un mensaje específico según el error real
        const errorRemoto = remoteAuth.error || '';
        let mensajeError = 'Contraseña incorrecta o cuenta inactiva. Verifique sus credenciales.';
        if (errorRemoto.toLowerCase().includes('invalid') || errorRemoto.toLowerCase().includes('credentials')) {
          mensajeError = 'Contraseña incorrecta. Verifique sus credenciales e intente nuevamente.';
        } else if (errorRemoto.toLowerCase().includes('not found') || errorRemoto.toLowerCase().includes('no user')) {
          mensajeError = 'No existe una cuenta con estos datos en el servidor. Contacte a la Dirección Nacional.';
        } else if (errorRemoto.toLowerCase().includes('email not confirmed')) {
          mensajeError = 'Su cuenta aún no ha sido confirmada. Contacte a la Dirección Nacional.';
        } else if (errorRemoto) {
          mensajeError = `Error del servidor: ${errorRemoto}`;
        }
        return {
          exito: false,
          mensaje: mensajeError
        };
      }

      // Guardar token de sesión para peticiones autenticadas
      try {
        localStorage.setItem('sb-auth-token', JSON.stringify({ access_token: remoteAuth.token }));
      } catch { /* noop */ }

      // Consultar el perfil y rol OFICIAL asignado en el servidor Supabase
      const url = SupabaseService.getUrl();
      const key = SupabaseService.getKey();
      const perfilesRes = await fetch(`${url}/rest/v1/perfiles?id=eq.${remoteAuth.user.id}`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${remoteAuth.token}`
        }
      });

      let rolServidor: RolUsuario = 'administrador_base';
      let estadoServidor = 'Distrito Capital';
      let munServidor = 'Libertador';
      let parrServidor = 'Sucre';
      let baseMisionesServidor = '';
      let cedulaServidor = remoteAuth.user.user_metadata?.cedula || 'V-00000000';
      let nombresServidor = remoteAuth.user.user_metadata?.nombres || 'Operador';
      let apellidosServidor = remoteAuth.user.user_metadata?.apellidos || 'Paz y Vida';
      let activoServidor = true;

      if (perfilesRes.ok) {
        const pData = await perfilesRes.json();
        if (Array.isArray(pData) && pData.length > 0) {
          const p = pData[0];
          rolServidor = (p.rol as RolUsuario) || rolServidor;
          estadoServidor = p.estado_asignado || estadoServidor;
          munServidor = p.municipio_asignado || munServidor;
          parrServidor = p.parroquia_asignada || parrServidor;
          baseMisionesServidor = p.base_misiones_nombre || '';
          cedulaServidor = p.cedula || cedulaServidor;
          nombresServidor = p.nombres || nombresServidor;
          apellidosServidor = p.apellidos || apellidosServidor;
          activoServidor = p.activo !== false;
        }
      }

      if (!activoServidor) {
        return {
          exito: false,
          mensaje: 'Esta cuenta ha sido desactivada o deshabilitada en el servidor central.'
        };
      }

      // Guardar hash y salt para permitir trabajar temporalmente sin conexión si se pierde la red
      const salt = this.generarSalt();
      const pHash = await this.hashPassword(contrasenaPlana, salt);
      const locIdx = usuarios.findIndex(u => u.cedula.toUpperCase() === cedulaServidor.toUpperCase() || u.correo.toLowerCase() === emailParaLogin);

      if (locIdx >= 0) {
        usuarios[locIdx].salt = salt;
        usuarios[locIdx].password_hash = pHash;
        usuarios[locIdx].rol = rolServidor;
        usuarios[locIdx].estado_asignado = estadoServidor;
        usuarios[locIdx].municipio_asignado = munServidor;
        usuarios[locIdx].parroquia_asignada = parrServidor;
        usuarios[locIdx].base_misiones_nombre = baseMisionesServidor;
        usuarios[locIdx].nombre = nombresServidor;
        usuarios[locIdx].apellido = apellidosServidor;
        usuarios[locIdx].cuenta_verificada = true;
        usuarios[locIdx].ultimo_acceso = new Date().toISOString();
      } else {
        usuarios.push({
          id: remoteAuth.user.id,
          cedula: cedulaServidor,
          correo: emailParaLogin,
          nombre: nombresServidor,
          apellido: apellidosServidor,
          salt,
          password_hash: pHash,
          rol: rolServidor,
          estado_asignado: estadoServidor,
          municipio_asignado: munServidor,
          parroquia_asignada: parrServidor,
          base_misiones_nombre: baseMisionesServidor,
          cuenta_verificada: true,
          creado_en: new Date().toISOString(),
          ultimo_acceso: new Date().toISOString()
        });
      }

      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(usuarios));

      return {
        exito: true,
        mensaje: `Acceso verificado por el servidor como [${rolServidor}].`,
        usuario: {
          cedula: cedulaServidor,
          nombres: nombresServidor,
          apellidos: apellidosServidor,
          rol: rolServidor,
          estado_asignado: estadoServidor,
          municipio_asignado: munServidor,
          parroquia_asignada: parrServidor,
          base_misiones_nombre: baseMisionesServidor,
          saime_validado: true
        }
      };
    }

    // 2. Modo sin conexión: solo permitir usuarios que ya hayan sido verificados en este equipo
    const target = usuarios.find(
      u => u.correo.toLowerCase() === limpio || u.cedula.toLowerCase() === limpio
    );

    if (!target) {
      return {
        exito: false,
        mensaje: 'Sin conexión al servidor. Para ingresar por primera vez en este equipo debe estar conectado a internet.'
      };
    }

    const inputHash = await this.hashPassword(contrasenaPlana, target.salt);
    if (inputHash !== target.password_hash) {
      return { exito: false, mensaje: 'Contraseña incorrecta. Verifique sus credenciales.' };
    }

    target.ultimo_acceso = new Date().toISOString();
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(usuarios));

    return {
      exito: true,
      mensaje: `Acceso autorizado (modo sin conexión) como [${target.rol}].`,
      usuario: {
        cedula: target.cedula,
        nombres: target.nombre,
        apellidos: target.apellido,
        rol: target.rol,
        estado_asignado: target.estado_asignado,
        municipio_asignado: target.municipio_asignado,
        parroquia_asignada: target.parroquia_asignada,
        base_misiones_nombre: target.base_misiones_nombre || '',
        saime_validado: true
      }
    };
  }
}

