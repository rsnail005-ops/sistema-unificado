import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw,
  Settings
} from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { AuthVaultService } from '../services/authVault';
import { StorageService } from '../services/storage';
import { UsuarioSesion } from '../types';
import { LOGO_OFICIAL } from '../assets/logos';

interface LoginScreenProps {
  onLoginSuccess: (sesion: UsuarioSesion) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loginIdentificador, setLoginIdentificador] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const res = await AuthVaultService.autenticar(loginIdentificador, loginPassword);
      setIsLoading(false);

      if (res.exito && res.usuario) {
        StorageService.guardarSesion(res.usuario);
        onLoginSuccess(res.usuario);
      } else {
        setLoginError(res.mensaje);
      }
    } catch (err: any) {
      setIsLoading(false);
      setLoginError('Error al contactar el servidor: ' + err.message);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 15%, rgba(37, 99, 235, 0.22) 0%, transparent 65%), #070a14',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '450px',
        backgroundColor: '#101728',
        border: '1px solid #1e2d4a',
        borderRadius: '20px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)',
        overflow: 'hidden'
      }}>
        {/* Cabecera Oficial */}
        <div style={{
          padding: '28px 28px 22px 28px',
          background: 'linear-gradient(180deg, rgba(17, 26, 46, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
          borderBottom: '1px solid #1e2d4a',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Cinta Tricolor Venezolana */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', display: 'flex' }}>
            <div style={{ flex: 1, backgroundColor: '#facc15' }}></div>
            <div style={{ flex: 1, backgroundColor: '#2563eb' }}></div>
            <div style={{ flex: 1, backgroundColor: '#dc2626' }}></div>
          </div>

          {/* Botón Configuración de Servidor */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="Configuración de Servidor Supabase"
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.borderColor = '#3b82f6'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; }}
          >
            <Settings size={18} />
          </button>

          {/* Logotipo Oficial */}
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <img
              src={LOGO_OFICIAL}
              alt="Movimiento por la Paz y la Vida"
              style={{
                width: '96px',
                height: '96px',
                objectFit: 'contain',
                margin: '0 auto',
                filter: 'drop-shadow(0 6px 18px rgba(0, 0, 0, 0.45))'
              }}
            />
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '19px', fontWeight: 800, color: '#ffffff', marginBottom: '4px', letterSpacing: '0.02em' }}>
            MOVIMIENTO POR LA PAZ Y LA VIDA
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Sistema de Gestión Territorial
          </p>
        </div>

        {/* Formulario de Acceso Directo */}
        <form onSubmit={handleLoginSubmit} style={{ padding: '28px' }}>
          <div style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ fontSize: '12.5px', marginBottom: '6px' }}>
              Correo Electrónico o Cédula
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
              <input
                type="text"
                required
                autoFocus
                placeholder="ej: admin@pazyvida.gob.ve o V-00000001"
                value={loginIdentificador}
                onChange={e => setLoginIdentificador(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px', height: '42px', fontSize: '13.5px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontSize: '12.5px', marginBottom: '6px' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px', height: '42px', fontSize: '13.5px' }}
              />
            </div>
          </div>

          {loginError && (
            <div style={{
              padding: '12px 14px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              color: '#f87171',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '20px',
              lineHeight: '1.4'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              padding: '12px', 
              fontSize: '14.5px', 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)'
            }}
          >
            {isLoading ? (
              <>
                <RefreshCw size={17} className="animate-spin" />
                <span>Verificando en servidor...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
