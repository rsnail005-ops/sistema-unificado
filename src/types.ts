export type TipoRegistro = 'persona' | 'evento' | 'documento' | 'reporte';

export type RolUsuario = 'developer' | 'superadmin_nacional' | 'coordinador_estadal' | 'operador_base' | 'operador_municipal';

export interface DocumentoAdjunto {
  id: string;
  nombre: string;
  tipo_mime: string;
  tamano_bytes: number;
  sha256: string;
  texto_extraido: string;
  fecha_subida: string;
  metadata?: {
    autor?: string;
    filas_excel?: number;
    hojas_excel?: string[];
    paginas_aprox?: number;
  };
}

export interface UbicacionGeografica {
  estado: string;
  municipio: string;
  parroquia: string;
  comunidad?: string;
}

export type PlanPago = 
  | 'Diario' 
  | 'Semanal' 
  | 'Mensual' 
  | 'Inscripción' 
  | 'Inscripción + Mensualidad' 
  | 'Abono por Adelanto';

export type ServicioPago = 
  | 'Servicio de Crossfit' 
  | 'Servicio de Maquinas Musculacion' 
  | 'Servicio de Spinning' 
  | 'Servicio de Maquinas para correr' 
  | 'Servicio de Danza' 
  | 'Servicio de Baile' 
  | 'Servicio de Teatro' 
  | 'Servicio de Auditorio' 
  | 'Servicio de Cancha' 
  | 'Servicio de Parque Infantil';

export type MetodoPago = 'Punto de Venta' | 'Transferencia' | 'Pago Móvil' | 'Efectivo';

export type EstadoMembresia = 'Activo' | 'Próximo a Vencer' | 'Vencido';
export type EstadoSolvencia = EstadoMembresia | 'Solvente' | 'Deuda' | 'Suspendido';

export function obtenerEstadoMembresia(
  estado?: string, 
  fechaVencimiento?: string, 
  esAtleta?: boolean
): EstadoMembresia {
  // Atletas de Alto Rendimiento están becados/exentos: siempre activos
  if (esAtleta) return 'Activo';

  if (fechaVencimiento) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fechaVencimiento.includes('T') ? fechaVencimiento : fechaVencimiento + 'T00:00:00');
    if (!isNaN(venc.getTime())) {
      const diffTime = venc.getTime() - hoy.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return 'Vencido';
      if (diffDays <= 3) return 'Próximo a Vencer';
      return 'Activo';
    }
  }
  if (!estado) return 'Activo';
  const e = estado.toLowerCase();
  if (e === 'activo' || e === 'solvente') return 'Activo';
  if (e.includes('próximo') || e.includes('proximo') || e.includes('vencer')) return 'Próximo a Vencer';
  return 'Vencido';
}

export interface PersonaDatos {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  correo?: string;
  fecha_nacimiento: string;
  genero: 'Masculino' | 'Femenino' | 'Otro';
  programa: string;
  rol_comunitario: string;
  observaciones?: string;
  // Campos Gran Base de Paz (Gimnasio Vertical)
  id_gbp?: string;
  disciplina_gbp?: string;
  sector?: string;
  base_misiones?: string;
  es_atleta_alto_rendimiento?: boolean;
  disciplina_atleta?: string;
  estado_solvencia?: EstadoSolvencia;
  plan_activo?: PlanPago;
  tipo_membresia?: 'Semanal' | 'Mensual' | 'Personalizada';
  fecha_inscripcion?: string;
  fecha_vencimiento?: string;
}

export type EstadoEspacio = 'Disponible' | 'Ocupado' | 'Mantenimiento' | 'Cerrado';

export interface HorarioPisoItem {
  id: string;
  horario: string;
  turno: 'Mañana' | 'Tarde' | 'Noche';
  piso2_crossfit: EstadoEspacio;
  piso2_musculacion: EstadoEspacio;
  piso2_spinning: EstadoEspacio;
  piso3_artes_marciales: EstadoEspacio;
  piso4_yoga_danza: EstadoEspacio;
  piso5_cancha: EstadoEspacio;
}

