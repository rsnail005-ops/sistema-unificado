import React, { useState, useEffect } from 'react';
import { ShieldAlert, Download, Search, UserCheck } from 'lucide-react';
import { StorageService } from '../services/storage';
import { AuditLogEntry } from '../types';

export const AuditView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => StorageService.obtenerAuditoria());

  const recargar = () => {
    setAuditLogs(StorageService.obtenerAuditoria());
  };

  useEffect(() => {
    window.addEventListener('mpv-data-updated', recargar);
    return () => {
      window.removeEventListener('mpv-data-updated', recargar);
    };
  }, []);

  const handleExportarLog = () => {
    const jsonStr = JSON.stringify(auditLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtrados = auditLogs.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      log.operador_cedula.toLowerCase().includes(term) ||
      log.accion.toLowerCase().includes(term) ||
      log.detalles.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={26} style={{ color: '#10b981' }} />
            <span>Registro de Auditoría</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Historial y trazabilidad de operaciones realizadas en el sistema.
          </p>
        </div>

        <button onClick={handleExportarLog} className="btn btn-secondary">
          <Download size={15} />
          <span>Exportar JSON</span>
        </button>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Filtrar por cédula, acción o detalle..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '38px' }}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Operador</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No hay registros de auditoría que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filtrados.map(log => (
                <tr key={log.id}>
                  <td>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {new Date(log.fecha).toLocaleString('es-VE')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={14} style={{ color: '#3b82f6' }} />
                      <span style={{ fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace' }}>
                        {log.operador_cedula}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: 'rgba(255,255,255,0.05)',
                      color: '#f8fafc',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {log.accion}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      {log.entidad_tipo}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {log.detalles}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
