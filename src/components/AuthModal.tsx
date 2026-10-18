import React from 'react';
import { ShieldCheck, LogOut, KeyRound, Server } from 'lucide-react';
import { StorageService } from '../services/storage';
import { SupabaseService } from '../services/supabase';
import { UsuarioSesion } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  sesion: UsuarioSesion | null;
  onSesionChange: (sesion: UsuarioSesion | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  sesion,
  onSesionChange
}) => {
  if (!isOpen) return null;

  const handleCerrarSesion = async () => {
    if (sesion) {
      StorageService.registrarAuditoria({
        id: 'aud-' + Math.random().toString(36).substring(2, 9),
        operador_cedula: sesion.cedula,
        accion: 'CIERRE_DE_SESIÓN',
        entidad_tipo: 'Seguridad',
        entidad_id: 'sesion-out',
        detalles: `Cierre de sesión de ${sesion.nombres} ${sesion.apellidos} (${sesion.rol}).`,
        fecha: new Date().toISOString()
      });
    }
    await SupabaseService.logoutAuth();
    StorageService.cerrarSesion();
    onSesionChange(null);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={20} style={{ color: 'var(--accent-amber)' }} />
            <span>Perfil y Permisos del Operador</span>
          </h3>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '4px 10px' }}>✕</button>
        </div>

        <div className="modal-body">
          {sesion ? (
            <div style={{ padding: '18px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ 
                  width: '50px', 
                  height: '50px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#fff', 
                  fontSize: '20px', 
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                }}>
                  {sesion.nombres ? sesion.nombres[0].toUpperCase() : 'U'}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#ffffff', fontSize: '16.5px', fontWeight: 800, marginBottom: '2px' }}>
                    {sesion.nombres} {sesion.apellidos}
                  </h4>
                  <div style={{ fontSize: '12.5px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <ShieldCheck size={14} />
                    <span>Cédula: <strong>{sesion.cedula}</strong> (Validada)</span>
                  </div>
                  
                  <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                      Rol en Servidor: <strong style={{ color: '#f59e0b', fontSize: '13px' }}>{sesion.rol.replace(/_/g, ' ').toUpperCase()}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Jurisdicción: <strong style={{ color: '#e2e8f0' }}>{sesion.estado_asignado}</strong>
                      {sesion.municipio_asignado ? ` • ${sesion.municipio_asignado}` : ''}
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#60a5fa' }}>
                    <Server size={13} />
                    <span>Permisos verificados por Supabase Cloud</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleCerrarSesion} className="btn btn-danger" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LogOut size={15} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
              No hay sesión activa.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
