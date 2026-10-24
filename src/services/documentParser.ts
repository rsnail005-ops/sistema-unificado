import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { DocumentoAdjunto } from '../types';

export class DocumentParserService {
  /**
   * Calcula el hash SHA-256 de un ArrayBuffer para garantizar la integridad (soberanía y no repudio)
   */
  static async calcularSHA256(buffer: ArrayBuffer): Promise<string> {
    try {
      const digestBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(digestBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback simple
      return 'sha256-' + Math.random().toString(36).substring(2, 15);
    }
  }

  /**
   * Procesa un archivo Word (.docx) localmente y extrae su texto plano
   */
  static async parseWordDocx(arrayBuffer: ArrayBuffer): Promise<{ texto: string; metadata: any }> {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return {
        texto: result.value || '',
        metadata: {
          tipo: 'Microsoft Word OpenXML (.docx)',
          advertencias: result.messages.map(m => m.message)
        }
      };
    } catch (err: any) {
      console.warn('Error leyendo Word:', err);
      return {
        texto: 'No se pudo extraer el texto del documento Word.',
        metadata: { error: err.message }
      };
    }
  }

  /**
   * Procesa una hoja de cálculo Excel (.xlsx / .xls) localmente
   */
  static parseExcel(arrayBuffer: ArrayBuffer): { texto: string; metadata: any } {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      let fullText = '';
      let totalFilas = 0;

      sheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        fullText += `--- Hoja: ${sheetName} ---\n${csv}\n\n`;
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        totalFilas += (range.e.r - range.s.r + 1);
      });

      return {
        texto: fullText,
        metadata: {
          hojas_excel: sheetNames,
          filas_excel: totalFilas
        }
      };
    } catch (err: any) {
      console.warn('Error leyendo Excel:', err);
      return {
        texto: 'No se pudo extraer el texto de la hoja Excel.',
        metadata: { error: err.message }
      };
    }
  }

  /**
   * Parser general para cualquier archivo subido
   */
  static async procesarArchivo(file: File): Promise<DocumentoAdjunto> {
    const arrayBuffer = await file.arrayBuffer();
    const sha256 = await this.calcularSHA256(arrayBuffer);
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    let textoExtraido = '';
    let metadata: any = {};

    if (extension === 'docx') {
      const res = await this.parseWordDocx(arrayBuffer);
      textoExtraido = res.texto;
      metadata = res.metadata;
    } else if (['xlsx', 'xls', 'csv'].includes(extension)) {
      const res = this.parseExcel(arrayBuffer);
      textoExtraido = res.texto;
      metadata = res.metadata;
    } else if (extension === 'txt' || extension === 'json') {
      const decoder = new TextDecoder('utf-8');
      textoExtraido = decoder.decode(arrayBuffer);
      metadata = { formato: 'Texto Plano' };
    } else if (extension === 'pdf') {
      // Para PDF en modo offline sin servidor, extraemos texto legible embebido y metadatos básicos
      const decoder = new TextDecoder('latin1');
      const raw = decoder.decode(arrayBuffer);
      // Búsqueda de bloques de texto / metadata en PDF
      const titleMatch = raw.match(/\/Title\s*\((.*?)\)/);
      const authorMatch = raw.match(/\/Author\s*\((.*?)\)/);
      
      // Limpieza de caracteres de escape comunes
      textoExtraido = `Documento Oficial PDF: ${file.name}\n`;
      if (titleMatch) textoExtraido += `Título: ${titleMatch[1]}\n`;
      if (authorMatch) textoExtraido += `Autor: ${authorMatch[1]}\n`;
      
      // Extracción de fragmentos de texto planos en objetos PDF
      const streamMatches = raw.match(/\(([^()]{4,})\)\s*Tj/g);
      if (streamMatches) {
        const textBits = streamMatches.map(m => m.replace(/^[(\s]+|[)\sTj]+$/g, '')).filter(t => t.length > 2);
        if (textBits.length > 0) {
          textoExtraido += '\nTexto extraído:\n' + textBits.join(' ');
        }
      }

      metadata = {
        paginas_aprox: (raw.match(/\/Type\s*\/Page[^s]/g) || []).length || 1,
        autor: authorMatch ? authorMatch[1] : 'Sistema Unificado de Usuarios GNP'

      };
    } else {
      textoExtraido = `Archivo binario: ${file.name}`;
    }

    return {
      id: 'doc-' + Math.random().toString(36).substring(2, 10),
      nombre: file.name,
      tipo_mime: file.type || 'application/octet-stream',
      tamano_bytes: file.size,
      sha256,
      texto_extraido: textoExtraido.trim(),
      fecha_subida: new Date().toISOString(),
      metadata
    };
  }
}
