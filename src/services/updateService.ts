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
  fileName?: string;
  isSetup?: boolean;
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
  /**
   * Compara dos versiones semver. Devuelve true si v1 es estrictamente mayor que v2.
   */
  static esMayor(v1: string, v2: string): boolean {
    const parse = (v: string) =>
      String(v || '').replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
    const [m1 = 0, i1 = 0, p1 = 0] = parse(v1);
    const [m2 = 0, i2 = 0, p2 = 0] = parse(v2);
    if (m1 !== m2) return m1 > m2;
    if (i1 !== i2) return i1 > i2;
    return p1 > p2;
  }

  /**
   * Consulta el release más reciente disponible, revisando tanto
   * GitHub Releases (repositorio oficial) como la tabla app_releases de Supabase.
   */
  static async obtenerUltimoRelease(): Promise<AppRelease | null> {
    let ghRelease: AppRelease | null = null;
    let sbRelease: AppRelease | null = null;

    // 1. Consultar GitHub Releases oficial
    try {
      const ghRes = await fetch('https://api.github.com/repos/rsnail005-ops/sistema-unificado/releases', {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (ghRes.ok) {
        const list = await ghRes.json();
        if (Array.isArray(list) && list.length > 0) {
          const valid = list.filter((r: any) => !r.draft);
          for (const item of valid) {
            const exeAsset = Array.isArray(item.assets)
              ? item.assets.find((a: any) => a.name && (a.name.endsWith('.exe') || a.name.endsWith('.AppImage')))
              : null;
            if (exeAsset && exeAsset.browser_download_url) {
              const assetName = exeAsset.name || '';
              ghRelease = {
                id: String(item.id || item.tag_name),
                version: String(item.tag_name || '').replace(/^v/, '').trim(),
                titulo: item.name || `Actualización ${item.tag_name}`,
                notas: item.body || 'Nueva versión publicada en el repositorio oficial.',
                download_url: exeAsset.browser_download_url,
                obligatoria: false,
                publicado_en: item.published_at || new Date().toISOString(),
                publicado_por: item.author?.login || 'rsnail005-ops',
                fileName: assetName,
                isSetup: assetName.toLowerCase().includes('setup'),
              };
              break;
            }
          }
        }
      }
    } catch {
      // Ignorar error de red hacia GitHub
    }

    // 2. Consultar Supabase app_releases
    try {
      const url = SupabaseService.getUrl();
      const key = SupabaseService.getKey();
      if (url && key) {
        const res = await fetch(
          `${url}/rest/v1/${RELEASES_TABLE}?order=publicado_en.desc&limit=1`,
          {
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            sbRelease = data[0] as AppRelease;
          }
        }
      }
    } catch {
      // Ignorar error de red hacia Supabase
    }

    // 3. Devolver la versión más alta entre ambas fuentes
    if (ghRelease && sbRelease) {
      if (UpdateService.esMayor(ghRelease.version, sbRelease.version)) {
        return ghRelease;
      }
      // Si la versión de Supabase es igual o mayor, conservar propiedades como "obligatoria"
      return {
        ...sbRelease,
        download_url: sbRelease.download_url || ghRelease.download_url,
      };
    }

    return ghRelease || sbRelease || null;
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
    const localVersion = UpdateService.obtenerVersionInstalada();
    return UpdateService.esMayor(remota, localVersion);
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
   * Obtiene las carpetas del sistema y el directorio actual de la aplicación
   */
  static async obtenerCarpetasPorDefecto(): Promise<{
    currentDir: string;
    currentExe: string;
    downloadsDir: string;
    desktopDir: string;
    tempDir: string;
  } | null> {
    if (typeof window === 'undefined' || !(window as any).require) return null;
    try {
      const electron = (window as any).require('electron');
      return await electron.ipcRenderer.invoke('updater:getDefaultDir');
    } catch {
      return null;
    }
  }

  /**
   * Abre un cuadro de diálogo nativo de Windows para seleccionar la carpeta de destino
   */
  static async seleccionarCarpeta(defaultPath?: string): Promise<string | null> {
    if (typeof window === 'undefined' || !(window as any).require) return null;
    try {
      const electron = (window as any).require('electron');
      const res = await electron.ipcRenderer.invoke('updater:selectFolder', defaultPath);
      if (res && !res.canceled && res.folderPath) {
        return res.folderPath;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Abre la carpeta o resalta el archivo en el Explorador de archivos de Windows
   */
  static async abrirCarpeta(targetPath: string): Promise<boolean> {
    if (typeof window === 'undefined' || !(window as any).require) return false;
    try {
      const electron = (window as any).require('electron');
      const res = await electron.ipcRenderer.invoke('updater:openFolder', targetPath);
      return Boolean(res && res.ok);
    } catch {
      return false;
    }
  }

  /**
   * Descarga el instalador usando el IPC de Electron con reporte de progreso.
   * @param downloadUrl  URL directa al .exe en GitHub Releases
   * @param onProgress   Callback (0-100)
   * @param fileName     Nombre original del archivo (opcional)
   * @param targetFolder Carpeta de destino elegida por el usuario (opcional)
   * @returns Información de la descarga completada
   */
  static async descargarInstalador(
    downloadUrl: string,
    onProgress: (pct: number) => void,
    fileName?: string,
    targetFolder?: string
  ): Promise<{ path: string; targetFolder: string; fileName: string }> {
    if (typeof window === 'undefined' || !(window as any).require) {
      throw new Error('La descarga requiere la versión de escritorio.');
    }
    const electron = (window as any).require('electron');

    electron.ipcRenderer.on('update:progress', (_: any, pct: number) => {
      onProgress(pct);
    });

    try {
      const result: {
        ok: boolean;
        path?: string;
        targetFolder?: string;
        fileName?: string;
        error?: string;
      } = await electron.ipcRenderer.invoke('update:download', {
        downloadUrl,
        fileName,
        targetFolder
      });

      if (!result.ok || !result.path) {
        throw new Error(result.error || 'Error descargando actualización.');
      }
      return {
        path: result.path,
        targetFolder: result.targetFolder || '',
        fileName: result.fileName || ''
      };
    } finally {
      electron.ipcRenderer.removeAllListeners('update:progress');
    }
  }

  /**
   * Ejecuta el reemplazo in-situ o lanzador de instalación formal
   */
  static async lanzarInstalador(
    installerPath: string,
    newVersion?: string,
    isSetup?: boolean,
    assetName?: string,
    targetFolder?: string
  ): Promise<void> {
    if (typeof window === 'undefined' || !(window as any).require) return;
    const electron = (window as any).require('electron');
    const res = await electron.ipcRenderer.invoke('update:launch', {
      installerPath,
      newVersion,
      isSetup,
      assetName,
      targetFolder
    });
    if (res && res.ok === false) {
      throw new Error(res.error || 'Error al iniciar el reemplazo de la aplicación.');
    }
  }

  /** Publica un nuevo release en Supabase (solo rol developer) */
  static async publicarRelease(
    release: Omit<AppRelease, 'id' | 'publicado_en'>,
    authToken?: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const url = SupabaseService.getUrl();
      const key = SupabaseService.getKey();
      if (!url || !key) return { ok: false, error: 'Supabase no configurado.' };

      const tokenToUse = authToken || SupabaseService.getAuthToken() || key;

      const makeRequest = async (auth: string) => {
        return fetch(`${url}/rest/v1/${RELEASES_TABLE}`, {
          method: 'POST',
          headers: {
            apikey: key,
            Authorization: `Bearer ${auth}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            ...release,
            publicado_en: new Date().toISOString(),
          }),
        });
      };

      let res = await makeRequest(tokenToUse);

      // Si falla por JWT expired (PGRST303) o 401, reintentar automáticamente con la key anon de Supabase
      if (!res.ok) {
        const errText = await res.text();
        if (errText.includes('JWT expired') || errText.includes('PGRST303') || res.status === 401) {
          const retryRes = await makeRequest(key);
          if (retryRes.ok) return { ok: true };
          const retryErr = await retryRes.text();
          return { ok: false, error: retryErr };
        }
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