export interface BicicletaSpinning {
  id: string; // ej. 'Bici A-1'
  fila: 'Fila A (Frente)' | 'Fila B' | 'Fila C' | 'Fila D (Fondo)';
  numero: number;
  estado: 'Disponible' | 'Ocupada' | 'Mantenimiento';
  usuario_id?: string;
  usuario_nombre?: string;
  usuario_cedula?: string;
  hora_asignada?: string;
}

export interface ClaseProgramada {
  id: string;
  dia: string;
  hora: string;
  disciplina: string;
  instructor: string;
  cupos_totales: number;
  cupos_inscritos: number;
  piso: string;
}

export interface PagoRegistro {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_cedula: string;
  fecha_pago: string;
  plan: PlanPago;
  servicio: ServicioPago;
  monto_bs: number;
  monto_usd?: number;
  tasa_bcv?: number;
  metodo_pago: MetodoPago;
  referencia: string;
  estado: EstadoSolvencia;
  tipo_membresia?: 'Semanal' | 'Mensual' | 'Personalizada';
  fecha_vencimiento?: string;
  observaciones?: string;
  ubicacion?: UbicacionGeografica;
  registrado_por?: string;
  creado_en: string;
  sincronizado?: boolean;
}

export interface AsistenciaRegistro {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_cedula: string;
  disciplina: string;
  fecha: string;
  hora_entrada: string;
  hora_salida?: string;
  tiempo_horas?: number;
  estado: 'Activo' | 'Finalizado';
  ubicacion?: UbicacionGeografica;
  registrado_por?: string;
  sincronizado?: boolean;
}

export interface EventoDatos {
  titulo: string;
  tipo_actividad: 'Deportiva' | 'Cultural' | 'Preventiva' | 'Formativa' | 'Comunitaria';
  fecha: string;
  lugar: string;
  asistentes_estimados: number;
  coordinador_responsable: string;
  descripcion: string;
}

export interface ReporteDatos {
  periodo: string;
  resumen: string;
  total_beneficiarios: number;
  total_actividades: number;
  conclusiones: string;
}

export interface Registro<T = any> {
  id: string;
  tipo: TipoRegistro;
  datos: T;
  documentos: DocumentoAdjunto[];
  ubicacion: UbicacionGeografica;
  creado_por: string;
  creado_en: string;
  actualizado_en: string;
  sincronizado: boolean;
  hlc_timestamp: string;
  version: number;
  eliminado?: boolean;
}

export interface SyncItem {
  id: string;
  registro_id: string;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  hlc_timestamp: string;
  intentos: number;
  estado: 'pendiente' | 'sincronizando' | 'sincronizado' | 'conflicto' | 'error';
  creado_en: string;
  hora_sincronizado?: string;
  tipo_entidad?: string;
  resumen?: string;
  servidor_destino?: string;
  error_detalle?: string;
}

export interface UsuarioSesion {
  cedula: string;
  nombres: string;
  apellidos: string;
  correo?: string;
  rol: RolUsuario;
  estado_asignado: string;
  municipio_asignado?: string;
  parroquia_asignada?: string;
  base_misiones_nombre?: string;
  saime_validado: boolean;
  foto_url?: string;
  fecha_vigencia?: string;
}

export const isDeveloperSesion = (sesion: UsuarioSesion | null): boolean => {
  if (!sesion) return false;
  const cedula = sesion.cedula || '';
  const nombres = sesion.nombres || '';
  const correo = sesion.correo || '';
  return (
    sesion.rol === 'developer' ||
    cedula === 'V-99000001' ||
    nombres.toLowerCase().includes('desarrollador') ||
    correo.toLowerCase().includes('rsnail')
  );
};

export interface AuditLogEntry {
  id: string;
  operador_cedula: string;
  accion: string;
  entidad_tipo: string;
  entidad_id: string;
  detalles: string;
  fecha: string;
}
