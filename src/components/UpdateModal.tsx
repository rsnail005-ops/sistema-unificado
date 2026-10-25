import React, { useState, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  Folder,
  FolderOpen,
  ExternalLink,
  HardDrive
} from 'lucide-react';
import { AppRelease, UpdateService } from '../services/updateService';
import { StorageService } from '../services/storage';

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
  const [targetFolder, setTargetFolder] = useState<string>('');
  const [defaultDirs, setDefaultDirs] = useState<{
    currentDir: string;
    currentExe: string;
    downloadsDir: string;
    desktopDir: string;
    tempDir: string;
  } | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{
    path: string;
    targetFolder: string;
    fileName: string;
  } | null>(null);

  const versionInstalada = UpdateService.obtenerVersionInstalada();

  // Al montar, detectar la carpeta actual donde corre la app y carpetas del sistema
  useEffect(() => {
    let isMounted = true;
    UpdateService.obtenerCarpetasPorDefecto().then((dirs) => {
      if (isMounted && dirs) {
        setDefaultDirs(dirs);
        // Por defecto usar la carpeta donde reside el ejecutable actual
        setTargetFolder(dirs.currentDir || dirs.desktopDir || '');
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const elegirCarpeta = async () => {
    const seleccionada = await UpdateService.seleccionarCarpeta(targetFolder || defaultDirs?.currentDir);
    if (seleccionada) {
      setTargetFolder(seleccionada);
    }
  };

  const abrirUbicacion = async (ruta: string) => {
    await UpdateService.abrirCarpeta(ruta);
  };

  const iniciarDescarga = async () => {
    setFase('descargando');
    setProgreso(0);
    setErrorMsg('');
    try {
      const res = await UpdateService.descargarInstalador(
        release.download_url,
        (pct) => setProgreso(pct),
        release.fileName,
        targetFolder
      );
      setInstallerPath(res.path);
      setDownloadInfo(res);
      if (res.targetFolder) {
        setTargetFolder(res.targetFolder);
      }
      setFase('listo');
    } catch (e: any) {
      setErrorMsg(e.message || 'Error desconocido al descargar.');
      setFase('error');
    }
  };

  const instalarAhora = async () => {
    setFase('instalando');
    setErrorMsg('');

    // Persistir la versión que se va a instalar para que al reiniciar
    // el sistema reconozca inmediatamente la nueva versión aplicada
    UpdateService.marcarVersionInstalada(release.version);

    try {
      localStorage.removeItem('mpv_supabase_auth_token');
      localStorage.removeItem('mpv_supabase_refresh_token');
    } catch {}

    try {
      await UpdateService.lanzarInstalador(
        installerPath,
        release.version,
        release.isSetup,
        release.fileName,
        targetFolder
      );

      // Cierre forzoso de sesión tras despachar el reemplazo
      StorageService.cerrarSesion();
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo iniciar el reemplazo del ejecutable.');
      setFase('error');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 10, 20, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #0d1b35 0%, #080d1a 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '24px',
          padding: '36px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 40px rgba(37,99,235,0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow ambiental */}
        <div
          style={{
            position: 'absolute',
            top: -70,
            right: -70,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Botón cerrar si no es obligatoria */}
        {!obligatoria && onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94a3b8',
              transition: 'all 0.2s',
              zIndex: 10,
            }}
            title="Cerrar y actualizar más tarde"
          >
            <X size={16} />
          </button>
        )}

        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(37,99,235,0.45)',
              flexShrink: 0,
            }}
          >
            <Download size={26} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>
              Nueva versión disponible
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span
                style={{
                  background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: 20,
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                }}
              >
                v{release.version}
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                (Actual: v{versionInstalada})
              </span>
            </div>
          </div>
        </div>

        {obligatoria && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.35)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 18,
            }}
          >
            <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: '#fbbf24', lineHeight: 1.5 }}>
              Esta actualización es <strong>obligatoria</strong> para garantizar la seguridad y sincronización con el servidor.
            </span>
          </div>
        )}

        {/* Título y Notas de versión */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 600, color: '#60a5fa' }}>
            {release.titulo}
          </p>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              padding: '12px 14px',
              maxHeight: 120,
              overflowY: 'auto',
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: 'inherit',
                fontSize: 12.5,
                color: '#cbd5e1',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
              }}
            >
              {release.notas || 'Mejoras de rendimiento y correcciones del sistema.'}
            </pre>
          </div>
        </div>

        {/* Selector de Carpeta de Destino */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Folder size={16} color="#60a5fa" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                Carpeta de destino de la actualización:
              </span>
            </div>
            {fase !== 'descargando' && fase !== 'instalando' && (
              <button
                type="button"
                onClick={elegirCarpeta}
                style={{
                  background: 'rgba(37, 99, 235, 0.18)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: 8,
                  padding: '4px 10px',
                  color: '#93c5fd',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(37, 99, 235, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(37, 99, 235, 0.18)';
                }}
              >
                <FolderOpen size={13} />
                Seleccionar carpeta
              </button>
            )}
          </div>

          <div
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <HardDrive size={15} color="#94a3b8" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: targetFolder ? '#38bdf8' : '#94a3b8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
              }}
              title={targetFolder || 'Cargando carpeta...'}
            >
              {targetFolder || 'Detectando carpeta de la aplicación...'}
            </span>
          </div>
          <p
            style={{
              margin: '7px 0 0 0',
              fontSize: 11,
              color: '#64748b',
              lineHeight: 1.4,
            }}
          >
            La nueva versión se descargará, reemplazará e iniciará desde esta ubicación.
          </p>
        </div>

        {/* FASE: aviso */}
        {fase === 'aviso' && (
          <div>
            <button
              onClick={iniciarDescarga}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                border: 'none',
                borderRadius: 14,
                cursor: 'pointer',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <Download size={18} />
              Descargar y Actualizar
            </button>

            {!obligatoria && onClose && (
              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Recordarme más tarde
              </button>
            )}
          </div>
        )}

        {/* FASE: descargando */}
        {fase === 'descargando' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Loader2 size={18} color="#60a5fa" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>
                  Descargando actualización…
                </span>
              </div>
              <span style={{ color: '#60a5fa', fontSize: 15, fontWeight: 700 }}>
                {progreso}%
              </span>
            </div>

            <div
              style={{
                height: 10,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progreso}%`,
                  background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                  borderRadius: 20,
                  transition: 'width 0.3s ease',
                  boxShadow: '0 0 12px rgba(96,165,250,0.5)',
                }}
              />
            </div>

            <p style={{ margin: '12px 0 0 0', fontSize: 12, color: '#64748b', textAlign: 'center' }}>
              Por favor no cierre la aplicación durante la descarga...
            </p>
          </div>
        )}

        {/* FASE: listo para instalar */}
        {fase === 'listo' && (
          <div>
            <div
              style={{
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 14,
                padding: '14px',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <CheckCircle2 size={20} color="#10b981" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>
                  ¡Descarga completada y verificada!
                </span>
              </div>

              {downloadInfo && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  <div>
                    <strong style={{ color: '#cbd5e1' }}>Archivo:</strong> {downloadInfo.fileName}
                  </div>
                  <div style={{ marginTop: 2, wordBreak: 'break-all' }}>
                    <strong style={{ color: '#cbd5e1' }}>Ubicación:</strong> {downloadInfo.targetFolder}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => abrirUbicacion(installerPath || targetFolder)}
                style={{
                  marginTop: 10,
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 8,
                  padding: '5px 12px',
                  color: '#6ee7b7',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ExternalLink size={13} />
                Abrir carpeta en el Explorador
              </button>
            </div>

            <button
              onClick={instalarAhora}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: 14,
                cursor: 'pointer',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <RefreshCw size={18} />
              Reemplazar ejecutable y reiniciar ahora
            </button>
          </div>
        )}

        {/* FASE: instalando / reemplazando */}
        {fase === 'instalando' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Loader2
              size={36}
              color="#10b981"
              style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}
            />
            <h3 style={{ margin: '0 0 6px 0', fontSize: 16, color: '#f1f5f9', fontWeight: 700 }}>
              Aplicando actualización v{release.version}...
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
              Se abrirá la ventana de transición mientras se actualiza el ejecutable en su carpeta y se reinicia la aplicación.
            </p>
          </div>
        )}

        {/* FASE: error */}
        {fase === 'error' && (
          <div>
            <div
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 16,
                color: '#fca5a5',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <strong>Error al actualizar:</strong> {errorMsg}
            </div>
            <button
              onClick={iniciarDescarga}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(239,68,68,0.2)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 12,
                cursor: 'pointer',
                color: '#fca5a5',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <RefreshCw size={16} />
              Reintentar descarga
            </button>
          </div>
        )}

        <div
          style={{
            marginTop: 18,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 11, color: '#475569' }}>
            Movimiento Paz y Vida
          </span>
          <span style={{ fontSize: 11, color: '#475569' }}>
            v{versionInstalada} → v{release.version}
          </span>
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};
