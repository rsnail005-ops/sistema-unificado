/**
 * Servicio de Tasa Oficial del Banco Central de Venezuela (BCV)
 * Consulta en tiempo real la tasa del día con soporte offline y conversor de divisas.
 */

export interface TasaBCVInfo {
  tasa: number;
  fechaActualizacion: string;
  fechaLegible: string;
  fuente: string;
  ultimaConsulta: string;
  esManual: boolean;
  cargando: boolean;
  error?: string | null;
}

const STORAGE_KEY_BCV = 'mpv_tasa_bcv_cache_v1';
const STORAGE_KEY_MANUAL = 'mpv_tasa_bcv_manual_v1';

// Tasa de contingencia si no hay internet y no hay caché previo
const TASA_DEFECTO = 879.12;

export class BcvService {
  private static cachedData: TasaBCVInfo | null = null;
  private static isFetching = false;

  /**
   * Obtiene la tasa de forma sincrónica e inmediata desde memoria o localStorage
   */
  static obtenerTasaSincrona(): TasaBCVInfo {
    if (this.cachedData) {
      return this.cachedData;
    }

    // Verificar si hay tasa manual activa
    const manualRaw = localStorage.getItem(STORAGE_KEY_MANUAL);
    if (manualRaw) {
      try {
        const val = parseFloat(manualRaw);
        if (!isNaN(val) && val > 0) {
          this.cachedData = {
            tasa: val,
            fechaActualizacion: new Date().toISOString(),
            fechaLegible: new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }),
            fuente: 'Personalizada (Manual)',
            ultimaConsulta: new Date().toLocaleTimeString('es-VE'),
            esManual: true,
            cargando: false
          };
          return this.cachedData;
        }
      } catch (e) {}
    }

    // Leer del caché guardado
    const saved = localStorage.getItem(STORAGE_KEY_BCV);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.cachedData = parsed;
        return parsed;
      } catch (e) {}
    }

    // Valor predeterminado
    const defaultData: TasaBCVInfo = {
      tasa: TASA_DEFECTO,
      fechaActualizacion: new Date().toISOString(),
      fechaLegible: new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }),
      fuente: 'BCV Oficial (Estimada)',
      ultimaConsulta: new Date().toLocaleTimeString('es-VE'),
      esManual: false,
      cargando: false
    };

    this.cachedData = defaultData;
    return defaultData;
  }

  /**
   * Consulta la tasa oficial en línea mediante la API oficial de Venezuela
   */
  static async actualizarTasaEnLinea(): Promise<TasaBCVInfo> {
    // Si hay una tasa manual establecida, respetarla a menos que el usuario la limpie
    const manualRaw = localStorage.getItem(STORAGE_KEY_MANUAL);
    if (manualRaw) {
      const val = parseFloat(manualRaw);
      if (!isNaN(val) && val > 0) {
        return this.obtenerTasaSincrona();
      }
    }

    if (this.isFetching) {
      return this.obtenerTasaSincrona();
    }

    this.isFetching = true;

    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const tasaNum = Number(data.promedio || data.precio || data.venta || data.compra);

      if (!tasaNum || isNaN(tasaNum) || tasaNum <= 0) {
        throw new Error('Valor de tasa inválido devuelto por la API');
      }

      const fechaApi = data.fechaActualizacion ? new Date(data.fechaActualizacion) : new Date();
      const fechaLegible = fechaApi.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      const nuevaInfo: TasaBCVInfo = {
        tasa: parseFloat(tasaNum.toFixed(4)),
        fechaActualizacion: data.fechaActualizacion || new Date().toISOString(),
        fechaLegible,
        fuente: 'Banco Central de Venezuela (BCV Oficial)',
        ultimaConsulta: new Date().toLocaleTimeString('es-VE'),
        esManual: false,
        cargando: false,
        error: null
      };

      this.cachedData = nuevaInfo;
      localStorage.setItem(STORAGE_KEY_BCV, JSON.stringify(nuevaInfo));

      // Notificar a todos los componentes que la tasa fue actualizada
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mpv-bcv-updated', { detail: nuevaInfo }));
      }

      return nuevaInfo;
    } catch (err: any) {
      console.warn('No fue posible consultar la tasa BCV en línea, usando caché:', err.message);
      const fallback = this.obtenerTasaSincrona();
      fallback.error = 'Sin conexión con el servidor BCV. Mostrando última tasa almacenada.';
      return fallback;
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Permite fijar una tasa manualmente (útil para contingencias o auditoría)
   */
  static fijarTasaManual(nuevaTasa: number): TasaBCVInfo {
    const tasaLimpia = Math.abs(Number(nuevaTasa));
    if (isNaN(tasaLimpia) || tasaLimpia <= 0) {
      throw new Error('La tasa debe ser un número positivo mayor a 0');
    }

    localStorage.setItem(STORAGE_KEY_MANUAL, tasaLimpia.toString());

    const nuevaInfo: TasaBCVInfo = {
      tasa: parseFloat(tasaLimpia.toFixed(4)),
      fechaActualizacion: new Date().toISOString(),
      fechaLegible: new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }) + ' (Ajuste Manual)',
      fuente: 'Manual (Administrador)',
      ultimaConsulta: new Date().toLocaleTimeString('es-VE'),
      esManual: true,
      cargando: false
    };

    this.cachedData = nuevaInfo;
    localStorage.setItem(STORAGE_KEY_BCV, JSON.stringify(nuevaInfo));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mpv-bcv-updated', { detail: nuevaInfo }));
    }

    return nuevaInfo;
  }

  /**
   * Elimina el valor manual y vuelve a sincronizar con el BCV
   */
  static async restaurarAutomatica(): Promise<TasaBCVInfo> {
    localStorage.removeItem(STORAGE_KEY_MANUAL);
    this.cachedData = null;
    return await this.actualizarTasaEnLinea();
  }

  /**
   * Convierte Bolívares (Bs.) a Dólares (USD)
   */
  static bolivaresADolares(bs: number, tasaPersonalizada?: number): number {
    const tasa = tasaPersonalizada || this.obtenerTasaSincrona().tasa;
    if (!tasa || tasa <= 0) return 0;
    return parseFloat((bs / tasa).toFixed(2));
  }

  /**
   * Convierte Dólares (USD) a Bolívares (Bs.)
   */
  static dolaresABolivares(usd: number, tasaPersonalizada?: number): number {
    const tasa = tasaPersonalizada || this.obtenerTasaSincrona().tasa;
    if (!tasa || tasa <= 0) return 0;
    return parseFloat((usd * tasa).toFixed(2));
  }

  /**
   * Formatea un número a Bolívares con formato venezolano (ej. Bs. 1.250,50)
   */
  static formatearBs(monto: number): string {
    return `Bs. ${(monto || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Formatea un número a Dólares con formato estándar (ej. $12.50 USD)
   */
  static formatearUsd(monto: number): string {
    return `$${(monto || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  }
}
