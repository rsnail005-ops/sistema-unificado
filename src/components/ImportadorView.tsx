import React, { useState, useRef, useCallback } from 'react';
import {
  FileSpreadsheet,
  FileText,
  File,
  Upload,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  UserPlus,
  Zap,
  X,
  Eye,
  Download,
  ChevronDown,
  ChevronUp,
  CreditCard,
  UserCheck,
  Users,
  Layers,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { StorageService } from '../services/storage';
import { BcvService } from '../services/bcvService';
import { UsuarioSesion, MetodoPago, PlanPago, ServicioPago } from '../types';

interface ImportadorViewProps {
  sesion: UsuarioSesion | null;
}

export type TipoImportacion = 'personas' | 'pagos' | 'asistencias';

// --- Interfaces de Datos Extraídos ---

export interface PersonaExtraida {
  _idx: number;
  cedula: string;
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  fecha_nacimiento: string;
  genero: 'Masculino' | 'Femenino' | 'Otro';
  programa: string;
  estado: string;
  municipio: string;
  _status: 'nuevo' | 'actualizado' | 'duplicado_sin_cambios' | 'error';
  _error?: string;
  _selected: boolean;
  _raw?: Record<string, string>;
}

export interface PagoExtraido {
  _idx: number;
  cedula: string;
  nombre_atleta: string;
  monto_bs: number;
  monto_usd: number;
  metodo_pago: MetodoPago;
  referencia: string;
  plan: PlanPago;
  servicio: ServicioPago;
  fecha: string;
  estado_geo: string;
  atleta_existe: boolean;
  _status: 'valido' | 'atleta_nuevo' | 'error';
  _error?: string;
  _selected: boolean;
  _raw?: Record<string, string>;
}

export interface AsistenciaExtraida {
  _idx: number;
  cedula: string;
  nombre_atleta: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  disciplina: string;
  estado_asistencia: 'Activo' | 'Finalizado';
  atleta_existe: boolean;
  _status: 'valido' | 'atleta_nuevo' | 'error';
  _error?: string;
  _selected: boolean;
  _raw?: Record<string, string>;
}

// Limpieza de Cédula Venezolana
function cleanCedula(v: string): string {
  const clean = String(v).toUpperCase().replace(/[^\d]/g, '').replace(/^(0+)/, '');
  return clean ? `V-${clean}` : '';
}

function normalizeHeader(h: string): string {
  return String(h).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_');
}

function splitNombreCompleto(fullname: string): { nombre: string; apellido: string } {
  const parts = fullname.trim().split(/\s+/);
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  const mid = Math.ceil(parts.length / 2);
  return {
    nombre: parts.slice(0, mid).join(' '),
    apellido: parts.slice(mid).join(' '),
  };
}

function inferGenero(val: string): 'Masculino' | 'Femenino' | 'Otro' {
  const v = val.toLowerCase().trim();
  if (['m', 'masculino', 'hombre', 'male'].includes(v)) return 'Masculino';
  if (['f', 'femenino', 'mujer', 'female'].includes(v)) return 'Femenino';
  return 'Otro';
}

function inferMetodoPago(val: string): MetodoPago {
  const v = val.toLowerCase().trim();
  if (v.includes('movil') || v.includes('móvil')) return 'Pago Móvil';
  if (v.includes('efectivo') || v.includes('usd') || v.includes('dolar') || v.includes('bs')) return 'Efectivo';
  if (v.includes('punto') || v.includes('pos') || v.includes('tarjeta')) return 'Punto de Venta';
  if (v.includes('transf') || v.includes('transferencia')) return 'Transferencia';
  return 'Pago Móvil';
}

function inferServicioPago(val: string): ServicioPago {
  const v = val.toLowerCase().trim();
  if (v.includes('crossfit')) return 'Servicio de Crossfit';
  if (v.includes('spin')) return 'Servicio de Spinning';
  if (v.includes('danza')) return 'Servicio de Danza';
  if (v.includes('baile') || v.includes('bailo')) return 'Servicio de Baile';
  if (v.includes('teatro')) return 'Servicio de Teatro';
  if (v.includes('cancha')) return 'Servicio de Cancha';
  if (v.includes('correr')) return 'Servicio de Maquinas para correr';
  return 'Servicio de Maquinas Musculacion';
}

function inferPlanPago(val: string): PlanPago {
  const v = val.toLowerCase().trim();
  if (v.includes('seman')) return 'Semanal';
  if (v.includes('diar')) return 'Diario';
  if (v.includes('inscrip')) return 'Inscripción';
  if (v.includes('abono')) return 'Abono por Adelanto';
  return 'Mensual';
}

// --- Detección Automática de Tipo de Archivo ---
function detectarTipoArchivo(rows: Record<string, any>[]): TipoImportacion {
  if (rows.length === 0) return 'personas';
  const headers = Object.keys(rows[0]).map(normalizeHeader);

  // Si tiene columnas financieras -> pagos
  const pagoKeywords = ['monto', 'monto_bs', 'monto_usd', 'referencia', 'metodo', 'metodo_pago', 'forma_pago', 'plan', 'servicio'];
  const matchesPago = headers.filter(h => pagoKeywords.some(k => h.includes(k))).length;

  // Si tiene columnas de control horario -> asistencias
  const asistKeywords = ['entrada', 'salida', 'hora_entrada', 'hora_salida', 'asistencia', 'tiempo', 'tiempo_horas'];
  const matchesAsist = headers.filter(h => asistKeywords.some(k => h.includes(k))).length;

  if (matchesPago >= 2) return 'pagos';
  if (matchesAsist >= 1) return 'asistencias';
  return 'personas';
}

// --- Extraer Personas de Excel ---
function parseExcelPersonas(rows: Record<string, any>[]): PersonaExtraida[] {
  const registros = StorageService.obtenerRegistros('persona');
  return rows.map((row, i) => {
    let cedula = '';
    let nombre = '';
    let apellido = '';
    let telefono = '';
    let correo = '';
    let fecha_nacimiento = '';
    let genero: 'Masculino' | 'Femenino' | 'Otro' = 'Masculino';
    let programa = 'Gran Base de Paz - Gimnasio Vertical';
    let estado = 'Distrito Capital';
    let municipio = 'Libertador';

    for (const [key, val] of Object.entries(row)) {
      const h = normalizeHeader(key);
      const strVal = String(val || '').trim();
      if (!strVal) continue;

      if (h.includes('cedula') || h === 'ci' || h === 'dni') {
        cedula = cleanCedula(strVal);
      } else if (h.includes('nombre_completo') || h === 'nombre_y_apellido') {
        const split = splitNombreCompleto(strVal);
        nombre = split.nombre;
        apellido = split.apellido;
      } else if (h === 'nombre' || h === 'nombres' || h.includes('primer_nombre')) {
        nombre = strVal;
      } else if (h === 'apellido' || h === 'apellidos' || h.includes('primer_apellido')) {
        apellido = strVal;
      } else if (h.includes('telefono') || h.includes('celular') || h.includes('movil')) {
        telefono = strVal;
      } else if (h.includes('correo') || h.includes('email')) {
        correo = strVal;
      } else if (h.includes('nacimiento') || h.includes('fecha_nac')) {
        fecha_nacimiento = strVal;
      } else if (h.includes('genero') || h.includes('sexo')) {
        genero = inferGenero(strVal);
      } else if (h.includes('programa') || h.includes('disciplina')) {
        programa = strVal;
      } else if (h === 'estado' || h.includes('entidad')) {
        estado = strVal;
      } else if (h === 'municipio') {
        municipio = strVal;
      }
    }

    const existing = registros.find(r => r.datos.cedula === cedula && cedula);
    let status: PersonaExtraida['_status'] = 'nuevo';
    let selected = true;

    if (existing) {
      const hasChanges =
        (nombre && existing.datos.nombre !== nombre) ||
        (apellido && existing.datos.apellido !== apellido) ||
        (telefono && existing.datos.telefono !== telefono);
      status = hasChanges ? 'actualizado' : 'duplicado_sin_cambios';
      if (!hasChanges) selected = false;
    }

    return {
      _idx: i,
      cedula,
      nombre,
      apellido,
      telefono,
      correo,
      fecha_nacimiento,
      genero,
      programa,
      estado,
      municipio,
      _status: status,
      _selected: selected,
      _raw: Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v)]))
    };
  }).filter(p => p.cedula || p.nombre);
}

