import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, ShieldCheck, Settings, User, Clock, LogOut, CheckCircle, XCircle, Info, AlertTriangle, DollarSign, Download, Sparkles } from 'lucide-react';
import { StorageService, AppConfig } from '../services/storage';
import { UsuarioSesion, SyncItem } from '../types';
import { SupabaseService, SyncResult } from '../services/supabase';
import { LOGO_OFICIAL } from '../assets/logos';
import { BcvService, TasaBCVInfo } from '../services/bcvService';
import { BcvModal } from './BcvModal';
import { UpdateService, AppRelease } from '../services/updateService';

interface DesktopHeaderProps {
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onNavigateSync?: () => void;
  onOpenUpdateModal?: (release: AppRelease) => void;
  sesion: UsuarioSesion | null;
}

interface SyncToast {
  visible: boolean;
  titulo?: string;
  mensaje?: string;
  result: SyncResult | null;
  tipo: 'success' | 'warning' | 'error' | 'info';
  hora?: string;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  onOpenSettings,
  onOpenAuth,
  onNavigateSync,
  onOpenUpdateModal,
  sesion
}) => {
  const [config, setConfig] = useState<AppConfig>(StorageService.obtenerConfig());
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>(StorageService.obtenerColaSync());
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('es-VE'));
  const [toast, setToast] = useState<SyncToast>({ visible: false, result: null, tipo: 'info' });
  const [tasaBCV, setTasaBCV] = useState<TasaBCVInfo>(BcvService.obtenerTasaSincrona());
  const [isBcvModalOpen, setIsBcvModalOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>(() => UpdateService.obtenerVersionInstalada());
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);

  const refreshData = () => {
    setConfig(StorageService.obtenerConfig());
    setSyncQueue(StorageService.obtenerColaSync());
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    const result = await StorageService.procesarColaSincronizacion();
    setIsSyncing(false);

    let tipo: SyncToast['tipo'] = 'info';
    let titulo = 'Sin Cambios Pendientes';
    if (result.total === 0) {
      tipo = 'info';
      titulo = 'Todo al Día';
    } else if (result.errores > 0) {
      tipo = 'error';
      titulo = 'Sincronización con Errores';
    } else if (result.conflictos > 0) {
      tipo = 'warning';
      titulo = 'Sincronización con Advertencias';
    } else {
      tipo = 'success';
      titulo = '¡Sincronización Exitosa!';
    }

    setToast({
      visible: true,
      titulo,
      mensaje: result.mensaje,
      result,
      tipo,
      hora: result.hora
    });
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await UpdateService.verificarActualizacionManual();
      setIsCheckingUpdate(false);
      setCurrentVersion(res.versionInstalada);

      if (res.hayNueva && res.release) {
        setHasNewUpdate(true);
        if (onOpenUpdateModal) {
          onOpenUpdateModal(res.release);
        } else {
          window.dispatchEvent(new CustomEvent('mpv-trigger-update-modal', { detail: res.release }));
        }
      } else if (res.error) {
        setToast({
          visible: true,
          titulo: 'Verificación de Actualizaciones',
          mensaje: `No se pudo conectar con el servidor: ${res.error}`,
          result: null,
          tipo: 'warning',
          hora: new Date().toLocaleTimeString('es-VE')
        });
      } else {
        setHasNewUpdate(false);
        setToast({
          visible: true,
          titulo: 'Sistema al Día',
          mensaje: `¡Excelente! Ya tienes la versión más reciente del sistema (v${res.versionInstalada}).`,
          result: null,
          tipo: 'success',
          hora: new Date().toLocaleTimeString('es-VE')
        });
      }
    } catch (e: any) {
      setIsCheckingUpdate(false);
      setToast({
        visible: true,
        titulo: 'Error',
        mensaje: e.message || 'Error al verificar actualización',
        result: null,
        tipo: 'error',
        hora: new Date().toLocaleTimeString('es-VE')
      });
    }
  };

  useEffect(() => {
    window.addEventListener('mpv-sync-updated', refreshData);
    window.addEventListener('mpv-config-updated', refreshData);
    window.addEventListener('mpv-data-updated', refreshData);

    const handleBcvUpdate = () => {
      setTasaBCV(BcvService.obtenerTasaSincrona());
    };
    window.addEventListener('mpv-bcv-updated', handleBcvUpdate);

    // Consultar tasa oficial del BCV al iniciar
    BcvService.actualizarTasaEnLinea().then(nueva => {
      setTasaBCV(nueva);
    });

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('es-VE'));
    }, 1000);

    // ==========================================
    // DETECCIÓN INTELIGENTE DE CONEXIÓN A RED
    // ==========================================
    const handleNetworkOffline = () => {
      StorageService.guardarConfig({ modo_red: 'offline' });
      const hora = new Date().toLocaleTimeString('es-VE');
      setToast({
        visible: true,
        titulo: 'Modo Fuera de Línea (Offline) Activado',
        mensaje: 'Se perdió la conexión a internet. La aplicación continúa funcionando al 100%: los atletas, pagos y asistencias se guardarán en esta máquina y se sincronizarán al volver la red.',
        result: null,
        tipo: 'warning',
        hora
      });
    };

    const handleNetworkOnline = async () => {
      const currentConfig = StorageService.obtenerConfig();
      if (currentConfig.modo_manual_offline) {
        // Respetar modo offline forzado manualmente por el usuario
        return;
      }
      StorageService.guardarConfig({ modo_red: 'online' });
      const hora = new Date().toLocaleTimeString('es-VE');
      setToast({
        visible: true,
        titulo: '¡Conexión Restablecida! En Línea',
        mensaje: 'Se ha recuperado la conexión al servidor Supabase. Sincronizando registros automáticamente...',
        result: null,
        tipo: 'info',
        hora
      });

      // Sincronizar automáticamente tras 1 segundo
      setTimeout(() => {
        handleManualSync();
      }, 1000);
    };

    window.addEventListener('offline', handleNetworkOffline);
    window.addEventListener('online', handleNetworkOnline);

    // Sincronización automática inicial al arrancar la aplicación
    const initialSyncTimer = setTimeout(async () => {
      const currentConfig = StorageService.obtenerConfig();
      if (currentConfig.modo_red === 'online' && !currentConfig.modo_manual_offline && (typeof navigator === 'undefined' || navigator.onLine)) {
        await StorageService.procesarColaSincronizacion();
      }
    }, 1200);

    // Al volver a la ventana de la aplicación, descargar novedades recientes en segundo plano
    const handleWindowFocus = async () => {
      const currentConfig = StorageService.obtenerConfig();
      if (currentConfig.modo_red === 'online' && !currentConfig.modo_manual_offline && (typeof navigator === 'undefined' || navigator.onLine)) {
        const novedades = await StorageService.descargarActualizacionesDesdeServidor();
        const total = novedades.nuevosRegistros + novedades.nuevosPagos + novedades.nuevasAsistencias;
        if (total > 0) {
          setToast({
            visible: true,
            titulo: 'Sincronización en Vivo',
            mensaje: `Se incorporaron ${total} nuevo(s) dato(s) registrados por otros operadores.`,
            result: null,
            tipo: 'info',
            hora: new Date().toLocaleTimeString('es-VE')
          });
        }
      }
    };
    window.addEventListener('focus', handleWindowFocus);

    // Chequeo activo y sincronización continua cada 10 segundos hacia Supabase
    const heartbeatInterval = setInterval(async () => {
      const currentConfig = StorageService.obtenerConfig();

      // Si el usuario forzó el modo offline manualmente, respetar y no conectar
      if (currentConfig.modo_manual_offline) {
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (currentConfig.modo_red === 'online') {
          handleNetworkOffline();
        }
        return;
      }

      try {
        const status = await SupabaseService.checkConnection();
        if (!status.ok && currentConfig.modo_red === 'online') {
          handleNetworkOffline();
        } else if (status.ok && currentConfig.modo_red === 'offline' && !currentConfig.modo_manual_offline) {
          handleNetworkOnline();
        } else if (status.ok && currentConfig.modo_red === 'online' && currentConfig.auto_sync !== false) {
          // Si estamos en línea y auto_sync activo:
          const cola = StorageService.obtenerColaSync();
          const hayPendientes = cola.some(q => q.estado === 'pendiente');

          if (hayPendientes) {
            // Subir lo pendiente de esta máquina
            await StorageService.procesarColaSincronizacion();
          } else {
            // Descargar lo que hayan ingresado otros operadores en sus máquinas
            const novedades = await StorageService.descargarActualizacionesDesdeServidor();
            const total = novedades.nuevosRegistros + novedades.nuevosPagos + novedades.nuevasAsistencias;
            if (total > 0) {
              setToast({
                visible: true,
                titulo: 'Datos Actualizados en Tiempo Real',
                mensaje: `Se descargaron ${total} novedad(es) ingresada(s) por otros operadores.`,
                result: null,
                tipo: 'success',
                hora: new Date().toLocaleTimeString('es-VE')
              });
            }
          }
        }
      } catch {
        if (currentConfig.modo_red === 'online') {
          handleNetworkOffline();
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('mpv-sync-updated', refreshData);
      window.removeEventListener('mpv-config-updated', refreshData);
      window.removeEventListener('mpv-data-updated', refreshData);
      window.removeEventListener('mpv-bcv-updated', handleBcvUpdate);
      window.removeEventListener('offline', handleNetworkOffline);
      window.removeEventListener('online', handleNetworkOnline);
      window.removeEventListener('focus', handleWindowFocus);
      clearTimeout(initialSyncTimer);
      clearInterval(clockInterval);
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Auto-dismiss toast tras 7 segundos
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const toggleModoRed = () => {
    const nuevoModo = config.modo_red === 'online' ? 'offline' : 'online';
    const esManualOffline = nuevoModo === 'offline';
    StorageService.guardarConfig({ modo_red: nuevoModo, modo_manual_offline: esManualOffline });
    const hora = new Date().toLocaleTimeString('es-VE');

    if (nuevoModo === 'online') {
      setToast({
        visible: true,
        titulo: 'Modo En Línea Activado Manualmente',
        mensaje: 'Conectando con el servidor Supabase e iniciando sincronización...',
        result: null,
        tipo: 'info',
        hora
      });
      handleManualSync();
    } else {
      setToast({
        visible: true,
        titulo: 'Modo Offline Activado Manualmente',
        mensaje: 'La aplicación operará estrictamente de forma local. No se realizarán envíos al servidor.',
        result: null,
        tipo: 'warning',
        hora
      });
    }
  };

  const pendientesCount = syncQueue.filter(q => q.estado === 'pendiente').length;
  const conflictosCount = syncQueue.filter(q => q.estado === 'conflicto').length;

  const toastColors = {
    success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', icon: '#34d399', text: '#a7f3d0' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', icon: '#fbbf24', text: '#fde68a' },
    error:   { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', icon: '#f87171', text: '#fca5a5' },
    info:    { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', icon: '#60a5fa', text: '#93c5fd' }
  };

  return (
    <>
      <header className="desktop-header">
        <div className="brand-section">
          <img 
            src={LOGO_OFICIAL} 
            alt="Logo" 
            style={{ 
              width: '40px', 
              height: '40px', 
              objectFit: 'contain', 
              borderRadius: '8px',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))'
            }} 
          />
          <div>
            <h1 className="brand-title">MOVIMIENTO POR LA PAZ Y LA VIDA</h1>
            <p className="brand-subtitle">
              {sesion?.base_misiones_nombre 
                ? `${sesion.base_misiones_nombre} • ${sesion.estado_asignado}` 
                : 'Sistema de Gestión y Control'}
            </p>
          </div>
        </div>

        <div className="header-actions no-drag">
          {/* Monitor de Tasa Oficial BCV */}
          <button
            onClick={() => setIsBcvModalOpen(true)}
            className="status-pill"
            style={{
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
            }}
            title="Tasa Oficial del Banco Central de Venezuela (BCV). Clic para abrir el convertidor de Bolívares a Dólares."
          >
            <DollarSign size={14} style={{ color: '#34d399' }} />
            <span>BCV: <strong>Bs. {tasaBCV.tasa.toFixed(2)}</strong></span>
            <span style={{ fontSize: '10px', opacity: 0.85, color: '#93c5fd', marginLeft: '2px' }}>⇄ USD</span>
          </button>

          {/* Reloj */}
          <div className="status-pill" style={{ background: 'rgba(255,255,255,0.03)', color: '#94a3b8' }}>
            <Clock size={13} />
            <span>{currentTime}</span>
          </div>

          {/* Conmutador de Red con Pulso Visual */}
          <button
            onClick={toggleModoRed}
            className={`status-pill ${config.modo_red === 'online' ? 'status-online' : 'status-offline'}`}
            style={{ 
              cursor: 'pointer', 
              background: config.modo_red === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.2)',
              border: config.modo_red === 'online' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(239, 68, 68, 0.45)'
            }}
            title="Haga clic para alternar manualmente entre En Línea y Fuera de Línea"
          >
            <div className="pulse-dot" style={{ backgroundColor: config.modo_red === 'online' ? '#34d399' : '#f87171' }}></div>
            {config.modo_red === 'online' ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{config.modo_red === 'online' ? 'En Línea' : 'Sin Conexión'}</span>
          </button>

          {/* Sincronización Manual */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing || config.modo_red === 'offline'}
            className={`btn ${pendientesCount > 0 ? 'btn-amber' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            title={config.modo_red === 'offline' ? 'Sincronización deshabilitada en modo offline' : pendientesCount > 0 ? `${pendientesCount} registros pendientes` : 'Sincronizado'}
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>
              {isSyncing ? 'Sincronizando...' : config.modo_red === 'offline' ? 'Offline' : pendientesCount > 0 ? `Sincronizar (${pendientesCount})` : 'Sincronizado'}
            </span>
          </button>

          {conflictosCount > 0 && (
            <button
              onClick={onNavigateSync}
              className="status-pill status-offline"
              style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}
              title="Ver conflictos en la pestaña de sincronización"
            >
              <span>⚠️ {conflictosCount} Conflicto(s)</span>
            </button>
          )}

          {/* Perfil del Operador */}
          <button
            onClick={onOpenAuth}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <User size={14} />
            <span>{sesion ? `${sesion.nombres.split(' ')[0]} (${sesion.cedula})` : 'Iniciar Sesión'}</span>
            {sesion?.saime_validado && (
              <span title="Cédula Validada">
                <ShieldCheck size={14} style={{ color: '#10b981', marginLeft: '4px' }} />
              </span>
            )}
          </button>

          {/* Configuración */}
          <button
            onClick={onOpenSettings}
            className="btn btn-secondary"
            style={{ padding: '6px 10px' }}
            title="Configuración"
          >
            <Settings size={15} />
          </button>

          {/* Cerrar Sesión */}
          <button
            onClick={() => {
              if (confirm('¿Desea cerrar la sesión?')) {
                StorageService.cerrarSesion();
              }
            }}
            className="btn btn-danger"
            style={{ padding: '6px 10px' }}
            title="Cerrar Sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* BARRA VISUAL DE MODO FUERA DE LÍNEA (OFFLINE BANNER)     */}
      {/* ======================================================== */}
      {config.modo_red === 'offline' && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.18) 0%, rgba(185, 28, 28, 0.18) 100%)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.35)',
          padding: '7px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#fca5a5',
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <WifiOff size={15} style={{ color: '#f87171', flexShrink: 0 }} />
            <span>
              <strong>Modo Sin Conexión (Offline):</strong> Puede continuar registrando atletas, asistencias y pagos normalmente. Todos los datos se guardan en el disco local y se sincronizarán automáticamente con el servidor cuando vuelva el internet.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {pendientesCount > 0 && (
              <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.3)', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                {pendientesCount} registro(s) en espera
              </span>
            )}
            <button
              onClick={toggleModoRed}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
              title="Intentar reconectar con el servidor"
            >
              Probar Reconexión
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NOTIFICACIÓN FLOTANTE (TOAST)                             */}
      {/* ======================================================== */}
      {toast.visible && (
        <div
          style={{
            position: 'fixed',
            top: config.modo_red === 'offline' ? '92px' : '56px',
            right: '20px',
            zIndex: 9999,
            minWidth: '360px',
            maxWidth: '480px',
            background: toastColors[toast.tipo].bg,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${toastColors[toast.tipo].border}`,
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: 'slideInRight 0.35s ease-out',
            transition: 'top 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ marginTop: '2px', flexShrink: 0 }}>
              {toast.tipo === 'success' && <CheckCircle size={22} style={{ color: toastColors.success.icon }} />}
              {toast.tipo === 'warning' && <AlertTriangle size={22} style={{ color: toastColors.warning.icon }} />}
              {toast.tipo === 'error' && <XCircle size={22} style={{ color: toastColors.error.icon }} />}
              {toast.tipo === 'info' && <Info size={22} style={{ color: toastColors.info.icon }} />}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff', marginBottom: '4px' }}>
                {toast.titulo || (toast.tipo === 'success' ? 'Sincronización Exitosa' : 'Aviso')}
              </div>
              <div style={{ fontSize: '12px', color: toastColors[toast.tipo].text, lineHeight: '1.5' }}>
                {toast.mensaje || toast.result?.mensaje}
              </div>

              {toast.result && toast.result.total > 0 && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                    ✓ {toast.result.exitosos} enviado(s)
                  </span>
                  {toast.result.errores > 0 && (
                    <span style={{ fontSize: '11px', color: '#f87171', background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                      ✕ {toast.result.errores} error(es)
                    </span>
                  )}
                  {toast.result.conflictos > 0 && (
                    <span style={{ fontSize: '11px', color: '#fbbf24', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                      ⚠ {toast.result.conflictos} conflicto(s)
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  {toast.hora || new Date().toLocaleTimeString('es-VE')}
                </span>
                {onNavigateSync && (
                  <button
                    onClick={() => {
                      setToast(prev => ({ ...prev, visible: false }));
                      onNavigateSync();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: toastColors[toast.tipo].icon,
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    Ver historial y datos →
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setToast(prev => ({ ...prev, visible: false }))}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px', fontSize: '16px', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            borderRadius: '0 0 12px 12px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: toastColors[toast.tipo].icon,
              animation: 'shrinkBar 7s linear forwards',
              transformOrigin: 'left'
            }} />
          </div>
        </div>
      )}

      {/* Modal de Tasa BCV y Conversor de Divisas */}
      <BcvModal 
        isOpen={isBcvModalOpen} 
        onClose={() => setIsBcvModalOpen(false)} 
      />
    </>
  );
};
