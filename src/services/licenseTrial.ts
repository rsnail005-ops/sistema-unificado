/**
 * Servicio de Licencia (Versión Permanente - Sin Expiración)
 */

export interface EstadoLicencia {
  expirada: boolean;
  horasRestantes: number;
  minutosRestantes: number;
  segundosRestantes: number;
  textoTiempoRestante: string;
  fechaInicio: string;
  fechaExpiracion: string;
  desbloqueado: boolean;
  relojAlterado: boolean;
}

export class LicenseTrialService {
  static inicializarEvaluacion(): void {}

  static estaDesbloqueado(): boolean {
    return true;
  }

  static obtenerEstado(): EstadoLicencia {
    return {
      expirada: false,
      horasRestantes: 9999,
      minutosRestantes: 59,
      segundosRestantes: 59,
      textoTiempoRestante: 'Permanente',
      fechaInicio: 'Permanente',
      fechaExpiracion: 'Sin vencimiento',
      desbloqueado: true,
      relojAlterado: false
    };
  }

  static desbloquearConClave(): boolean {
    return true;
  }

  static resetearPrueba(): void {}
}
