import React, { useState, useEffect } from 'react';
import {
  Code2, Upload, RefreshCw, CheckCircle2, AlertTriangle,
  Clock, Globe, Shield, Wifi, Database, Loader2, ChevronDown, ChevronUp, Tag
} from 'lucide-react';
import { UpdateService, AppRelease, APP_VERSION } from '../services/updateService';
import { SupabaseService } from '../services/supabase';
import { StorageService } from '../services/storage';
import { UsuarioSesion } from '../types';

interface DeveloperPanelProps {
  sesion: UsuarioSesion;
}

const card = (children: React.ReactNode, style?: React.CSSProperties) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '20px 24px',
    ...style,
  }}>
    {children}
  </div>
);

const sectionTitle = (icon: React.ReactNode, text: string) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
    <div style={{
      width: 34, height: 34, borderRadius: 10,
      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
    }}>{icon}</div>
    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{text}</h3>
  </div>
);

export const DeveloperPanel: React.FC<DeveloperPanelProps> = ({ sesion }) => {
  const [releases, setReleases] = useState<AppRelease[]>([]);
  const [cargandoReleases, setCargandoReleases] = useState(true);

  // Formulario nuevo release
  const [form, setForm] = useState({
    version: '',
    titulo: '',
    notas: '',
    download_url: '',
    obligatoria: true,
  });
  const [publicando, setPublicando] = useState(false);
  const [pubMsg, setPubMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  // Monitor de salud
  const [health, setHealth] = useState<{
    supabase: 'ok' | 'error' | 'checking';
    latencia: number | null;
    registros: number | null;
  }>({ supabase: 'checking', latencia: null, registros: null });

  const [expandedRelease, setExpandedRelease] = useState<string | null>(null);

  // Obtener token del usuario actual (Supabase auth)
  const getToken = (): string => {
    try {
      const raw = localStorage.getItem('sb-auth-token') ||
        localStorage.getItem('supabase.auth.token');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.access_token || parsed?.currentSession?.access_token || SupabaseService.getKey();
      }
    } catch { /* noop */ }
    return SupabaseService.getKey();
  };

  const cargarReleases = async () => {
    setCargandoReleases(true);
    const data = await UpdateService.listarReleases(getToken());
    setReleases(data);
    setCargandoReleases(false);
  };

  const verificarSalud = async () => {
    setHealth(h => ({ ...h, supabase: 'checking' }));
    const t0 = Date.now();
    try {
      const url = SupabaseService.getUrl();
      const key = SupabaseService.getKey();
      const res = await fetch(`${url}/rest/v1/perfiles?limit=1&select=id`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      const latencia = Date.now() - t0;
      if (res.ok) {
        const config = StorageService.obtenerConfig();
        const totalLocal = StorageService.obtenerRegistros().length;
        setHealth({ supabase: 'ok', latencia, registros: totalLocal });
      } else {
        setHealth({ supabase: 'error', latencia, registros: null });
      }
    } catch {
      setHealth({ supabase: 'error', latencia: Date.now() - t0, registros: null });
    }
  };

  useEffect(() => {
    cargarReleases();
    verificarSalud();
  }, []);

  const publicarRelease = async () => {
    if (!form.version || !form.titulo || !form.download_url) {
      setPubMsg({ tipo: 'err', texto: 'Versión, Título y URL de descarga son obligatorios.' });
      return;
    }
    setPublicando(true);
    setPubMsg(null);
    const res = await UpdateService.publicarRelease(
      { ...form, publicado_por: sesion.cedula },
      getToken()
    );
    setPublicando(false);
    if (res.ok) {
      setPubMsg({ tipo: 'ok', texto: `✓ Versión v${form.version} publicada correctamente.` });
      setForm({ version: '', titulo: '', notas: '', download_url: '', obligatoria: true });
      cargarReleases();
    } else {
      setPubMsg({ tipo: 'err', texto: res.error || 'Error al publicar.' });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, color: '#e2e8f0', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 6,
    fontSize: 12, fontWeight: 600,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <div style={{ padding: '0 0 40px 0', maxWidth: 860 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 32, paddingBottom: 24,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 32px rgba(124,58,237,0.4)',
        }}>
          <Code2 size={28} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>
            Panel de Desarrollador
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
            Versión instalada: <strong style={{ color: '#7c3aed' }}>v{APP_VERSION}</strong>
            &nbsp;·&nbsp;Operador: <strong style={{ color: '#a78bfa' }}>{sesion.nombres} {sesion.apellidos}</strong>
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>

        {/* ─── Monitor de Salud ─── */}
        {card(
          <>
            {sectionTitle(<Globe size={16} color="#fff" />, 'Monitor de Salud del Sistema')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {/* Supabase */}
              <div style={{
                background: health.supabase === 'ok'
                  ? 'rgba(16,185,129,0.1)' : health.supabase === 'error'
                    ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${health.supabase === 'ok'
                  ? 'rgba(16,185,129,0.3)' : health.supabase === 'error'
                    ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Database size={16} color={health.supabase === 'ok' ? '#10b981' : health.supabase === 'error' ? '#ef4444' : '#94a3b8'} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Supabase</span>
                </div>
                {health.supabase === 'checking'
                  ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />
                  : <div style={{ fontSize: 20, fontWeight: 800, color: health.supabase === 'ok' ? '#10b981' : '#ef4444' }}>
                    {health.supabase === 'ok' ? 'En línea' : 'Error'}
                  </div>
                }
              </div>

              {/* Latencia */}
              <div style={{
                background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Wifi size={16} color="#60a5fa" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Latencia</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#60a5fa' }}>
                  {health.latencia !== null ? `${health.latencia} ms` : '—'}
                </div>
              </div>

              {/* Registros locales */}
              <div style={{
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Shield size={16} color="#f59e0b" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Registros locales</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>
                  {health.registros !== null ? health.registros.toLocaleString() : '—'}
                </div>
              </div>
            </div>

            <button
              onClick={verificarSalud}
              style={{
                marginTop: 16, padding: '8px 18px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, cursor: 'pointer',
                color: '#94a3b8', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <RefreshCw size={14} />
              Refrescar
            </button>
          </>
        )}

        {/* ─── Publicar nuevo release ─── */}
        {card(
          <>
            {sectionTitle(<Upload size={16} color="#fff" />, 'Publicar Nueva Versión')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Número de versión *</label>
                <input
                  style={inputStyle}
                  placeholder="ej. 1.2.0"
                  value={form.version}
                  onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>Título del release *</label>
                <input
                  style={inputStyle}
                  placeholder="ej. Actualización de seguridad"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>URL de descarga (.exe en GitHub Releases) *</label>
              <input
                style={inputStyle}
                placeholder="https://github.com/org/repo/releases/download/v1.2.0/setup.exe"
                value={form.download_url}
                onChange={e => setForm(f => ({ ...f, download_url: e.target.value }))}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Notas de la versión</label>
              <textarea
                style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="• Corrección de errores&#10;• Nueva funcionalidad X&#10;• Mejoras de rendimiento"
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button
                onClick={() => setForm(f => ({ ...f, obligatoria: !f.obligatoria }))}
                style={{
                  width: 42, height: 24, borderRadius: 12,
                  background: form.obligatoria ? 'linear-gradient(90deg, #dc2626, #ef4444)' : 'rgba(255,255,255,0.1)',
                  border: 'none', cursor: 'pointer',
                  transition: 'background 0.25s',
                  position: 'relative', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: form.obligatoria ? 21 : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                }} />
              </button>
              <span style={{ fontSize: 13, color: '#cbd5e1' }}>
                Actualización <strong style={{ color: form.obligatoria ? '#f87171' : '#94a3b8' }}>
                  {form.obligatoria ? 'OBLIGATORIA' : 'opcional'}
                </strong>
              </span>
            </div>

            {pubMsg && (
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: pubMsg.tipo === 'ok' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${pubMsg.tipo === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              }}>
                {pubMsg.tipo === 'ok'
                  ? <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                  : <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />}
                <span style={{ fontSize: 13, color: pubMsg.tipo === 'ok' ? '#34d399' : '#fca5a5' }}>
                  {pubMsg.texto}
                </span>
              </div>
            )}

            <button
              onClick={publicarRelease}
              disabled={publicando}
              style={{
                padding: '12px 28px',
                background: publicando ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none', borderRadius: 12, cursor: publicando ? 'not-allowed' : 'pointer',
                color: '#fff', fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: publicando ? 'none' : '0 8px 24px rgba(124,58,237,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {publicando
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Publicando...</>
                : <><Upload size={16} /> Publicar Release</>}
            </button>
          </>
        )}

        {/* ─── Historial de releases ─── */}
        {card(
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              {sectionTitle(<Clock size={16} color="#fff" />, 'Historial de Versiones')}
              <button
                onClick={cargarReleases}
                style={{
                  padding: '6px 14px', marginBottom: 18,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, cursor: 'pointer', color: '#94a3b8', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <RefreshCw size={13} />
                Recargar
              </button>
            </div>

            {cargandoReleases
              ? <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#64748b', padding: '20px 0' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Cargando historial…
              </div>
              : releases.length === 0
                ? <div style={{ color: '#64748b', fontSize: 14, padding: '20px 0' }}>
                  No hay releases publicados todavía.
                </div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {releases.map(r => (
                    <div key={r.id} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12, overflow: 'hidden',
                    }}>
                      <div
                        onClick={() => setExpandedRelease(expandedRelease === r.id ? null : r.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px', cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', color: '#fff',
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <Tag size={10} /> v{r.version}
                        </div>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{r.titulo}</span>
                        {r.obligatoria && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: '#fca5a5',
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 6, padding: '2px 7px',
                          }}>OBLIGATORIA</span>
                        )}
                        <span style={{ fontSize: 11, color: '#475569' }}>
                          {new Date(r.publicado_en).toLocaleDateString('es-VE')}
                        </span>
                        {expandedRelease === r.id
                          ? <ChevronUp size={16} color="#64748b" />
                          : <ChevronDown size={16} color="#64748b" />}
                      </div>
                      {expandedRelease === r.id && r.notas && (
                        <div style={{
                          padding: '0 16px 14px 16px',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                        }}>
                          <pre style={{
                            margin: '12px 0 0 0', fontFamily: 'inherit',
                            fontSize: 13, color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.7,
                          }}>{r.notas}</pre>
                          <p style={{ margin: '10px 0 0 0', fontSize: 11, color: '#475569' }}>
                            URL: <a href={r.download_url} target="_blank" rel="noopener noreferrer"
                              style={{ color: '#60a5fa' }}>{r.download_url}</a>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
            }
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
