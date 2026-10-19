import React, { useState, useEffect } from 'react';
import { FileText, UploadCloud, Search, Eye, Trash2, FileSpreadsheet, FileCode, ShieldCheck } from 'lucide-react';
import { StorageService } from '../services/storage';
import { DocumentParserService } from '../services/documentParser';
import { DocumentoAdjunto, UsuarioSesion, Registro } from '../types';

interface DocumentosViewProps {
  sesion: UsuarioSesion | null;
}

export const DocumentosView: React.FC<DocumentosViewProps> = ({ sesion }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentoAdjunto | null>(null);

  // Lista reactiva de documentos
  const [registrosDocs, setRegistrosDocs] = useState<Registro[]>(() =>
    StorageService.obtenerRegistros('documento')
  );

  const recargarDocs = () => {
    setRegistrosDocs(StorageService.obtenerRegistros('documento'));
  };

  useEffect(() => {
    window.addEventListener('mpv-data-updated', recargarDocs);
    return () => {
      window.removeEventListener('mpv-data-updated', recargarDocs);
    };
  }, []);

  // Aplanar todos los documentos
  const todosLosDocs: { regId: string; doc: DocumentoAdjunto; estado: string }[] = [];
  registrosDocs.forEach(r => {
    (r.documentos || []).forEach(d => {
      todosLosDocs.push({
        regId: r.id,
        doc: d,
        estado: r.ubicacion.estado
      });
    });
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsedDoc = await DocumentParserService.procesarArchivo(file);

        StorageService.guardarRegistro({
          tipo: 'documento',
          datos: {
            titulo: file.name,
            tamano_kb: (file.size / 1024).toFixed(1),
            extension: file.name.split('.').pop()?.toUpperCase()
          },
          documentos: [parsedDoc],
          ubicacion: {
            estado: sesion?.estado_asignado || 'Distrito Capital',
            municipio: 'Libertador',
            parroquia: 'Sucre'
          }
        }, sesion?.cedula || 'V-00000000');

      } catch (err) {
        console.error('Error procesando archivo:', err);
        alert(`Error al procesar el archivo ${file.name}`);
      }
    }

    setRegistrosDocs(StorageService.obtenerRegistros('documento'));
    setIsProcessing(false);
    e.target.value = '';
  };

  const handleEliminarDoc = (regId: string) => {
    if (confirm('¿Desea eliminar este documento?')) {
      StorageService.eliminarRegistro(regId, sesion?.cedula || 'V-00000000');
      setRegistrosDocs(StorageService.obtenerRegistros('documento'));
    }
  };

  const getDocIcon = (nombre: string) => {
    const ext = nombre.split('.').pop()?.toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet size={22} style={{ color: '#10b981' }} />;
    }
    if (ext === 'docx' || ext === 'doc') {
      return <FileText size={22} style={{ color: '#3b82f6' }} />;
    }
    if (ext === 'pdf') {
      return <FileCode size={22} style={{ color: '#ef4444' }} />;
    }
    return <FileText size={22} style={{ color: '#94a3b8' }} />;
  };

  const filtrados = todosLosDocs.filter(item => {
    const term = searchTerm.toLowerCase();
    const nombreMatch = item.doc.nombre.toLowerCase().includes(term);
    const textoMatch = (item.doc.texto_extraido || '').toLowerCase().includes(term);
    const hashMatch = (item.doc.sha256 || '').toLowerCase().includes(term);
    return nombreMatch || textoMatch || hashMatch;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={26} style={{ color: 'var(--accent-blue-light)' }} />
            <span>Documentos</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Búsqueda e indexación de archivos, actas e informes.
          </p>
        </div>

        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
          <UploadCloud size={16} />
          <span>{isProcessing ? 'Procesando...' : 'Subir Documento'}</span>
          <input
            type="file"
            multiple
            accept=".docx,.doc,.xlsx,.xls,.csv,.pdf,.txt"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            disabled={isProcessing}
          />
        </label>
      </div>

      {/* Buscador */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, texto o contenido de los documentos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '38px', fontSize: '14px' }}
          />
        </div>
        {searchTerm && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
            {filtrados.length} resultado(s) encontrado(s).
          </div>
        )}
      </div>

      {/* Lista de Documentos */}
      <div className="grid-2">
        {filtrados.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <FileText size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <p>No se encontraron documentos.</p>
          </div>
        ) : (
          filtrados.map(item => (
            <div key={item.doc.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  {getDocIcon(item.doc.nombre)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.doc.nombre}>
                    {item.doc.nombre}
                  </h4>
                  <p style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    {(item.doc.tamano_bytes / 1024).toFixed(1)} KB • {new Date(item.doc.fecha_subida).toLocaleDateString('es-VE')}
                  </p>
                </div>

                <span className="status-pill status-online" style={{ padding: '2px 8px', fontSize: '10px' }}>
                  Indexado
                </span>
              </div>

              {/* Fragmento de texto */}
              <div style={{ padding: '10px', background: 'rgba(10, 15, 29, 0.7)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '12px', flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Vista previa:
                </div>
                <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.4, maxHeight: '64px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.doc.texto_extraido || 'Sin texto extraído.'}
                </p>
              </div>

              {/* Integridad */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
                <ShieldCheck size={13} style={{ color: '#10b981' }} />
                <span style={{ fontFamily: 'monospace' }}>SHA256: {item.doc.sha256?.substring(0, 16)}...</span>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setSelectedDoc(item.doc)}
                  className="btn btn-secondary"
                  style={{ padding: '5px 10px', fontSize: '12px' }}
                >
                  <Eye size={13} />
                  <span>Ver Contenido</span>
                </button>

                <button
                  onClick={() => handleEliminarDoc(item.regId)}
                  className="btn btn-danger"
                  style={{ padding: '5px 8px' }}
                  title="Eliminar documento"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Visor de Documento */}
      {selectedDoc && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {getDocIcon(selectedDoc.nombre)}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>{selectedDoc.nombre}</h3>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>SHA-256: {selectedDoc.sha256}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="btn btn-secondary" style={{ padding: '4px 10px' }}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Tamaño:</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{(selectedDoc.tamano_bytes / 1024).toFixed(1)} KB</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Tipo:</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{selectedDoc.tipo_mime}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Fecha:</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{new Date(selectedDoc.fecha_subida).toLocaleString('es-VE')}</div>
                </div>
              </div>

              <label className="form-label" style={{ color: '#93c5fd' }}>
                Contenido del Documento:
              </label>
              <textarea
                readOnly
                rows={14}
                value={selectedDoc.texto_extraido}
                className="form-textarea"
                style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.5, background: 'rgba(7, 10, 20, 0.9)' }}
              />
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedDoc(null)} className="btn btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
