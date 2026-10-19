import { SupabaseService } from './supabase';
import { APP_VERSION as DEFAULT_APP_VERSION } from '../version';

export interface AppRelease {
  id: string;
  version: string;
  titulo: string;
  notas: string;
  download_url: string;
  obligatoria: boolean;
  publicado_en: string;
  publicado_por: string;
}

/** Versión base compilada del sistema */
export const APP_VERSION = DEFAULT_APP_VERSION;

/**
 * Clave en localStorage que guarda la última versión que el usuario
 * ya instaló y que está actualmente en ejecución.
 */
const INSTALLED_VERSION_KEY = 'mpv_installed_app_version';

const RELEASES_TABLE = 'app_releases';

export class UpdateService {
  /** Consulta Supabase para obtener el release más reciente */
  static async obtenerUltimoRelease(): Promise<AppRelease | null> {
    try {
      const url = SupabaseService.getUrl();
      const key = SupabaseService.getKey();
      if (!url || !key) return null;

      const res = await fetch(
        `${url}/rest/v1/${RELEASES_TABLE}?order=publicado_en.desc&limit=1`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      return data[0] as AppRelease;
    } catch {
      return null;
    }
  }

  /** Devuelve la versión que el usuario tiene instalada (localStorage o fallback a versión base). */
  static obtenerVersionInstalada(): string {
    return localStorage.getItem(INSTALLED_VERSION_KEY) || DEFAULT_APP_VERSION;
  }

  /** Persiste en localStorage la nueva versión instalada y notifica a los componentes React. */
  static marcarVersionInstalada(version: string): void {
    const clean = version.replace(/^v/, '');
    localStorage.setItem(INSTALLED_VERSION_KEY, clean);
    window.dispatchEvent(new CustomEvent('mpv-version-updated', { detail: clean }));
  }

  /**
   * Compara semver: devuelve true si `remota` es mayor que
   * la versión instalada conocida (localStorage ó DEFAULT_APP_VERSION).
   */
  static hayNuevaVersion(remota: string): boolean {
    const parse = (v: string) =>
      v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
    const [ma, mi, pa] = parse(remota);
    const localVersion = UpdateService.obtenerVersionInstalada();
    const [la, li, lp] = parse(localVersion);
    if (ma !== la) return ma > la;
    if (mi !== li) return mi > li;
    return pa > lp;
  }

  /**
   * Verifica manualmente si hay una nueva versión y devuelve el resultado detallado.
   */
  static async verificarActualizacionManual(): Promise<{
    hayNueva: boolean;
    release: AppRelease | null;
    versionInstalada: string;
    error?: string;
  }> {
    const versionInstalada = UpdateService.obtenerVersionInstalada();
    try {
      const release = await UpdateService.obtenerUltimoRelease();
      if (!release) {
        return { hayNueva: false, release: null, versionInstalada };
      }
      const hayNueva = UpdateService.hayNuevaVersion(release.version);
      return { hayNueva, release, versionInstalada };
    } catch (err: any) {
      return { hayNueva: false, release: null, versionInstalada, error: err.message || 'Error de conexión' };
    }
  }

  /**
   * Descarga el instalador usando el IPC de Electron con reporte de progreso.
   * @param downloadUrl  URL directa al .exe en GitHub Releases
   * @param onProgress   Callback (0-100)
   * @returns Ruta local al instalador descargado
   */
  static async descargarInstalador(
    downloadUrl: string,
    onProgress: (pct: number) => void
  ): Promise<string> {
    if (typeof window === 'undefined' || !(window as any).require) {
      throw new Error('La descarga requiere la versión de escritorio.');
    }
    const electron = (window as any).require('electron');

    electron.ipcRenderer.on('update:progress', (_: any, pct: number) => {
      onProgress(pct);
    });

    try {
      const result: { ok: boolean; path?: string; error?: string } =
        await electron.ipcRenderer.invoke('update:download', { downloadUrl });

      if (!result.ok || !result.path) {
        throw new Error(result.error || 'Error descargando actualización.');
      }
      return result.path;
    } finally {
      electron.ipcRenderer.removeAllListeners('update:progress');
    }
  }

  /** Lanza el instalador descargado y cierra la app */
  static async lanzarInstalador(installerPath: string): Promise<void> {
    if (typeof window === 'undefined' || !(window as any).require) return;
    const electron = (window as any).require('electron');
    await electron.ipcRenderer.invoke('update:launch', { installerPath });
  }

  /** Publica un nuevo release en Supabase (solo rol developer) */
  static async publicarRelease(
    release: Omit<AppRelease, 'id' | 'publicado_en'>,
    authToken: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const url = SupabaseService.getUrl();
      const key = SupabaseService.getKey();
      if (!url || !key) return { ok: false, error: 'Supabase no configurado.' };

      const res = await fetch(`${url}/rest/v1/${RELEASES_TABLE}`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          ...release,
          publicado_en: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: errText };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /** Lista todos los releases para el panel de developer */
  static async listarReleases(authToken?: string): Promise<AppRelease[]> {
    try {
      const url = SupabaseService.getUrl();
      const key = SupabaseService.getKey();
      if (!url || !key) return [];

      const res = await fetch(
        `${url}/rest/v1/${RELEASES_TABLE}?order=publicado_en.desc`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${authToken || key}`,
          },
        }
      );
      if (!res.ok) return [];
      return (await res.json()) as AppRelease[];
    } catch {
      return [];
    }
  }
}
