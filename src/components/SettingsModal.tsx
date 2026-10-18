import React, { useState } from 'react';
import { Settings, Server, Key, Database, RefreshCw, CheckCircle, Mail, Send, AlertCircle, Info } from 'lucide-react';
import { StorageService } from '../services/storage';
import { AuthVaultService } from '../services/authVault';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const currentConfig = StorageService.obtenerConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.supabase_url || '');
  const [supabaseKey, setSupabaseKey] = useState(currentConfig.supabase_anon_key || '');
  const [verifikKey, setVerifikKey] = useState(currentConfig.verifik_api_key || '');
  
  // Configuración SMTP
  const [smtpHost, setSmtpHost] = useState(currentConfig.smtp_host || '');
  const [smtpPort, setSmtpPort] = useState(currentConfig.smtp_port || '587');
  const [smtpUser, setSmtpUser] = useState(currentConfig.smtp_user || '');
  const [smtpPass, setSmtpPass] = useState(currentConfig.smtp_pass || '');

  // Prueba de SMTP
  const [testEmail, setTestEmail] = useState(currentConfig.smtp_user || '');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState<{ exito: boolean; mensaje: string } | null>(null);

  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  const aplicarPreset = (tipo: 'gmail' | 'outlook' | 'yahoo') => {
    if (tipo === 'gmail') {
      setSmtpHost('smtp.gmail.com');
      setSmtpPort('587');
    } else if (tipo === 'outlook') {
      setSmtpHost('smtp-mail.outlook.com');
      setSmtpPort('587');
    } else if (tipo === 'yahoo') {
      setSmtpHost('smtp.mail.yahoo.com');
      setSmtpPort('465');
    }
  };

  const handleProbarSmtp = async () => {
    setTestResult(null);
    setIsTestingSmtp(true);
    const res = await AuthVaultService.probarConfiguracionSmtp(
      {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        pass: smtpPass
      },
      testEmail || smtpUser
    );
    setIsTestingSmtp(false);
    setTestResult(res);
  };

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.guardarConfig({
      supabase_url: supabaseUrl.trim(),
      supabase_anon_key: supabaseKey.trim(),
      verifik_api_key: verifikKey.trim(),
      smtp_host: smtpHost.trim(),
      smtp_port: smtpPort.trim(),
      smtp_user: smtpUser.trim(),
      smtp_pass: smtpPass.trim()
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
      localStorage.removeItem('mpv_audit_log_v1');
      StorageService.inicializarDatosDemo();
      window.dispatchEvent(new CustomEvent('mpv-data-updated'));
      window.dispatchEvent(new CustomEvent('mpv-sync-updated'));
      alert('Registros restablecidos correctamente.');
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '660px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} style={{ color: 'var(--accent-blue-light)' }} />
            <span>Configuración del Sistema</span>
          </h3>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '4px 10px' }}>✕</button>
        </div>

        <form onSubmit={handleGuardar}>
          <div className="modal-body">
            {/* Servidor SMTP de Correo */}
            <div style={{ marginBottom: '18px', padding: '16px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 600, fontSize: '14px' }}>
                  <Mail size={16} />
                  <span>Servidor de Correo (SMTP)</span>
                </div>

                {/* Preconfiguraciones Rápidas */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Plantillas:</span>
                  <button
                    type="button"
                    onClick={() => aplicarPreset('gmail')}
                    style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#fca5a5', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Gmail
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarPreset('outlook')}
                    style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.35)', color: '#93c5fd', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Outlook
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarPreset('yahoo')}
                    style={{ background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.35)', color: '#d8b4fe', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Yahoo
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                Parámetros para enviar códigos de seguridad OTP a los correos de los operadores.
              </p>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Host SMTP</label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com"
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Puerto</label>
                  <input
                    type="text"
                    placeholder="587 o 465"
                    value={smtpPort}
                    onChange={e => setSmtpPort(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Usuario / Remitente</label>
                  <input
                    type="text"
                    placeholder="ejemplo@gmail.com"
                    value={smtpUser}
                    onChange={e => {
                      setSmtpUser(e.target.value);
                      if (!testEmail) setTestEmail(e.target.value);
                    }}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Contraseña / Token de App</label>
                  <input
                    type="password"
                    placeholder="Código de app (16 letras en Gmail)"
                    value={smtpPass}
                    onChange={e => setSmtpPass(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Guía explicativa para Google / Gmail */}
              <div style={{
                padding: '10px 12px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '8px',
                fontSize: '11.5px',
                color: '#93c5fd',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
                marginBottom: '14px'
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: '1px', color: '#60a5fa' }} />
                <div>
                  <strong>¿Cómo obtener la contraseña en Gmail?</strong> Google exige una <em>Contraseña de Aplicación</em> de 16 caracteres. Activa la verificación en 2 pasos en tu cuenta de Google, entra a <span style={{ color: '#ffffff', textDecoration: 'underline' }}>myaccount.google.com/apppasswords</span>, crea una app llamada "Paz y Vida" y pega el código de 16 letras aquí.
                </div>
              </div>

              {/* Herramienta de Prueba de Envío */}
              <div style={{
                padding: '12px',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '8px',
                border: '1px dashed rgba(255,255,255,0.12)'
              }}>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
                  🧪 Probar Servidor de Correo
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    placeholder="Correo de prueba para recibir código"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '12px', padding: '6px 10px', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleProbarSmtp}
                    disabled={isTestingSmtp || !smtpHost || !smtpUser || !smtpPass}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}
                  >
                    {isTestingSmtp ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Probar Envío</span>
                      </>
                    )}
                  </button>
                </div>

                {testResult && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: testResult.exito ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${testResult.exito ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                    color: testResult.exito ? '#a7f3d0' : '#fca5a5'
                  }}>
                    {testResult.exito ? <CheckCircle size={14} style={{ color: '#34d399' }} /> : <AlertCircle size={14} style={{ color: '#f87171' }} />}
                    <span>{testResult.mensaje}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Servidor Central */}
            <div style={{ marginBottom: '18px', padding: '16px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                <Server size={16} />
                <span>Servidor Remoto (Supabase / VPS)</span>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                Conexión central para la replicación y respaldo de datos.
              </p>

              <div className="form-group">
                <label className="form-label">URL del Servidor</label>
                <input
                  type="text"
                  placeholder="https://servidor.dominio.com"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Clave de Acceso (API Key)</label>
                <input
                  type="password"
                  placeholder="Clave de autenticación..."
                  value={supabaseKey}
                  onChange={e => setSupabaseKey(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {/* Verifik API Key (Opcional) */}
            <div style={{ marginBottom: '18px', padding: '16px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                <Key size={16} />
                <span>Servicio SAIME Externo (Opcional)</span>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">API Key</label>
                <input
                  type="password"
                  placeholder="Token de acceso opcional..."
                  value={verifikKey}
                  onChange={e => setVerifikKey(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {/* Mantenimiento */}
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                <Database size={16} />
                <span>Mantenimiento de Registros</span>
              </div>
              <button
                type="button"
                onClick={handleReiniciarDatos}
                className="btn btn-secondary"
                style={{ fontSize: '12px', color: '#f87171', marginTop: '4px' }}
              >
                <RefreshCw size={13} />
                <span>Restablecer Registros</span>
              </button>
            </div>
          </div>

          <div className="modal-footer">
            {guardadoExitoso && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '13px', marginRight: 'auto' }}>
                <CheckCircle size={16} />
                <span>Configuración guardada.</span>
              </div>
            )}
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
