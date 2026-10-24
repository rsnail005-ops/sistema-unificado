import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Clock, Play, Server, Zap, Activity, Database, Globe, Wifi, WifiOff, XCircle } from 'lucide-react';
import { StorageService } from '../services/storage';
import { SupabaseService, ServerStatusInfo, SyncResult } from '../services/supabase';
import { SyncItem, UsuarioSesion } from '../types';

interface SyncQueueViewProps {
  sesion: UsuarioSesion | null;
}


export const SyncQueueView: React.FC<SyncQueueViewProps> = ({ sesion }) => {
  const [queue, setQueue] = useState<SyncItem[]>(() => StorageService.obtenerColaSync());
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeConflict, setActiveConflict] = useState<SyncItem | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatusInfo | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [detailItem, setDetailItem] = useState<SyncItem | null>(null);



  const recargar = () => {
    setQueue(StorageService.obtenerColaSync());
  };

  useEffect(() => {
    window.addEventListener('mpv-sync-updated', recargar);
    window.addEventListener('mpv-data-updated', recargar);
    checkServerStatus();
    return () => {
      window.removeEventListener('mpv-sync-updated', recargar);
      window.removeEventListener('mpv-data-updated', recargar);
    };
  }, []);

  const pendientes = queue.filter(q => q.estado === 'pendiente');
  const conflictos = queue.filter(q => q.estado === 'conflicto');
  const sincronizados = queue.filter(q => q.estado === 'sincronizado');
  const errores = queue.filter(q => q.estado === 'error');
  const sincronizando = queue.filter(q => q.estado === 'sincronizando');

  const checkServerStatus = async () => {
    setIsCheckingServer(true);
    const status = await SupabaseService.checkConnection();
    setServerStatus(status);
    setIsCheckingServer(false);
  };

  const handleManualSync = async () => {
    setIsProcessing(true);
    await StorageService.procesarColaSincronizacion();
    setQueue(StorageService.obtenerColaSync());
    setIsProcessing(false);
  };

  const handleResolver = (decision: 'local_gana' | 'servidor_gana') => {
    if (!activeConflict) return;
    StorageService.resolverConflicto(activeConflict.id, decision);
    setQueue(StorageService.obtenerColaSync());
    setActiveConflict(null);
  };



  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RefreshCw size={26} style={{ color: 'var(--accent-amber)' }} />
            <span>Sincronización y Estado del Servidor</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Monitoreo en tiempo real, cola de transacciones y registro de actividad.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={checkServerStatus}
            disabled={isCheckingServer}
            className="btn btn-secondary"
          >
            <Server size={15} className={isCheckingServer ? 'animate-spin' : ''} />
            <span>{isCheckingServer ? 'Verificando...' : 'Verificar Servidor'}</span>
          </button>
          <button
            onClick={handleManualSync}
            disabled={isProcessing || pendientes.length === 0}
            className="btn btn-primary"
          >
            <Play size={15} className={isProcessing ? 'animate-spin' : ''} />
            <span>{isProcessing ? 'Procesando...' : `Sincronizar (${pendientes.length})`}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════ PANEL DE ESTADO DEL SERVIDOR ═══════════════ */}
      <div className="card" style={{ 
        marginBottom: '20px', 
        padding: '20px',
        borderColor: serverStatus?.ok ? 'rgba(16,185,129,0.3)' : serverStatus ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)',
        background: serverStatus?.ok 
          ? 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(6,95,70,0.08))'
          : serverStatus 
          ? 'linear-gradient(135deg, rgba(239,68,68,0.05), rgba(127,29,29,0.08))'
          : undefined
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Server size={18} style={{ color: serverStatus?.ok ? '#34d399' : serverStatus ? '#f87171' : '#94a3b8' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>Estado del Servidor Supabase</h3>
          {serverStatus && (
            <span style={{
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              background: serverStatus.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              color: serverStatus.ok ? '#34d399' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: serverStatus.ok ? '#34d399' : '#f87171',
                boxShadow: serverStatus.ok ? '0 0 8px #34d399' : '0 0 8px #f87171',
                animation: serverStatus.ok ? 'pulse 2s infinite' : 'none'
              }} />
              {serverStatus.ok ? 'EN LÍNEA' : 'SIN CONEXIÓN'}
            </span>
          )}
        </div>

        {serverStatus ? (
          <div className="grid-2" style={{ gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={14} style={{ color: '#94a3b8' }} />
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>URL:</span>
                <span style={{ fontSize: '12px', color: '#cbd5e1', fontFamily: 'monospace', wordBreak: 'break-all' }}>{serverStatus.url}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={14} style={{ color: '#94a3b8' }} />
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Latencia:</span>
                <span style={{ 
                  fontSize: '12px', fontWeight: 700,
                  color: serverStatus.latencyMs < 200 ? '#34d399' : serverStatus.latencyMs < 500 ? '#fbbf24' : '#f87171'
                }}>
                  {serverStatus.latencyMs} ms
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {serverStatus.version && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={14} style={{ color: '#94a3b8' }} />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Motor:</span>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{serverStatus.version}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} style={{ color: '#94a3b8' }} />
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Última verificación:</span>
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{serverStatus.timestamp}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={14} />
            <span>Presione "Verificar Servidor" para comprobar la conectividad.</span>
          </div>
        )}

        {serverStatus && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '12px', color: serverStatus.ok ? '#86efac' : '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {serverStatus.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {serverStatus.message}
          </div>
        )}
      </div>

      {/* ═══════════════ INDICADORES DE LA COLA ═══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Pendientes</span>
            <Clock size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
            {pendientes.length}
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>En Proceso</span>
            <RefreshCw size={16} style={{ color: '#60a5fa' }} className={sincronizando.length > 0 ? 'animate-spin' : ''} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>
            {sincronizando.length}
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Conflictos</span>
            <AlertTriangle size={16} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>
            {conflictos.length}
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Errores</span>
            <XCircle size={16} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fb7185', marginTop: '4px' }}>
            {errores.length}
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Sincronizados</span>
            <CheckCircle size={16} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {sincronizados.length}
          </div>
        </div>
      </div>



      {/* ═══════════════ BANDEJA DE CONFLICTOS ACTIVOS ═══════════════ */}
      {conflictos.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)', marginBottom: '20px' }}>
          <h4 style={{ color: '#f87171', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={18} />
            <span>Conflictos pendientes de resolución</span>
          </h4>
          <p style={{ color: '#cbd5e1', fontSize: '12.5px', marginBottom: '14px' }}>
            Se detectaron diferencias entre los datos locales y remotos para los siguientes registros:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {conflictos.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(10, 15, 29, 0.8)', borderRadius: '8px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '13px' }}>
                    Registro ID: {c.registro_id} ({c.operacion})
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {c.error_detalle || 'Discrepancia detectada'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setActiveConflict(c); }}
                    className="btn btn-amber"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Resolver
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL DE RESOLUCIÓN DE CONFLICTO ═══════════════ */}
      {activeConflict && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                <span>Resolución de Conflicto</span>
              </h3>
              <button onClick={() => setActiveConflict(null)} className="btn btn-secondary" style={{ padding: '4px 10px' }}>✕</button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '16px' }}>
                Seleccione la versión que debe prevalecer:
              </p>

              <div className="grid-2" style={{ marginBottom: '16px' }}>
                <div style={{ padding: '12px', background: 'rgba(37, 99, 235, 0.08)', borderRadius: '8px', border: '1px solid rgba(37, 99, 235, 0.3)' }}>
                  <h5 style={{ color: '#60a5fa', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                    Versión Local
                  </h5>
                  <pre style={{ fontSize: '11px', color: '#cbd5e1', overflowX: 'auto' }}>
                    {JSON.stringify(activeConflict.payload, null, 2)}
                  </pre>
                </div>

                <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <h5 style={{ color: '#fbbf24', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                    Versión del Servidor
                  </h5>
                  <pre style={{ fontSize: '11px', color: '#cbd5e1', overflowX: 'auto' }}>
                    {JSON.stringify({ ...activeConflict.payload, origen: 'Servidor' }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => handleResolver('servidor_gana')} className="btn btn-secondary">
                Usar Versión del Servidor
              </button>
              <button onClick={() => handleResolver('local_gana')} className="btn btn-primary">
                Mantener Versión Local
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL DE DETALLE DE REGISTRO ═══════════════ */}
      {detailItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} style={{ color: '#60a5fa' }} />
                <span>Detalle del Registro Enviado</span>
              </h3>
              <button onClick={() => setDetailItem(null)} className="btn btn-secondary" style={{ padding: '4px 10px' }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>ID Sync:</span>
                <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{detailItem.id}</span>

                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Registro:</span>
                <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{detailItem.registro_id}</span>

                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Operación:</span>
                <span style={{ color: detailItem.operacion === 'INSERT' ? '#34d399' : detailItem.operacion === 'UPDATE' ? '#60a5fa' : '#f87171', fontWeight: 700 }}>
                  {detailItem.operacion}
                </span>

                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Tipo:</span>
                <span style={{ color: '#e2e8f0' }}>{detailItem.tipo_entidad || 'registro'}</span>

                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Resumen:</span>
                <span style={{ color: '#e2e8f0' }}>{detailItem.resumen || '—'}</span>

                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Estado:</span>
                <span style={{ color: detailItem.estado === 'sincronizado' ? '#34d399' : detailItem.estado === 'error' ? '#f87171' : '#fbbf24', fontWeight: 700 }}>
                  {detailItem.estado.toUpperCase()}
                </span>

                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Creado en:</span>
                <span style={{ color: '#e2e8f0' }}>{new Date(detailItem.creado_en).toLocaleString('es-VE')}</span>

                {detailItem.hora_sincronizado && (
                  <>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>Sincronizado:</span>
                    <span style={{ color: '#34d399' }}>{new Date(detailItem.hora_sincronizado).toLocaleString('es-VE')}</span>
                  </>
                )}

                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Intentos:</span>
                <span style={{ color: '#e2e8f0' }}>{detailItem.intentos}</span>

                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Servidor:</span>
                <span style={{ color: '#e2e8f0', fontSize: '11px' }}>{detailItem.servidor_destino || 'Supabase Cloud'}</span>

                {detailItem.error_detalle && (
                  <>
                    <span style={{ color: '#f87171', fontWeight: 600 }}>Detalle Error:</span>
                    <span style={{ color: '#fca5a5', fontSize: '11px' }}>{detailItem.error_detalle}</span>
                  </>
                )}
              </div>

              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Payload Enviado:</div>
                <pre style={{
                  fontSize: '11px',
                  color: '#cbd5e1',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '12px',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {JSON.stringify(detailItem.payload, null, 2)}
                </pre>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDetailItem(null)} className="btn btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
