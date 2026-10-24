import React, { useState } from 'react';
import { Settings, Server, Database, RefreshCw, CheckCircle } from 'lucide-react';
import { StorageService } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const currentConfig = StorageService.obtenerConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.supabase_url || '');
  const [supabaseKey, setSupabaseKey] = useState(currentConfig.supabase_anon_key || '');
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.guardarConfig({
      supabase_url: supabaseUrl.trim(),
      supabase_anon_key: supabaseKey.trim(),
    });
    setGuardadoExitoso(true);
    setTimeout(() => {
      setGuardadoExitoso(false);
      onClose();
    }, 800);
  };

  const handleReiniciarDatos = () => {
    if (confirm('¿Desea restablecer los registros locales? Se mantendrán las cuentas de usuario y la sesión.')) {
      localStorage.removeItem('mpv_registros_data_v1');
      localStorage.removeItem('mpv_sync_queue_v1');
      StorageService.inicializarDatosDemo();
      window.dispatchEvent(new CustomEvent('mpv-data-updated'));
      window.dispatchEvent(new CustomEvent('mpv-sync-updated'));
      alert('Registros locales restablecidos correctamente.');
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} style={{ color: 'var(--accent-blue-light)' }} />
            <span>Configuración del Sistema</span>
          </h3>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '4px 10px' }}>✕</button>
        </div>

        <form onSubmit={handleGuardar}>
          <div className="modal-body">
            {/* Servidor Remoto / Supabase */}
            <div style={{ marginBottom: '18px', padding: '16px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                <Server size={16} />
                <span>Servidor Remoto (Supabase / Nube Oficial)</span>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
                Conexión segura para sincronización y respaldo centralizado de datos.
              </p>

              <div className="form-group">
                <label className="form-label">URL del Servidor</label>
                <input
                  type="text"
                  placeholder="https://ejemplo.supabase.co"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Clave de Acceso (Anon Key)</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={e => setSupabaseKey(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {/* Mantenimiento de Registros Locales */}
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                <Database size={16} />
                <span>Mantenimiento Local</span>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
                Restaura los registros de demostración iniciales en este equipo sin alterar las cuentas de usuario ni la sesión.
              </p>
              <button
                type="button"
                onClick={handleReiniciarDatos}
                className="btn btn-secondary"
                style={{ fontSize: '12px', color: '#f87171' }}
              >
                <RefreshCw size={13} />
                <span>Restablecer Registros Locales</span>
              </button>
            </div>
          </div>

          <div className="modal-footer">
            {guardadoExitoso && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '13px', marginRight: 'auto' }}>
                <CheckCircle size={16} />
                <span>Configuración guardada exitosamente.</span>
              </div>
            )}
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
