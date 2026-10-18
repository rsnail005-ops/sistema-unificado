import { SupabaseService } from './supabase';

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

/** Versión actualmente instalada. Cámbiala al compilar cada release. */
export const APP_VERSION = '1.0.0';

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

  /** Compara semver: devuelve true si remota > local */
  static hayNuevaVersion(remota: string): boolean {
    const parse = (v: string) =>
      v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
    const [ma, mi, pa] = parse(remota);
    const [la, li, lp] = parse(APP_VERSION);
    if (ma !== la) return ma > la;
    if (mi !== li) return mi > li;
    return pa > lp;
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
