import React, { useState } from 'react';
import { Download, RefreshCw, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { AppRelease, UpdateService } from '../services/updateService';


interface UpdateModalProps {
  release: AppRelease;
  /** Si es true el usuario NO puede cerrar el modal (actualización obligatoria) */
  obligatoria: boolean;
  onClose?: () => void;
}

type Fase = 'aviso' | 'descargando' | 'listo' | 'instalando' | 'error';

export const UpdateModal: React.FC<UpdateModalProps> = ({ release, obligatoria, onClose }) => {
  const [fase, setFase] = useState<Fase>('aviso');
  const [progreso, setProgreso] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [installerPath, setInstallerPath] = useState('');

  const versionInstalada = UpdateService.obtenerVersionInstalada();

  const iniciarDescarga = async () => {
    setFase('descargando');
    setProgreso(0);
    try {
      const ruta = await UpdateService.descargarInstalador(
        release.download_url,
        (pct) => setProgreso(pct)
      );
      setInstallerPath(ruta);
      setFase('listo');
    } catch (e: any) {
      setErrorMsg(e.message || 'Error desconocido al descargar.');
      setFase('error');
    }
  };

  const instalarAhora = async () => {
    setFase('instalando');
    // Persistir la versión que se va a instalar para que al reiniciar
    // el sistema reconozca inmediatamente la nueva versión aplicada
    UpdateService.marcarVersionInstalada(release.version);
    await UpdateService.lanzarInstalador(installerPath);
  };


  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0d1b35 0%, #0a0f1d 100%)',
        border: '1px solid #1e3a5f',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '520px',
        width: '90%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(96,165,250,0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* glow de fondo */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 200, height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Botón cerrar si no es obligatoria */}
        {!obligatoria && onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#94a3b8', transition: 'all 0.2s',
              zIndex: 10
            }}
            title="Cerrar y actualizar más tarde"
          >
            <X size={16} />
          </button>
        )}

        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
          }}>
            <Download size={26} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>
              Nueva versión disponible
            </h2>
            <span style={{
              display: 'inline-block', marginTop: 4,
              background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              padding: '2px 10px', borderRadius: 20,
            }}>
              v{release.version}
            </span>
          </div>
        </div>

        {obligatoria && (
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 20,
          }}>
            <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#fbbf24' }}>
              Esta actualización es <strong>obligatoria</strong>. Debes instalarla para continuar usando la aplicación.
            </span>
          </div>
        )}

        {/* Título */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 600, color: '#60a5fa' }}>
            {release.titulo}
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '12px 16px',
            maxHeight: 160, overflowY: 'auto',
          }}>
            <pre style={{
              margin: 0, fontFamily: 'inherit', fontSize: 13,
              color: '#cbd5e1', whiteSpace: 'pre-wrap', lineHeight: 1.7,
            }}>{release.notas}</pre>
          </div>
        </div>

        {/* Fase: aviso */}
        {fase === 'aviso' && (
          <button
            onClick={iniciarDescarga}
            style={{
              width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              border: 'none', borderRadius: 12, cursor: 'pointer',
              color: '#fff', fontSize: 15, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Download size={18} />
            Actualizar ahora
          </button>
        )}

        {/* Fase: aviso y no obligatoria: botón posponer */}
        {fase === 'aviso' && !obligatoria && onClose && (
          <button
            onClick={onClose}
            style={{
              width: '100%', marginTop: '10px', padding: '10px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, cursor: 'pointer',
              color: '#94a3b8', fontSize: 13, fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Recordarme más tarde
          </button>
        )}

        {/* Fase: descargando */}
        {fase === 'descargando' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Loader2 size={18} color="#60a5fa" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ color: '#94a3b8', fontSize: 14 }}>
                Descargando actualización… {progreso}%
              </span>
            </div>
            <div style={{
              height: 10, background: 'rgba(255,255,255,0.08)',
              borderRadius: 20, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${progreso}%`,
                background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                borderRadius: 20,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ margin: '10px 0 0 0', fontSize: 12, color: '#64748b', textAlign: 'center' }}>
              No cierre la aplicación durante la descarga
            </p>
          </div>
        )}

        {/* Fase: listo para instalar */}
        {fase === 'listo' && (
          <div>
            <div style={{
              display: 'flex', gap: 10, alignItems: 'center',
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            }}>
              <CheckCircle2 size={18} color="#10b981" />
              <span style={{ fontSize: 14, color: '#34d399' }}>
                ¡Descarga completa! Haz clic para instalar.
              </span>
            </div>
            <button
              onClick={instalarAhora}
              style={{
                width: '100%', padding: '13px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none', borderRadius: 12, cursor: 'pointer',
                color: '#fff', fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
              }}
            >
              <RefreshCw size={18} />
              Reemplazar ejecutable y reiniciar
            </button>
          </div>
        )}

        {/* Fase: instalando / reemplazando */}
        {fase === 'instalando' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <Loader2 size={32} color="#10b981" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: 16, color: '#f1f5f9' }}>
              Reemplazando ejecutable...
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              La aplicación se reiniciará automáticamente con la nueva versión v{release.version}.
            </p>
          </div>
        )}

        {/* Fase: error */}
        {fase === 'error' && (
          <div>
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              color: '#fca5a5', fontSize: 13,
            }}>
              <strong>Error:</strong> {errorMsg}
            </div>
            <button
              onClick={iniciarDescarga}
              style={{
                width: '100%', padding: '12px',
                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 12, cursor: 'pointer', color: '#fca5a5', fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <RefreshCw size={16} />
              Reintentar descarga
            </button>
          </div>
        )}

        <p style={{ margin: '16px 0 0 0', fontSize: 11, color: '#475569', textAlign: 'center' }}>
          Versión instalada: v{versionInstalada} → v{release.version}
        </p>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};
