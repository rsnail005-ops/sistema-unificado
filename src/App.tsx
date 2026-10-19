import React, { useState, useEffect } from 'react';
import { DesktopHeader } from './components/DesktopHeader';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { GimnasioView } from './components/GimnasioView';
import { PagosView } from './components/PagosView';
import { AsistenciaView } from './components/AsistenciaView';
import { PersonasView } from './components/PersonasView';
import { EventosView } from './components/EventosView';
import { DocumentosView } from './components/DocumentosView';
import { SyncQueueView } from './components/SyncQueueView';
import { AuditView } from './components/AuditView';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { UpdateModal } from './components/UpdateModal';
import { DeveloperPanel } from './components/DeveloperPanel';
import { StorageService } from './services/storage';
import { AuthVaultService } from './services/authVault';
import { UpdateService, AppRelease } from './services/updateService';
import { RealtimeService } from './services/realtimeService';
import { UsuarioSesion, isDeveloperSesion } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [autoOpenAction, setAutoOpenAction] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sesion, setSesion] = useState<UsuarioSesion | null>(StorageService.obtenerSesion());

  // Estado del sistema de actualizaciones
  const [pendingRelease, setPendingRelease] = useState<AppRelease | null>(null);

  useEffect(() => {
    StorageService.inicializarDatosDemo();
    AuthVaultService.inicializarBoveda();

    const handleSessionChange = () => {
      setSesion(StorageService.obtenerSesion());
    };

    window.addEventListener('mpv-session-updated', handleSessionChange);

    return () => {
      window.removeEventListener('mpv-session-updated', handleSessionChange);
    };
  }, []);

  // Realtime: iniciar WebSocket cuando hay sesión, detener al cerrar
  useEffect(() => {
    if (!sesion) {
      RealtimeService.detener();
      return;
    }

    // Iniciar suscripción Realtime y forzar descarga inicial desde servidor
    RealtimeService.iniciar();
    RealtimeService.sincronizarDesdeServidor();

    // Al recuperar conexión a internet → resincronizar desde servidor
    const handleOnline = () => {
      RealtimeService.iniciar();
      RealtimeService.sincronizarDesdeServidor();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [sesion?.cedula]);

  // Verificar actualizaciones cada vez que hay sesión activa
  useEffect(() => {
    if (!sesion) return;

    const checkUpdate = async () => {
      try {
        const release = await UpdateService.obtenerUltimoRelease();
        if (release && UpdateService.hayNuevaVersion(release.version)) {
          setPendingRelease(release);
        }
      } catch {
        // Sin conexión: ignorar silenciosamente
      }
    };

    checkUpdate();
    // Verificar también cada 30 minutos mientras la app está abierta
    const intervalo = setInterval(checkUpdate, 30 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, [sesion?.cedula]);

  const handleNavigate = (tab: TabType, action?: string) => {
    setActiveTab(tab);
    if (action) {
      setAutoOpenAction(action);
    }
  };

  // Si no ha iniciado sesión, mostrar pantalla de login
  if (!sesion) {
    return <LoginScreen onLoginSuccess={(usuario) => setSesion(usuario)} />;
  }

  return (
    <div className="app-container">
      {/* Modal de Actualización — bloquea la app si hay versión nueva */}
      {pendingRelease && (
        <UpdateModal
          release={pendingRelease}
          obligatoria={pendingRelease.obligatoria}
        />
      )}

      {/* Encabezado */}
      <DesktopHeader
        sesion={sesion}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNavigateSync={() => setActiveTab('sync')}
      />

      {/* Área de Trabajo */}
      <div className="workspace-layout">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} sesion={sesion} />

        <main className="main-content">
          {activeTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
          {activeTab === 'gimnasio' && <GimnasioView sesion={sesion} />}
          {activeTab === 'pagos' && <PagosView sesion={sesion} />}
          {activeTab === 'asistencia' && <AsistenciaView sesion={sesion} />}
          {activeTab === 'personas' && (
            <PersonasView
              sesion={sesion}
              initialOpenForm={autoOpenAction === 'new-persona'}
              onClearAutoOpen={() => setAutoOpenAction(null)}
            />
          )}
          {activeTab === 'eventos' && (
            <EventosView
              sesion={sesion}
              initialOpenForm={autoOpenAction === 'new-evento'}
              onClearAutoOpen={() => setAutoOpenAction(null)}
            />
          )}
          {activeTab === 'documentos' && <DocumentosView sesion={sesion} />}
          {activeTab === 'sync' && <SyncQueueView sesion={sesion} />}
          {activeTab === 'auditoria' && <AuditView />}
          {activeTab === 'developer' && isDeveloperSesion(sesion) && (
            <DeveloperPanel sesion={sesion} />
          )}
        </main>
      </div>

      {/* Modales Globales */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        sesion={sesion}
        onSesionChange={setSesion}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
