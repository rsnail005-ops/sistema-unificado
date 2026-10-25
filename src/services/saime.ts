export interface SaimeCitizen {
  cedula: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  genero: 'Masculino' | 'Femenino';
  estado_civil: 'Soltero(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viudo(a)';
  estado_nacimiento: string;
  vigente: boolean;
  foto_url: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  codigo_verificacion: string;
}

export class SaimeService {
  /**
   * Normaliza y formatea el número de cédula (ej. 'v12345678' -> 'V-12345678')
   */
  static normalizarCedula(input: string): string {
    if (!input) return '';
    const limpia = input.toUpperCase().replace(/[^VE0-9]/g, '');
    if (limpia.startsWith('V') || limpia.startsWith('E')) {
      const letra = limpia[0];
      const numeros = limpia.slice(1);
      return `${letra}-${numeros}`;
    }
    return `V-${limpia}`;
  }

  /**
   * Valida sintácticamente el formato de cédula venezolana (V-XXXXXXX o E-XXXXXXX)
   */
  static validarFormato(cedula: string): boolean {
    const normalizada = this.normalizarCedula(cedula);
    const regex = /^[VE]-[0-9]{6,9}$/;
    return regex.test(normalizada);
  }

  /**
   * Registro directo sin dependencias externas:
   * Retorna siempre ingreso directo para que los operadores no dependan de consultas externas
   */
  static async verificarIdentidad(cedulaRaw: string): Promise<{
    exito: boolean;
    ciudadano?: SaimeCitizen;
    mensaje: string;
    origen: 'ONLINE' | 'SAIME_DEMO' | 'VERIFIK_API';
  }> {
    return {
      exito: false,
      mensaje: 'Registro directo activado. Ingrese los datos directamente.',
      origen: 'ONLINE'
    };
  }
}
