import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  RefreshCw, 
  ShieldAlert, 
  FolderLock,
  Building2,
  CreditCard,
  UserCheck,
  Code2
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { LOGO_OFICIAL, LOGO_JUNTOS_PAZ_VIDA } from '../assets/logos';
import { UsuarioSesion } from '../types';

export type TabType = 
  | 'dashboard' 
  | 'gimnasio' 
  | 'pagos' 
  | 'asistencia' 
  | 'personas' 
  | 'eventos' 
  | 'documentos' 
  | 'sync' 
  | 'auditoria'
  | 'developer';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  sesion: UsuarioSesion | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, sesion }) => {
  const [queue, setQueue] = useState(() => StorageService.obtenerColaSync());

  const recargar = () => {
    setQueue(StorageService.obtenerColaSync());
  };

  useEffect(() => {
    window.addEventListener('mpv-sync-updated', recargar);
    window.addEventListener('mpv-data-updated', recargar);
    return () => {
      window.removeEventListener('mpv-sync-updated', recargar);
      window.removeEventListener('mpv-data-updated', recargar);
    };
  }, []);

  const pendientes = queue.filter(q => q.estado === 'pendiente').length;
  const conflictos = queue.filter(q => q.estado === 'conflicto').length;

  return (
    <aside className="sidebar">
      <div style={{ padding: '0 8px 12px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Building2 size={13} style={{ color: 'var(--accent-amber)' }} />
          <span>Gran Base de Paz</span>
        </div>
      </div>

      <div
        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}
      >
        <LayoutDashboard size={18} />
        <span>Panel Principal</span>
      </div>

      <div
        className={`nav-item ${activeTab === 'gimnasio' ? 'active' : ''}`}
        onClick={() => setActiveTab('gimnasio')}
      >
        <Building2 size={18} style={{ color: '#f59e0b' }} />
        <span>Gimnasio Vertical</span>
      </div>

      <div
        className={`nav-item ${activeTab === 'pagos' ? 'active' : ''}`}
        onClick={() => setActiveTab('pagos')}
      >
        <CreditCard size={18} style={{ color: '#10b981' }} />
        <span>Caja y Pagos</span>
      </div>

      <div
        className={`nav-item ${activeTab === 'asistencia' ? 'active' : ''}`}
        onClick={() => setActiveTab('asistencia')}
      >
        <UserCheck size={18} style={{ color: '#38bdf8' }} />
        <span>Asistencia</span>
      </div>

      <div
        className={`nav-item ${activeTab === 'personas' ? 'active' : ''}`}
        onClick={() => setActiveTab('personas')}
      >
        <Users size={18} />
        <span>Usuarios / Personas</span>
      </div>

      <div
        className={`nav-item ${activeTab === 'eventos' ? 'active' : ''}`}
        onClick={() => setActiveTab('eventos')}
      >
        <Calendar size={18} />
        <span>Eventos y Jornadas</span>
      </div>

      <div
        className={`nav-item ${activeTab === 'documentos' ? 'active' : ''}`}
        onClick={() => setActiveTab('documentos')}
      >
        <FileText size={18} />
        <span>Documentos Oficiales</span>
      </div>

      <div style={{ padding: '16px 8px 8px 8px', borderBottom: '1px solid var(--border-subtle)', margin: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <FolderLock size={13} style={{ color: 'var(--accent-blue-light)' }} />
          <span>Sistema</span>
        </div>
      </div>

      <div
        className={`nav-item ${activeTab === 'sync' ? 'active' : ''}`}
        onClick={() => setActiveTab('sync')}
      >
        <RefreshCw size={18} />
        <span>Sincronización</span>
        {pendientes > 0 && <span className="nav-badge" style={{ backgroundColor: 'var(--accent-amber)' }}>{pendientes}</span>}
        {conflictos > 0 && <span className="nav-badge" style={{ backgroundColor: 'var(--accent-red)' }}>!</span>}
      </div>

      <div
        className={`nav-item ${activeTab === 'auditoria' ? 'active' : ''}`}
        onClick={() => setActiveTab('auditoria')}
      >
        <ShieldAlert size={18} />
        <span>Auditoría</span>
      </div>

      {/* ─── Panel Desarrollador — solo visible para rol developer ─── */}
      {sesion?.rol === 'developer' && (
        <>
          <div style={{ padding: '16px 8px 8px 8px', margin: '8px 0', borderTop: '1px solid rgba(124,58,237,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Code2 size={13} style={{ color: '#7c3aed' }} />
              <span>Desarrollador</span>
            </div>
          </div>
          <div
            className={`nav-item ${activeTab === 'developer' ? 'active' : ''}`}
            onClick={() => setActiveTab('developer')}
            style={activeTab === 'developer' ? {
              background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.15))',
              borderLeft: '3px solid #7c3aed',
            } : { borderLeft: '3px solid transparent' }}
          >
            <Code2 size={18} style={{ color: '#a78bfa' }} />
            <span style={{ color: activeTab === 'developer' ? '#c4b5fd' : '#94a3b8' }}>💻 Panel Dev</span>
          </div>
        </>
      )}

      <div style={{
        marginTop: 'auto',
        padding: '16px 10px 10px 10px',
        textAlign: 'center',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px'
      }}>
        <img 
          src={LOGO_OFICIAL} 
          alt="Movimiento Paz y Vida" 
          style={{ width: '48px', height: '48px', objectFit: 'contain', margin: '0 auto', display: 'block' }} 
        />
        <img 
          src={LOGO_JUNTOS_PAZ_VIDA} 
          alt="Juntos por la Vida y la Paz" 
          style={{ width: '82px', height: 'auto', objectFit: 'contain', opacity: 0.9, margin: '0 auto', display: 'block' }} 
        />
        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>
          GRAN BASE DE PAZ
        </div>
      </div>
    </aside>
  );
};
