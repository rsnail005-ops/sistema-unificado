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
                  
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nivel de Acceso:</span>
                      {sesion.rol === 'desarrollador' && (
                        <span style={{ background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#c084fc', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                          ⚡ DESARROLLADOR
                        </span>
                      )}
                      {sesion.rol === 'administrador_nacional' && (
                        <span style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                          🇻🇪 ADMIN NACIONAL
                        </span>
                      )}
                      {sesion.rol === 'administrador_base' && (
                        <span style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                          📍 ADMIN DE BASE
                        </span>
                      )}
                    </div>

                    {sesion.base_misiones_nombre && (
                      <div style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '6px', fontWeight: 600 }}>
                        Base Asignada: <strong>{sesion.base_misiones_nombre}</strong>
                      </div>
                    )}

                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                      Jurisdicción: <strong style={{ color: '#e2e8f0' }}>{sesion.estado_asignado}</strong>
                      {sesion.municipio_asignado ? ` • ${sesion.municipio_asignado}` : ''}
                    </div>

                    <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {sesion.rol === 'desarrollador' && (
                        <span style={{ color: '#c084fc' }}>
                          ✓ Acceso total ilimitado: consola de desarrollador, publicación de versiones, bases y datos nacionales.
                        </span>
                      )}
                      {sesion.rol === 'administrador_nacional' && (
                        <span style={{ color: '#93c5fd' }}>
                          ✓ Visibilidad de todos los datos nacionales. Restricción: no puede modificar el programa ni publicar versiones.
                        </span>
                      )}
                      {sesion.rol === 'administrador_base' && (
                        <span style={{ color: '#fde68a' }}>
                          ✓ Visibilidad exclusiva de su base de misiones. Restricción: no puede ver datos de otras bases ni modificar el programa.
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#60a5fa' }}>
                    <Server size={13} />
                    <span>Permisos sincronizados con el servidor Supabase</span>
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