// --- Extraer Pagos de Excel ---
function parseExcelPagos(rows: Record<string, any>[], tasaBcv: number): PagoExtraido[] {
  const personas = StorageService.obtenerRegistros('persona');
  const hoyStr = new Date().toISOString().split('T')[0];

  return rows.map((row, i) => {
    let cedula = '';
    let nombre_atleta = '';
    let monto_bs = 0;
    let monto_usd = 0;
    let metodo_pago: MetodoPago = 'Pago Móvil';
    let referencia = '';
    let plan: PlanPago = 'Mensual';
    let servicio: ServicioPago = 'Servicio de Maquinas Musculacion';
    let fecha = hoyStr;
    let estado_geo = 'Distrito Capital';

    for (const [key, val] of Object.entries(row)) {
      const h = normalizeHeader(key);
      const strVal = String(val || '').trim();
      if (!strVal) continue;

      if (h.includes('cedula') || h === 'ci') {
        cedula = cleanCedula(strVal);
      } else if (h.includes('atleta') || h.includes('usuario') || h.includes('nombre')) {
        nombre_atleta = strVal;
      } else if (h.includes('monto_bs') || h === 'bs' || h === 'bolivares') {
        monto_bs = parseFloat(strVal.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
      } else if (h.includes('monto_usd') || h === 'usd' || h === 'dolares' || h.includes('monto_$')) {
        monto_usd = parseFloat(strVal.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
      } else if (h === 'monto' || h === 'importe') {
        const num = parseFloat(strVal.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
        if (strVal.includes('$') || strVal.toUpperCase().includes('USD')) {
          monto_usd = num;
        } else {
          monto_bs = num;
        }
      } else if (h.includes('metodo') || h.includes('forma_pago')) {
        metodo_pago = inferMetodoPago(strVal);
      } else if (h.includes('referencia') || h === 'ref' || h.includes('recibo')) {
        referencia = strVal;
      } else if (h.includes('plan')) {
        plan = inferPlanPago(strVal);
      } else if (h.includes('servicio') || h.includes('disciplina') || h.includes('concepto')) {
        servicio = inferServicioPago(strVal);
      } else if (h.includes('fecha')) {
        fecha = strVal.length >= 8 ? strVal.slice(0, 10) : hoyStr;
      } else if (h === 'estado' || h.includes('entidad')) {
        estado_geo = strVal;
      }
    }

    // Auto-cálculo de contravalor usando la tasa oficial BCV
    if (monto_bs > 0 && monto_usd === 0) {
      monto_usd = Number((monto_bs / tasaBcv).toFixed(2));
    } else if (monto_usd > 0 && monto_bs === 0) {
      monto_bs = Number((monto_usd * tasaBcv).toFixed(2));
    }

    // Si no trae referencia, generar una automática
    if (!referencia) {
      referencia = `LOTE-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    // Verificar si el atleta ya existe en la base de datos
    const atletaMatch = personas.find(p => p.datos.cedula === cedula && cedula);
    const atleta_existe = !!atletaMatch;
    if (atletaMatch && !nombre_atleta) {
      nombre_atleta = `${atletaMatch.datos.nombre} ${atletaMatch.datos.apellido}`.trim();
    }

    const status: 'valido' | 'atleta_nuevo' = atleta_existe ? 'valido' : 'atleta_nuevo';

    return {
      _idx: i,
      cedula,
      nombre_atleta: nombre_atleta || 'Atleta Importado',
      monto_bs,
      monto_usd,
      metodo_pago,
      referencia,
      plan,
      servicio,
      fecha,
      estado_geo,
      atleta_existe,
      _status: status,
      _selected: true,
      _raw: Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v)]))
    };
  }).filter(p => p.cedula || p.monto_bs > 0 || p.monto_usd > 0);
}

// --- Extraer Asistencias de Excel ---
function parseExcelAsistencias(rows: Record<string, any>[]): AsistenciaExtraida[] {
  const personas = StorageService.obtenerRegistros('persona');
  const hoyStr = new Date().toISOString().split('T')[0];

  return rows.map((row, i) => {
    let cedula = '';
    let nombre_atleta = '';
    let fecha = hoyStr;
    let hora_entrada = '08:00 AM';
    let hora_salida = '10:00 AM';
    let disciplina = 'Gimnasio General / Musculación';
    let estado_asistencia: 'Activo' | 'Finalizado' = 'Finalizado';

    for (const [key, val] of Object.entries(row)) {
      const h = normalizeHeader(key);
      const strVal = String(val || '').trim();
      if (!strVal) continue;

      if (h.includes('cedula') || h === 'ci') {
        cedula = cleanCedula(strVal);
      } else if (h.includes('atleta') || h.includes('usuario') || h.includes('nombre')) {
        nombre_atleta = strVal;
      } else if (h.includes('fecha')) {
        fecha = strVal.length >= 8 ? strVal.slice(0, 10) : hoyStr;
      } else if (h.includes('hora_entrada') || h === 'entrada') {
        hora_entrada = strVal;
      } else if (h.includes('hora_salida') || h === 'salida') {
        hora_salida = strVal;
      } else if (h.includes('disciplina') || h.includes('area') || h.includes('actividad')) {
        disciplina = strVal;
      } else if (h.includes('estado')) {
        if (strVal.toLowerCase().includes('activo') || strVal.toLowerCase().includes('en sala')) {
          estado_asistencia = 'Activo';
        } else {
          estado_asistencia = 'Finalizado';
        }
      }
    }

    const atletaMatch = personas.find(p => p.datos.cedula === cedula && cedula);
    const atleta_existe = !!atletaMatch;
    if (atletaMatch && !nombre_atleta) {
      nombre_atleta = `${atletaMatch.datos.nombre} ${atletaMatch.datos.apellido}`.trim();
    }

    const status: 'valido' | 'atleta_nuevo' = atleta_existe ? 'valido' : 'atleta_nuevo';

    return {
      _idx: i,
      cedula,
      nombre_atleta: nombre_atleta || 'Atleta Asistente',
      fecha,
      hora_entrada,
      hora_salida,
      disciplina,
      estado_asistencia,
      atleta_existe,
      _status: status,
      _selected: true,
      _raw: Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v)]))
    };
  }).filter(a => a.cedula || a.nombre_atleta);
}

// Extraer texto de documentos Word (.docx)
async function extraerDeWord(arrayBuffer: ArrayBuffer): Promise<PersonaExtraida[]> {
  const result = await mammoth.extractRawText({ arrayBuffer });
  const texto = result.value;
  const personas: PersonaExtraida[] = [];
  const lines = texto.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  let idx = 0;

  for (const line of lines) {
    const cedulaMatch = line.match(/[Vv]-?(\d{6,9})/);
    const telefonoMatch = line.match(/(04\d{2}[\s-]?\d{3}[\s-]?\d{4}|\+58\d{10})/);
    if (cedulaMatch) {
      const rest = line.replace(cedulaMatch[0], '').trim();
      const words = rest.split(/\s+/).filter(w => !/\d{7,}/.test(w));
      const mid = Math.ceil(words.length / 2);
      personas.push({
        _idx: idx++,
        cedula: `V-${cedulaMatch[1]}`,
        nombre: words.slice(0, mid).join(' ') || '',
        apellido: words.slice(mid).join(' ') || '',
        telefono: telefonoMatch ? telefonoMatch[0] : '',
        correo: '',
        fecha_nacimiento: '',
        genero: 'Otro',
        programa: 'Gran Base de Paz - Gimnasio Vertical',
        estado: 'Distrito Capital',
        municipio: 'Libertador',
        _status: 'nuevo',
        _selected: true,
      });
    }
  }

  return personas;
}

// Extraer texto de documentos PDF
function extraerDePDF(arrayBuffer: ArrayBuffer): PersonaExtraida[] {
  const decoder = new TextDecoder('latin1');
  const raw = decoder.decode(arrayBuffer);
  const personas: PersonaExtraida[] = [];
  const streamMatches = raw.match(/\(([^()]{3,200})\)\s*Tj/g) || [];
  const textBits = streamMatches
    .map(m => m.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim())
    .filter(t => t.length > 2);
  const fullText = textBits.join(' ');
  const cedulaMatches = [...fullText.matchAll(/[Vv]-?(\d{6,9})/g)];
  let idx = 0;
  for (const match of cedulaMatches) {
    const pos = fullText.indexOf(match[0]);
    const nearby = fullText.slice(Math.max(0, pos - 80), pos + 120);
    const words = nearby
      .replace(match[0], '')
      .replace(/\d{7,}/g, '')
      .split(/\s+/)
      .filter(w => /^[A-Za-z\u00C0-\u024F]+$/.test(w) && w.length > 1);
    const mid = Math.ceil(words.length / 2);
    personas.push({
      _idx: idx++,
      cedula: `V-${match[1]}`,
      nombre: words.slice(0, mid).join(' '),
      apellido: words.slice(mid).join(' '),
      telefono: '',
      correo: '',
      fecha_nacimiento: '',
      genero: 'Otro',
      programa: 'Gran Base de Paz - Gimnasio Vertical',
      estado: 'Distrito Capital',
      municipio: 'Libertador',
      _status: 'nuevo',
      _selected: true,
    });
  }
  return personas;
}

export const ImportadorView: React.FC<ImportadorViewProps> = ({ sesion }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [tipoImportacion, setTipoImportacion] = useState<TipoImportacion>('personas');
  const [step, setStep] = useState<'idle' | 'preview' | 'done'>('idle');
  const [expandedRaw, setExpandedRaw] = useState<number | null>(null);

  // Estados de datos
  const [personas, setPersonas] = useState<PersonaExtraida[]>([]);
  const [pagos, setPagos] = useState<PagoExtraido[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaExtraida[]>([]);
  const [rawRowsBuffer, setRawRowsBuffer] = useState<Record<string, any>[]>([]);

  // Tasa BCV activa
  const [tasaBcv, setTasaBcv] = useState<number>(() => BcvService.obtenerTasaSincrona().tasa || 36.5);

  // Resultado final
  const [importResult, setImportResult] = useState<{
    total: number;
    nuevos: number;
    actualizados: number;
    atletasCreados: number;
    errores: number;
  } | null>(null);

  // Función para descargar plantillas oficiales de Excel
  const descargarPlantilla = (tipo: TipoImportacion) => {
    let headers: Record<string, string>[] = [];
    let filename = '';

    if (tipo === 'personas') {
      filename = 'Plantilla_Oficial_Atletas.xlsx';
      headers = [
        {
          Cedula: 'V-12345678',
          Nombre: 'Juan Carlos',
          Apellido: 'Pérez Rodríguez',
          Telefono: '0414-1234567',
          Correo: 'juan.perez@correo.com',
          Fecha_Nacimiento: '1995-04-12',
          Genero: 'Masculino',
          Disciplina: 'Musculación / Gimnasio',
          Estado: 'Distrito Capital',
          Municipio: 'Libertador'
        },
        {
          Cedula: 'E-23456789',
          Nombre: 'María González',
          Apellido: 'Torres',
          Telefono: '0412-9876543',
          Correo: 'maria.gonzalez@correo.com',
          Fecha_Nacimiento: '1998-09-25',
          Genero: 'Femenino',
          Disciplina: 'Bailoterapia / Fitness',
          Estado: 'Distrito Capital',
          Municipio: 'Libertador'
        }
      ];
    } else if (tipo === 'pagos') {
      filename = 'Plantilla_Oficial_Pagos_Caja.xlsx';
      headers = [
        {
          Cedula: 'V-12345678',
          Nombre_Atleta: 'Juan Carlos Pérez',
          Monto_Bs: '182.50',
          Monto_USD: '5.00',
          Metodo_Pago: 'Pago Móvil',
          Referencia: '10492837',
          Plan: 'Mensual',
          Concepto: 'Servicio de Maquinas Musculacion',
          Fecha: new Date().toISOString().split('T')[0],
          Estado: 'Distrito Capital'
        },
        {
          Cedula: 'E-23456789',
          Nombre_Atleta: 'María González Torres',
          Monto_Bs: '365.00',
          Monto_USD: '10.00',
          Metodo_Pago: 'Punto de Venta',
          Referencia: 'POS-89302',
          Plan: 'Mensual',
          Concepto: 'Servicio de Spinning',
          Fecha: new Date().toISOString().split('T')[0],
          Estado: 'Distrito Capital'
        }
      ];
    } else if (tipo === 'asistencias') {
      filename = 'Plantilla_Oficial_Asistencias.xlsx';
      headers = [
        {
          Cedula: 'V-12345678',
          Nombre_Atleta: 'Juan Carlos Pérez',
          Fecha: new Date().toISOString().split('T')[0],
          Hora_Entrada: '08:30 AM',
          Hora_Salida: '10:00 AM',
          Disciplina: 'Musculación / Máquinas',
          Estado: 'Finalizado'
        },
        {
          Cedula: 'E-23456789',
          Nombre_Atleta: 'María González Torres',
          Fecha: new Date().toISOString().split('T')[0],
          Hora_Entrada: '09:00 AM',
          Hora_Salida: '10:15 AM',
          Disciplina: 'Bailoterapia',
          Estado: 'Finalizado'
        }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, filename);
  };

  // Re-procesar cuando el usuario cambia manualmente el tipo de importación
  const cambiarTipoManual = (nuevoTipo: TipoImportacion) => {
    setTipoImportacion(nuevoTipo);
    if (rawRowsBuffer.length > 0) {
      if (nuevoTipo === 'personas') {
        const p = parseExcelPersonas(rawRowsBuffer);
        setPersonas(p);
      } else if (nuevoTipo === 'pagos') {
        const p = parseExcelPagos(rawRowsBuffer, tasaBcv);
        setPagos(p);
      } else if (nuevoTipo === 'asistencias') {
        const a = parseExcelAsistencias(rawRowsBuffer);
        setAsistencias(a);
      }
    }
  };

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const buffer = await file.arrayBuffer();

    try {
      if (['xlsx', 'xls'].includes(ext)) {
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        const cleanRows = rows.filter(r => Object.values(r).some(v => String(v).trim() !== ''));
        
        setRawRowsBuffer(cleanRows);
        const tipoDetectado = detectarTipoArchivo(cleanRows);
        setTipoImportacion(tipoDetectado);

        if (tipoDetectado === 'pagos') {
          setPagos(parseExcelPagos(cleanRows, tasaBcv));
        } else if (tipoDetectado === 'asistencias') {
          setAsistencias(parseExcelAsistencias(cleanRows));
        } else {
          setPersonas(parseExcelPersonas(cleanRows));
        }
        return { count: cleanRows.length };
      } else if (['docx', 'doc'].includes(ext)) {
        setTipoImportacion('personas');
        const extracted = await extraerDeWord(buffer);
        setPersonas(extracted);
        return { count: extracted.length };
      } else if (ext === 'pdf') {
        setTipoImportacion('personas');
        const extracted = extraerDePDF(buffer);
        setPersonas(extracted);
        return { count: extracted.length };
      }
      return { count: 0 };
    } catch (err) {
      console.error('Error procesando archivo:', err);
      return { count: 0 };
    }
  }, [tasaBcv]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setIsProcessing(true);
    setImportResult(null);
    setStep('idle');
    const validExts = ['xlsx', 'xls', 'docx', 'doc', 'pdf'];
    const validFiles = Array.from(files).filter(f => validExts.includes(f.name.split('.').pop()?.toLowerCase() || ''));
    if (validFiles.length === 0) {
      setIsProcessing(false);
      return;
    }

    const fileNames: string[] = [];
    let totalFound = 0;
    for (const file of validFiles) {
      const res = await processFile(file);
      totalFound += res.count;
      fileNames.push(file.name);
    }

    setProcessedFiles(fileNames);
    setIsProcessing(false);
    setStep(totalFound > 0 ? 'preview' : 'idle');
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // Confirmar Importación
  const handleConfirmImport = async () => {
    const operador = sesion?.cedula || 'importador';
    const personasExistentes = StorageService.obtenerRegistros('persona');
    let nuevos = 0;
    let actualizados = 0;
    let atletasCreados = 0;
    let errores = 0;

    // Helper: auto-registrar persona si no existe
    const autoRegistrarPersona = (cedula: string, nombreCompleto: string, disciplina: string, estadoGeo: string) => {
      const yaExiste = personasExistentes.find(r => r.datos.cedula === cedula);
      if (yaExiste) return yaExiste;

      const split = splitNombreCompleto(nombreCompleto);
      const nuevaPersona = StorageService.guardarRegistro({
        tipo: 'persona',
        datos: {
          nombre: split.nombre || nombreCompleto,
          apellido: split.apellido || '',
          cedula,
          telefono: '',
          correo: '',
          fecha_nacimiento: '',
          genero: 'Otro',
          programa: disciplina || 'Gran Base de Paz - Gimnasio Vertical',
          disciplina_gbp: disciplina || 'Musculación / Máquinas',
          rol_comunitario: 'Atleta / Beneficiario',
        },
        ubicacion: {
          estado: estadoGeo || sesion?.estado_asignado || 'Distrito Capital',
          municipio: sesion?.municipio_asignado || 'Libertador',
          parroquia: sesion?.parroquia_asignada || 'Sucre (Catia)'
        }
      }, operador);
      atletasCreados++;
      return nuevaPersona;
    };

    if (tipoImportacion === 'personas') {
      const toImport = personas.filter(p => p._selected);
      for (const p of toImport) {
        try {
          const existing = personasExistentes.find(r => r.datos.cedula === p.cedula && p.cedula);
          if (existing && p._status === 'actualizado') {
            StorageService.guardarRegistro({
              ...existing,
              datos: {
                ...existing.datos,
                nombre: p.nombre || existing.datos.nombre,
                apellido: p.apellido || existing.datos.apellido,
                telefono: p.telefono || existing.datos.telefono,
                correo: p.correo || existing.datos.correo,
                programa: p.programa || existing.datos.programa,
              }
            }, operador);
            actualizados++;
          } else if (!existing && p._status === 'nuevo') {
            StorageService.guardarRegistro({
              tipo: 'persona',
              datos: {
                nombre: p.nombre,
                apellido: p.apellido,
                cedula: p.cedula,
                telefono: p.telefono,
                correo: p.correo,
                fecha_nacimiento: p.fecha_nacimiento,
                genero: p.genero,
                programa: p.programa || 'Sin asignar',
                disciplina_gbp: p.programa || 'Musculación',
                rol_comunitario: 'Beneficiario',
              },
              ubicacion: { estado: p.estado, municipio: p.municipio, parroquia: '' },
            }, operador);
            nuevos++;
          }
        } catch {
          errores++;
        }
      }
    } else if (tipoImportacion === 'pagos') {
      const toImport = pagos.filter(p => p._selected);
      for (const p of toImport) {
        try {
          if (!p.atleta_existe && p.cedula) {
            autoRegistrarPersona(p.cedula, p.nombre_atleta, p.servicio, p.estado_geo);
          }
          StorageService.registrarPago({
            usuario_id: p.cedula || `IMP-${Date.now()}`,
            usuario_nombre: p.nombre_atleta,
            usuario_cedula: p.cedula,
            fecha_pago: p.fecha,
            plan: p.plan,
            servicio: p.servicio,
            monto_bs: p.monto_bs,
            monto_usd: p.monto_usd,
            tasa_bcv: tasaBcv,
            metodo_pago: p.metodo_pago,
            referencia: p.referencia,
            estado: 'Activo',
            observaciones: 'Pago importado en lote vía archivo'
          }, operador);
          nuevos++;
        } catch {
          errores++;
        }
      }
    } else if (tipoImportacion === 'asistencias') {
      const toImport = asistencias.filter(a => a._selected);
      for (const a of toImport) {
        try {
          if (!a.atleta_existe && a.cedula) {
            autoRegistrarPersona(a.cedula, a.nombre_atleta, a.disciplina, 'Distrito Capital');
          }
          StorageService.registrarAsistenciaDirecta({
            usuario_id: a.cedula || `IMP-${Date.now()}`,
            usuario_nombre: a.nombre_atleta,
            usuario_cedula: a.cedula,
            disciplina: a.disciplina,
            fecha: a.fecha,
            hora_entrada: a.hora_entrada,
            hora_salida: a.hora_salida,
            estado: a.estado_asistencia,
          }, operador);
          nuevos++;
        } catch {
          errores++;
        }
      }
    }

    setImportResult({
      total: nuevos + actualizados,
      nuevos,
      actualizados,
      atletasCreados,
      errores
    });
    setStep('done');
    window.dispatchEvent(new CustomEvent('mpv-data-updated'));
    window.dispatchEvent(new CustomEvent('mpv-pagos-updated'));
    window.dispatchEvent(new CustomEvent('mpv-asistencia-updated'));
  };

  const handleReset = () => {
    setPersonas([]);
    setPagos([]);
    setAsistencias([]);
    setProcessedFiles([]);
    setRawRowsBuffer([]);
    setImportResult(null);
    setStep('idle');
    if (inputRef.current) inputRef.current.value = '';
  };

  const currentCount =
    tipoImportacion === 'personas' ? personas.length :
    tipoImportacion === 'pagos' ? pagos.length : asistencias.length;

  const selectedCount =
    tipoImportacion === 'personas' ? personas.filter(p => p._selected).length :
    tipoImportacion === 'pagos' ? pagos.filter(p => p._selected).length :
    asistencias.filter(a => a._selected).length;

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={26} style={{ color: 'var(--accent-amber)' }} />
            <span>Importador Inteligente de Archivos</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Procesamiento en lote de Atletas, Pagos de Caja y Asistencias desde Excel (.xlsx), Word o PDF.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {step !== 'idle' && (
            <button onClick={handleReset} className="btn btn-secondary">
              <RefreshCw size={15} /><span>Nueva Carga</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Descarga de Plantillas Oficiales */}
      <div className="card" style={{
        marginBottom: '20px',
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.15) 0%, rgba(17, 24, 39, 0.8) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileSpreadsheet size={22} style={{ color: '#38bdf8' }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
              Plantillas Oficiales de Excel
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Descarga formatos estandarizados para cargar datos sin errores de columna.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => descargarPlantilla('personas')}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} style={{ color: '#60a5fa' }} />
            <span>Plantilla Atletas</span>
          </button>
          <button
            onClick={() => descargarPlantilla('pagos')}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} style={{ color: '#34d399' }} />
            <span>Plantilla Pagos</span>
          </button>
          <button
            onClick={() => descargarPlantilla('asistencias')}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} style={{ color: '#fbbf24' }} />
            <span>Plantilla Asistencias</span>
          </button>
        </div>
      </div>

      {/* Zona de Carga / Drag & Drop */}
      {step === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#f59e0b' : 'rgba(255,255,255,0.14)'}`,
            borderRadius: '16px',
            padding: '60px 40px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)',
            transition: 'all 0.2s ease',
            marginBottom: '24px',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.docx,.doc,.pdf"
            style={{ display: 'none' }}
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
          {isProcessing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <RefreshCw size={40} className="animate-spin" style={{ color: 'var(--accent-amber)' }} />
              <p style={{ color: '#94a3b8', fontSize: '15px' }}>Analizando y extrayendo datos con inteligencia...</p>
            </div>
          ) : (
            <>
              <Upload size={48} style={{ color: '#64748b', margin: '0 auto 16px', display: 'block' }} />
              <p style={{ fontSize: '17px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>
                Arrastra tu archivo aquí o haz clic para seleccionarlo
              </p>
              <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '480px', margin: '0 auto' }}>
                El sistema detectará automáticamente si el archivo contiene Atletas, Pagos de Caja o Asistencias.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1' }}>
                  <FileSpreadsheet size={18} style={{ color: '#34d399' }} />
                  <span>Excel (.xlsx / .xls)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1' }}>
                  <FileText size={18} style={{ color: '#60a5fa' }} />
                  <span>Word (.docx)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1' }}>
                  <File size={18} style={{ color: '#f87171' }} />
                  <span>PDF (.pdf)</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Resultados de Importación */}
      {step === 'done' && importResult && (
        <div className="card" style={{
          marginBottom: '20px', padding: '24px',
          borderColor: 'rgba(16,185,129,0.4)',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,95,70,0.12))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <CheckCircle size={26} style={{ color: '#34d399' }} />
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                ¡Importación Completada Exitosamente!
              </h3>
              <p style={{ fontSize: '12px', color: '#a7f3d0', margin: '2px 0 0 0' }}>
                Los registros se incorporaron a la base de datos local y quedaron listos para sincronizar.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#34d399' }}>{importResult.nuevos}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Nuevos Registrados</div>
            </div>
            {importResult.actualizados > 0 && (
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#60a5fa' }}>{importResult.actualizados}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Actualizados</div>
              </div>
            )}
            {importResult.atletasCreados > 0 && (
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>{importResult.atletasCreados}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Atletas Auto-Creados</div>
              </div>
            )}
            {importResult.errores > 0 && (
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#f87171' }}>{importResult.errores}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Con Errores</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={handleReset} className="btn btn-primary" style={{ padding: '8px 20px' }}>
              <span>Cargar Otro Archivo</span>
            </button>
          </div>
        </div>
      )}

      {/* Vista Previa de Datos */}
      {step === 'preview' && currentCount > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          {/* Barra de Selección de Modo y Selector de Tipo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} style={{ color: '#60a5fa' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Vista Previa ({currentCount} filas detectadas)
                </h3>
              </div>

              {/* Selector manual para cambiar tipo de datos */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Layers size={14} style={{ color: 'var(--accent-amber)' }} />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Tipo:</span>
                <select
                  className="form-select"
                  style={{ padding: '2px 8px', fontSize: '12px', width: 'auto', background: 'transparent', border: 'none', color: '#ffffff', fontWeight: 600 }}
                  value={tipoImportacion}
                  onChange={e => cambiarTipoManual(e.target.value as TipoImportacion)}
                >
                  <option value="personas" style={{ background: '#0f172a' }}>👤 Atletas / Personas</option>
                  <option value="pagos" style={{ background: '#0f172a' }}>💳 Pagos de Caja</option>
                  <option value="asistencias" style={{ background: '#0f172a' }}>⏱️ Control de Asistencia</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  if (tipoImportacion === 'personas') setPersonas(prev => prev.map(p => ({ ...p, _selected: true })));
                  else if (tipoImportacion === 'pagos') setPagos(prev => prev.map(p => ({ ...p, _selected: true })));
                  else setAsistencias(prev => prev.map(a => ({ ...a, _selected: true })));
                }}
                className="btn btn-secondary"
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                Selec. Todo
              </button>
              <button
                onClick={() => {
                  if (tipoImportacion === 'personas') setPersonas(prev => prev.map(p => ({ ...p, _selected: false })));
                  else if (tipoImportacion === 'pagos') setPagos(prev => prev.map(p => ({ ...p, _selected: false })));
                  else setAsistencias(prev => prev.map(a => ({ ...a, _selected: false })));
                }}
                className="btn btn-secondary"
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                Desmarcar
              </button>
            </div>
          </div>

          {/* Tabla de Personas */}
          {tipoImportacion === 'personas' && (
            <div className="table-container" style={{ maxHeight: '460px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '36px' }}>#</th>
                    <th>Estado</th>
                    <th>Cédula</th>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Teléfono</th>
                    <th>Correo</th>
                    <th>Disciplina</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {personas.map(p => (
                    <React.Fragment key={p._idx}>
                      <tr style={{ opacity: p._status === 'duplicado_sin_cambios' ? 0.45 : 1 }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={p._selected}
                            disabled={p._status === 'duplicado_sin_cambios'}
                            onChange={() => setPersonas(prev => prev.map(x => x._idx === p._idx ? { ...x, _selected: !x._selected } : x))}
                          />
                        </td>
                        <td>
                          {p._status === 'nuevo' && <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>Nuevo</span>}
                          {p._status === 'actualizado' && <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>Actualizar</span>}
                          {p._status === 'duplicado_sin_cambios' && <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: 'rgba(148,163,184,0.12)', color: '#64748b' }}>Sin cambios</span>}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0' }}>{p.cedula || '—'}</td>
                        <td>
                          <input
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '12px', minWidth: '100px' }}
                            value={p.nombre}
                            onChange={e => setPersonas(prev => prev.map(x => x._idx === p._idx ? { ...x, nombre: e.target.value } : x))}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '12px', minWidth: '100px' }}
                            value={p.apellido}
                            onChange={e => setPersonas(prev => prev.map(x => x._idx === p._idx ? { ...x, apellido: e.target.value } : x))}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '12px', minWidth: '100px' }}
                            value={p.telefono}
                            onChange={e => setPersonas(prev => prev.map(x => x._idx === p._idx ? { ...x, telefono: e.target.value } : x))}
                          />
                        </td>
                        <td style={{ fontSize: '11px', color: '#94a3b8' }}>{p.correo || '—'}</td>
                        <td style={{ fontSize: '11px', color: '#94a3b8' }}>{p.programa || '—'}</td>
                        <td>
                          <button
                            onClick={() => setPersonas(prev => prev.filter(x => x._idx !== p._idx))}
                            className="btn btn-secondary"
                            style={{ padding: '3px 6px', fontSize: '10px', color: '#f87171' }}
                          >
                            <X size={12} />
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabla de Pagos */}
          {tipoImportacion === 'pagos' && (
            <div className="table-container" style={{ maxHeight: '460px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '36px' }}>#</th>
                    <th>Estado Atleta</th>
                    <th>Cédula</th>
                    <th>Atleta</th>
                    <th>Monto Bs.</th>
                    <th>Monto USD</th>
                    <th>Método</th>
                    <th>Referencia</th>
                    <th>Concepto</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map(p => (
                    <tr key={p._idx}>
                      <td>
                        <input
                          type="checkbox"
                          checked={p._selected}
                          onChange={() => setPagos(prev => prev.map(x => x._idx === p._idx ? { ...x, _selected: !x._selected } : x))}
                        />
                      </td>
                      <td>
                        {p.atleta_existe ? (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>Registrado</span>
                        ) : (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>Auto-crear</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0' }}>{p.cedula || '—'}</td>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>{p.nombre_atleta}</td>
                      <td style={{ color: '#34d399', fontWeight: 700 }}>Bs. {p.monto_bs.toFixed(2)}</td>
                      <td style={{ color: '#60a5fa' }}>$ {p.monto_usd.toFixed(2)}</td>
                      <td>
                        <span style={{ padding: '2px 6px', borderRadius: '6px', fontSize: '10px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
                          {p.metodo_pago}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>{p.referencia}</td>
                      <td style={{ fontSize: '11px', color: '#94a3b8' }}>{p.plan} - {p.servicio}</td>
                      <td style={{ fontSize: '11px', color: '#94a3b8' }}>{p.fecha}</td>
                      <td>
                        <button
                          onClick={() => setPagos(prev => prev.filter(x => x._idx !== p._idx))}
                          className="btn btn-secondary"
                          style={{ padding: '3px 6px', fontSize: '10px', color: '#f87171' }}
                        >
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabla de Asistencias */}
          {tipoImportacion === 'asistencias' && (
            <div className="table-container" style={{ maxHeight: '460px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '36px' }}>#</th>
                    <th>Estado Atleta</th>
                    <th>Cédula</th>
                    <th>Atleta</th>
                    <th>Fecha</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Disciplina</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {asistencias.map(a => (
                    <tr key={a._idx}>
                      <td>
                        <input
                          type="checkbox"
                          checked={a._selected}
                          onChange={() => setAsistencias(prev => prev.map(x => x._idx === a._idx ? { ...x, _selected: !x._selected } : x))}
                        />
                      </td>
                      <td>
                        {a.atleta_existe ? (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>Registrado</span>
                        ) : (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>Auto-crear</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0' }}>{a.cedula || '—'}</td>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>{a.nombre_atleta}</td>
                      <td style={{ fontSize: '11px', color: '#94a3b8' }}>{a.fecha}</td>
                      <td style={{ color: '#38bdf8', fontWeight: 600 }}>{a.hora_entrada}</td>
                      <td style={{ color: '#94a3b8' }}>{a.hora_salida || '—'}</td>
                      <td style={{ fontSize: '11px', color: '#cbd5e1' }}>{a.disciplina}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                          background: a.estado_asistencia === 'Activo' ? 'rgba(56,189,248,0.15)' : 'rgba(16,185,129,0.15)',
                          color: a.estado_asistencia === 'Activo' ? '#38bdf8' : '#34d399'
                        }}>
                          {a.estado_asistencia}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => setAsistencias(prev => prev.filter(x => x._idx !== a._idx))}
                          className="btn btn-secondary"
                          style={{ padding: '3px 6px', fontSize: '10px', color: '#f87171' }}
                        >
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pie de confirmación */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              <strong>{selectedCount}</strong> registro(s) seleccionado(s) para importar
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleReset} className="btn btn-secondary">
                <Trash2 size={14} /><span>Cancelar</span>
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={selectedCount === 0}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '8px 20px' }}
              >
                <CheckCircle size={15} />
                <span>Confirmar e Importar ({selectedCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
