import React, { useState, useEffect } from 'react';
import {
  Code2, Upload, RefreshCw, CheckCircle2, AlertTriangle,
  Clock, Globe, Shield, Wifi, Database, Loader2, ChevronDown, ChevronUp, Tag,
  FolderOpen, Key, HardDrive, Eye, EyeOff, Sparkles, Check
} from 'lucide-react';
import { UpdateService, AppRelease, APP_VERSION } from '../services/updateService';
import { SupabaseService } from '../services/supabase';
import { StorageService } from '../services/storage';
import { UsuarioSesion } from '../types';

interface DeveloperPanelProps {
  sesion: UsuarioSesion;
}

interface DetectedExe {
  found: boolean;
  fileName?: string;
  filePath?: string;
  sizeBytes?: number;
  sizeMB?: string;
  mtime?: string | Date;
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

  // GitHub Token & Credenciales (cargado de localStorage)
  const [ghToken, setGhToken] = useState(() => {
    return localStorage.getItem('mpv_github_token') || '';
  });
  const [showToken, setShowToken] = useState(false);
  const [recordarToken, setRecordarToken] = useState(true);

  // Detección automática del binario .exe
  const [detectedExe, setDetectedExe] = useState<DetectedExe>({ found: false });
  const [buscandoExe, setBuscandoExe] = useState(false);

  // Formulario nuevo release
  const [form, setForm] = useState({
    version: '',
    titulo: '',
    notas: '',
    obligatoria: true,
  });

  // Progreso de subida
  const [publicando, setPublicando] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    phase: 'creating_release' | 'uploading' | 'registering' | 'completed';
    percent: number;
    message: string;
    loadedMB?: string;
    totalMB?: string;
  } | null>(null);

  const [pubMsg, setPubMsg] = useState<{ tipo: 'ok' | 'err'; texto: string; rlsError?: boolean } | null>(null);

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
        const totalLocal = StorageService.obtenerRegistros().length;
        setHealth({ supabase: 'ok', latencia, registros: totalLocal });
      } else {
        setHealth({ supabase: 'error', latencia, registros: null });
      }
    } catch {
      setHealth({ supabase: 'error', latencia: Date.now() - t0, registros: null });
    }
  };

  const detectarExeLocal = async () => {
    setBuscandoExe(true);
    try {
      if (typeof window !== 'undefined' && (window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        const preferredPath = localStorage.getItem('mpv_last_exe_path') || undefined;
        const res = await ipcRenderer.invoke('updater:detectLatestExe', { preferredPath });
        if (res && res.found) {
          setDetectedExe(res);
          if (res.filePath) {
            localStorage.setItem('mpv_last_exe_path', res.filePath);
          }
        } else {
          setDetectedExe({ found: false });
        }
      }
    } catch (err) {
      console.warn('Error al detectar .exe:', err);
    } finally {
      setBuscandoExe(false);
    }
  };

  const seleccionarExeManual = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        const res = await ipcRenderer.invoke('updater:selectExe');
        if (res && res.found) {
          setDetectedExe(res);
          if (res.filePath) {
            localStorage.setItem('mpv_last_exe_path', res.filePath);
          }
        }
      }
    } catch (err) {
      console.warn('Error al seleccionar .exe:', err);
    }
  };

  useEffect(() => {
    cargarReleases();
    verificarSalud();
    detectarExeLocal();

    // Listener de progreso emitido por el proceso principal de Electron
    if (typeof window !== 'undefined' && (window as any).require) {
      const { ipcRenderer } = (window as any).require('electron');
      const handleProgress = (_event: any, data: any) => {
        setUploadProgress(prev => ({
          phase: data.phase,
          percent: data.percent,
          message: data.message,
          loadedMB: data.loadedBytes ? (data.loadedBytes / (1024 * 1024)).toFixed(1) : prev?.loadedMB,
          totalMB: data.totalBytes ? (data.totalBytes / (1024 * 1024)).toFixed(1) : prev?.totalMB,
        }));
      };
      ipcRenderer.on('updater:uploadProgress', handleProgress);
      return () => {
        ipcRenderer.removeListener('updater:uploadProgress', handleProgress);
      };
    }
  }, []);

  const subirYPublicar = async () => {
    setPubMsg(null);

    if (!form.version.trim()) {
      setPubMsg({ tipo: 'err', texto: 'Debes ingresar el número de versión (ejemplo: 1.5).' });
      return;
    }
    if (!form.titulo.trim()) {
      setPubMsg({ tipo: 'err', texto: 'Debes ingresar un título para la actualización.' });
      return;
    }
    if (!ghToken.trim()) {
      setPubMsg({ tipo: 'err', texto: 'Ingresa tu Token de GitHub para poder subir el archivo automáticamente.' });
      return;
    }
    if (!detectedExe.found || !detectedExe.filePath) {
      setPubMsg({ tipo: 'err', texto: 'No se ha detectado ningún instalador .exe. Compila la app o elígelo con "Examinar".' });
      return;
    }

    if (recordarToken) {
      localStorage.setItem('mpv_github_token', ghToken.trim());
    }

    setPublicando(true);
    setUploadProgress({
      phase: 'creating_release',
      percent: 5,
      message: 'Conectando con GitHub...',
      totalMB: detectedExe.sizeMB
    });

    try {
      if (typeof window === 'undefined' || !(window as any).require) {
        throw new Error('Esta función requiere ejecutar la aplicación en su versión de escritorio compilada (.exe).');
      }
      const { ipcRenderer } = (window as any).require('electron');

      // 1. Crear release en GitHub y subir el archivo binario
      const ghRes = await ipcRenderer.invoke('updater:publishToGitHub', {
        token: ghToken.trim(),
        owner: 'rsnail005-ops',
        repo: 'sistema-unificado',
        tag: form.version.trim(),
        title: form.titulo.trim(),
        notes: form.notas.trim(),
        filePath: detectedExe.filePath
      });

      if (!ghRes.ok || !ghRes.downloadUrl) {
        throw new Error(ghRes.error || 'Error al subir el ejecutable a GitHub Releases.');
      }

      // 2. Registrar en Supabase
      setUploadProgress(prev => ({
        phase: 'registering',
        percent: 95,
        message: 'Registrando nueva versión en la base de datos Supabase...',
        loadedMB: prev?.totalMB,
        totalMB: prev?.totalMB
      }));

      const dbRes = await UpdateService.publicarRelease({
        version: form.version.trim(),
        titulo: form.titulo.trim(),
        notas: form.notas.trim(),
        download_url: ghRes.downloadUrl,
        obligatoria: form.obligatoria,
        publicado_por: sesion.cedula
      }, getToken());

      if (!dbRes.ok) {
        const errText = dbRes.error || '';
        const isRls = errText.includes('42501') || errText.includes('violates row-level security');
        setPubMsg({
          tipo: 'err',
          texto: isRls
            ? 'El ejecutable se subió a GitHub con éxito, pero Supabase bloqueó el registro por permisos de Row-Level Security (RLS).'
            : `Error al registrar en Supabase: ${errText}`,
          rlsError: isRls
        });
        setUploadProgress(null);
        return;
      }

      // 3. Todo completado
      setUploadProgress({
        phase: 'completed',
        percent: 100,
        message: '¡Versión publicada exitosamente en GitHub y Supabase!'
      });

      setPubMsg({
        tipo: 'ok',
        texto: `🎉 ¡Versión v${form.version} publicada con éxito! El instalador está disponible en GitHub y todos los usuarios recibirán el aviso de actualización automáticamente.`
      });

      setForm({ version: '', titulo: '', notas: '', obligatoria: true });
      cargarReleases();

    } catch (err: any) {
      setUploadProgress(null);
      setPubMsg({ tipo: 'err', texto: err.message || 'Error inesperado durante la subida.' });
    } finally {
      setPublicando(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, color: '#e2e8f0', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    userSelect: 'text',
    WebkitUserSelect: 'text',
    ['WebkitAppRegion' as any]: 'no-drag',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 6,
    fontSize: 12, fontWeight: 600,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <div style={{ padding: '0 0 40px 0', maxWidth: 900 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 28, paddingBottom: 22,
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
            &nbsp;·&nbsp;Desarrollador: <strong style={{ color: '#a78bfa' }}>{sesion.nombres} {sesion.apellidos}</strong>
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

        {/* ─── Publicación Automática a GitHub Releases ─── */}
        {card(
          <>
            {sectionTitle(<Upload size={16} color="#fff" />, 'Publicación Automática a GitHub')}

            {/* 1. Selector de Binario .exe */}
            <div style={{
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: 12, padding: '16px',
              marginBottom: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HardDrive size={18} color="#a78bfa" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
                    Instalador Ejecutable para Windows (.exe)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={detectarExeLocal}
                    disabled={buscandoExe || publicando}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 8, padding: '6px 12px',
                      color: '#cbd5e1', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <RefreshCw size={12} className={buscandoExe ? 'animate-spin' : ''} />
                    <span>Re-detectar</span>
                  </button>
                  <button
                    onClick={seleccionarExeManual}
                    disabled={publicando}
                    style={{
                      background: 'rgba(124,58,237,0.3)',
                      border: '1px solid rgba(124,58,237,0.5)',
                      borderRadius: 8, padding: '6px 12px',
                      color: '#c4b5fd', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <FolderOpen size={13} />
                    <span>Examinar...</span>
                  </button>
                </div>
              </div>

              {detectedExe.found ? (
                <div style={{
                  background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#38bdf8', wordBreak: 'break-all' }}>
                      {detectedExe.fileName}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                      Tamaño: <strong style={{ color: '#f59e0b' }}>{detectedExe.sizeMB} MB</strong> · Listo para ser subido
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                    background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)',
                    display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    <Check size={12} /> Detectado
                  </span>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px dashed rgba(239,68,68,0.3)',
                  borderRadius: 8, padding: '12px 14px', color: '#fca5a5', fontSize: 12.5,
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <AlertTriangle size={16} />
                  <span>No se encontró ningún .exe en dist-electron/. Usa el botón «Examinar...» para seleccionarlo.</span>
                </div>
              )}
            </div>

            {/* 2. Token de GitHub */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  <Key size={12} style={{ display: 'inline', marginRight: 4 }} />
                  GitHub Personal Access Token (PAT)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                  <input
                    type="checkbox"
                    id="recordarToken"
                    checked={recordarToken}
                    onChange={e => setRecordarToken(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="recordarToken" style={{ cursor: 'pointer' }}>Recordar token en este equipo</label>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  style={{ ...inputStyle, paddingRight: 40, fontFamily: 'monospace', fontSize: 13 }}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={ghToken}
                  onChange={e => setGhToken(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Destino: <strong>github.com/rsnail005-ops/sistema-unificado</strong> (Releases)
              </div>
            </div>

            {/* 3. Formulario del Release */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Número de versión *</label>
                <input
                  style={inputStyle}
                  placeholder="ej. 1.5"
                  value={form.version}
                  onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>Título del release *</label>
                <input
                  style={inputStyle}
                  placeholder="ej. Actualización del Sistema v1.5"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Notas de la versión (lo que verán los usuarios)</label>
              <textarea
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="• Se añadió un nuevo rol&#10;• Se optimizó la sincronización&#10;• Correcciones generales"
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
                  {form.obligatoria ? 'OBLIGATORIA (bloquea la app hasta actualizar)' : 'opcional'}
                </strong>
              </span>
            </div>

            {/* Barra de progreso interactiva en vivo */}
            {uploadProgress && (
              <div style={{
                background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.35)',
                borderRadius: 12, padding: '16px', marginBottom: 18,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#c4b5fd' }}>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{uploadProgress.message}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#a78bfa' }}>
                    {uploadProgress.percent}%
                  </span>
                </div>

                <div style={{
                  width: '100%', height: 8, background: 'rgba(255,255,255,0.1)',
                  borderRadius: 4, overflow: 'hidden', marginBottom: 8
                }}>
                  <div style={{
                    width: `${uploadProgress.percent}%`, height: '100%',
                    background: 'linear-gradient(90deg, #7c3aed, #38bdf8)',
                    transition: 'width 0.2s ease-out'
                  }} />
                </div>

                {uploadProgress.loadedMB && uploadProgress.totalMB && (
                  <div style={{ fontSize: 11.5, color: '#94a3b8', textAlign: 'right' }}>
                    Transferidos: <strong>{uploadProgress.loadedMB} MB</strong> de <strong>{uploadProgress.totalMB} MB</strong>
                  </div>
                )}
              </div>
            )}

            {/* Mensajes de resultado */}
            {pubMsg && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                background: pubMsg.tipo === 'ok' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${pubMsg.tipo === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: 10, padding: '12px 16px', marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {pubMsg.tipo === 'ok'
                    ? <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                    : <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />}
                  <span style={{ fontSize: 13, color: pubMsg.tipo === 'ok' ? '#34d399' : '#fca5a5', lineHeight: 1.5 }}>
                    {pubMsg.texto}
                  </span>
                </div>

                {pubMsg.rlsError && (
                  <div style={{
                    marginTop: 8, padding: '10px 12px', background: 'rgba(0,0,0,0.3)',
                    borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
                      💡 Solución (ejecuta esto en Supabase SQL Editor una sola vez):
                    </div>
                    <pre style={{
                      margin: 0, fontSize: 11, color: '#cbd5e1', background: 'rgba(0,0,0,0.4)',
                      padding: '8px', borderRadius: 6, overflowX: 'auto', userSelect: 'all'
                    }}>
{`DROP POLICY IF EXISTS "releases_insert_authenticated" ON public.app_releases;
DROP POLICY IF EXISTS "releases_insert_all" ON public.app_releases;
CREATE POLICY "releases_insert_all" ON public.app_releases FOR INSERT WITH CHECK (true);
CREATE POLICY "releases_select_all" ON public.app_releases FOR SELECT USING (true);`}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={subirYPublicar}
              disabled={publicando}
              style={{
                padding: '13px 30px',
                background: publicando ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none', borderRadius: 12, cursor: publicando ? 'not-allowed' : 'pointer',
                color: '#fff', fontSize: 14.5, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: publicando ? 'none' : '0 8px 24px rgba(124,58,237,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {publicando
                ? <><Loader2 size={18} className="animate-spin" /> Subiendo a GitHub...</>
                : <><Sparkles size={18} /> Subir a GitHub y Publicar Versión</>}
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
                <Loader2 size={18} className="animate-spin" />
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
    </div>
  );
};
