import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  FileText, 
  Database, 
  TrendingUp, 
  MapPin, 
  ArrowUpRight, 
  Activity,
  CreditCard,
  DollarSign,
  Trophy,
  Medal,
  Star,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { ESTADOS_VENEZUELA } from '../data/venezuela';
import { Registro, UsuarioSesion, isAdministradorBase, puedeVerNacional } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: any, action?: string) => void;
  sesion?: UsuarioSesion | null;
}

// Utilidad para inicio de semana (lunes)
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Bases de Paz conocidas para el ranking
const GRANDES_BASES: Record<string, string> = {
  'Caracas': 'Gran Base Caracas',
  'Miranda': 'Gran Base Miranda',
  'Zulia': 'Gran Base Zulia',
  'Carabobo': 'Gran Base Carabobo',
  'Aragua': 'Gran Base Aragua',
  'Lara': 'Gran Base Lara',
  'Bolivar': 'Gran Base Bolivar',
  'Merida': 'Gran Base Merida',
  'Anzoategui': 'Gran Base Anzoategui',
  'Sucre': 'Gran Base Sucre',
  'Trujillo': 'Gran Base Trujillo',
  'Tachira': 'Gran Base Tachira',
  'Falcon': 'Gran Base Falcon',
  'Monagas': 'Gran Base Monagas',
  'Yaracuy': 'Gran Base Yaracuy',
  'Barinas': 'Gran Base Barinas',
  'Cojedes': 'Gran Base Cojedes',
  'Portuguesa': 'Gran Base Portuguesa',
  'Apure': 'Gran Base Apure',
  'Guarico': 'Gran Base Guarico',
  'Nueva Esparta': 'Gran Base Nueva Esparta',
  'Delta Amacuro': 'Gran Base Delta Amacuro',
  'Amazonas': 'Gran Base Amazonas',
};

interface BaseRanking {
  estado: string;
  nombre: string;
  total_bs: number;
  total_usd: number;
  cantidad_pagos: number;
  porcentaje: number;
}

const MEDAL_COLORS = [
  { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', shadow: '0 8px 24px rgba(245,158,11,0.4)', icon: '🥇', label: '1°' },
  { bg: 'linear-gradient(135deg, #94a3b8, #64748b)', shadow: '0 8px 24px rgba(148,163,184,0.3)', icon: '🥈', label: '2°' },
  { bg: 'linear-gradient(135deg, #cd7c3e, #a05c2a)', shadow: '0 8px 24px rgba(205,124,62,0.35)', icon: '🥉', label: '3°' },
];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, sesion }) => {
  const esBaseAdmin = !!(sesion && isAdministradorBase(sesion));
  const baseAsignada = sesion?.base_misiones_nombre?.trim() || '';

  const [selectedEstado, setSelectedEstado] = useState<string>(() => {
    if (esBaseAdmin && sesion?.estado_asignado) {
      return sesion.estado_asignado;
    }
    return 'TODOS';
  });
  const [registros, setRegistros] = useState<Registro[]>(() => StorageService.obtenerRegistros());
  const [asistencias, setAsistencias] = useState(() => StorageService.obtenerAsistencias());
  const [pagos, setPagos] = useState(() => StorageService.obtenerPagos());
  const [tasaBcv, setTasaBcv] = useState<number>(36.5);

  const recargar = () => {
    setRegistros(StorageService.obtenerRegistros());
    setAsistencias(StorageService.obtenerAsistencias());
    setPagos(StorageService.obtenerPagos());
  };

  useEffect(() => {
    recargar();
  }, [selectedEstado]);

  useEffect(() => {
    window.addEventListener('mpv-data-updated', recargar);
    window.addEventListener('mpv-asistencia-updated', recargar);
    window.addEventListener('mpv-pagos-updated', recargar);
    // Try to grab latest BCV rate from storage
    const bcvData = localStorage.getItem('mpv-bcv-rate');
    if (bcvData) {
      try {
        const parsed = JSON.parse(bcvData);
        if (parsed.tasa) setTasaBcv(parsed.tasa);
      } catch {}
    }
    return () => {
      window.removeEventListener('mpv-data-updated', recargar);
      window.removeEventListener('mpv-asistencia-updated', recargar);
      window.removeEventListener('mpv-pagos-updated', recargar);
    };
  }, []);

  // Filtrado de alcance según rol
  const registrosScope = useMemo(() => {
    if (!esBaseAdmin || !baseAsignada) return registros;
    const baseNorm = baseAsignada.toLowerCase();
    return registros.filter(r => {
      const baseR = (r.datos?.base_misiones || r.ubicacion?.comunidad || '').toLowerCase();
      const op = (r.creado_por || '').toLowerCase();
      return (
        (baseR && (baseR.includes(baseNorm) || baseNorm.includes(baseR))) ||
        (sesion?.cedula && op === sesion.cedula.toLowerCase())
      );
    });
  }, [registros, esBaseAdmin, baseAsignada, sesion?.cedula]);

  const pagosScope = useMemo(() => {
    if (!esBaseAdmin || !baseAsignada) return pagos;
    const baseNorm = baseAsignada.toLowerCase();
    return pagos.filter(p => {
      const baseP = (p.ubicacion?.comunidad || '').toLowerCase();
      const op = (p.registrado_por || '').toLowerCase();
      return (
        (baseP && (baseP.includes(baseNorm) || baseNorm.includes(baseP))) ||
        (sesion?.cedula && op === sesion.cedula.toLowerCase())
      );
    });
  }, [pagos, esBaseAdmin, baseAsignada, sesion?.cedula]);

  const asistenciasScope = useMemo(() => {
    if (!esBaseAdmin || !baseAsignada) return asistencias;
    const baseNorm = baseAsignada.toLowerCase();
    return asistencias.filter(a => {
      const baseA = (a.ubicacion?.comunidad || '').toLowerCase();
      const op = (a.registrado_por || '').toLowerCase();
      return (
        (baseA && (baseA.includes(baseNorm) || baseNorm.includes(baseA))) ||
        (sesion?.cedula && op === sesion.cedula.toLowerCase())
      );
    });
  }, [asistencias, esBaseAdmin, baseAsignada, sesion?.cedula]);

  // Filter by state
  const registrosFiltrados = useMemo(() =>
    selectedEstado === 'TODOS'
      ? registrosScope
      : registrosScope.filter(r => r.ubicacion.estado === selectedEstado),
    [registrosScope, selectedEstado]
  );

  const personas = registrosFiltrados.filter(r => r.tipo === 'persona');
  const eventos = registrosFiltrados.filter(r => r.tipo === 'evento');
  const documentos = registrosFiltrados.filter(r => r.tipo === 'documento');
  const sincronizados = registrosFiltrados.filter(r => r.sincronizado).length;
  const syncTasa = registrosFiltrados.length > 0 ? Math.round((sincronizados / registrosFiltrados.length) * 100) : 100;

  // ─── Totales de caja (de base si es base admin, nacionales de lo contrario) ────
  const totalCajaBs = useMemo(() =>
    pagosScope.reduce((acc, p) => acc + Number(p.monto_bs || 0), 0),
    [pagosScope]
  );

  const totalCajaUsd = useMemo(() => {
    const fromPagos = pagosScope.reduce((acc, p) => acc + Number(p.monto_usd || 0), 0);
    return fromPagos > 0 ? fromPagos : (totalCajaBs / tasaBcv);
  }, [pagosScope, totalCajaBs, tasaBcv]);

  // ─── Ranking semanal de bases ─────────────────────────────────────────────
  const weekStart = useMemo(() => getStartOfWeek(new Date()), []);
  const pagosSemana = useMemo(() =>
    pagos.filter(p => new Date(p.creado_en) >= weekStart),
    [pagos, weekStart]
  );

  const rankingBases = useMemo<BaseRanking[]>(() => {
    const byEstado: Record<string, BaseRanking> = {};

    for (const p of pagosSemana) {
      const estado = p.ubicacion?.estado || 'Sin asignar';
      if (!byEstado[estado]) {
        byEstado[estado] = {
          estado,
          nombre: GRANDES_BASES[estado] || `Base ${estado}`,
          total_bs: 0,
          total_usd: 0,
          cantidad_pagos: 0,
          porcentaje: 0,
        };
      }
      byEstado[estado].total_bs += Number(p.monto_bs || 0);
      byEstado[estado].total_usd += Number(p.monto_usd || (Number(p.monto_bs) / tasaBcv));
      byEstado[estado].cantidad_pagos += 1;
    }

    const lista = Object.values(byEstado).sort((a, b) => b.total_bs - a.total_bs);
    const max = lista[0]?.total_bs || 1;
    lista.forEach(b => { b.porcentaje = Math.round((b.total_bs / max) * 100); });
    return lista;
  }, [pagosSemana, tasaBcv]);

  const totalSemanalBs = useMemo(() =>
    rankingBases.reduce((acc, b) => acc + b.total_bs, 0),
    [rankingBases]
  );

  const fmtBs = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtUsd = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Distribución por estado (personas)
  const conteoEstados: Record<string, number> = {};
  personas.forEach(r => {
    const est = r.ubicacion.estado || 'Sin Asignar';
    conteoEstados[est] = (conteoEstados[est] || 0) + 1;
  });

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#ffffff' }}>
            {esBaseAdmin ? `Panel de Control — ${baseAsignada || 'Mi Base'}` : 'Panel de Control'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {esBaseAdmin 
              ? 'Rendimiento y afluencia deportiva de la Gran Base de Paz asignada.'
              : 'Resumen nacional de operaciones, recaudación y rendimiento de bases.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px' }}>
            <MapPin size={16} style={{ color: 'var(--accent-amber)' }} />
            <span>Entidad Federal:</span>
          </div>
          {esBaseAdmin ? (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              color: '#fbbf24',
              fontWeight: 600
            }}>
              <span>Base: {baseAsignada || 'Asignada'} ({sesion?.estado_asignado || 'Local'})</span>
            </div>
          ) : (
            <select
              className="form-select"
              style={{ width: '220px' }}
              value={selectedEstado}
              onChange={e => setSelectedEstado(e.target.value)}
            >
              <option value="TODOS">Todos los Estados (Nacional)</option>
              {ESTADOS_VENEZUELA.map(e => (
                <option key={e.nombre} value={e.nombre}>{e.nombre}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(17, 26, 46, 0.9))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Personas</p>
              <h3 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-heading)', marginTop: '4px', color: '#60a5fa' }}>
                {personas.length}
              </h3>
            </div>
            <div style={{ padding: '10px', background: 'rgba(37, 99, 235, 0.2)', borderRadius: '12px', color: '#3b82f6' }}>
              <Users size={24} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <TrendingUp size={14} style={{ color: '#10b981' }} />
            <span>Beneficiarios en registro</span>
          </div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(17, 26, 46, 0.9))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actividades</p>
              <h3 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-heading)', marginTop: '4px', color: '#fbbf24' }}>
                {eventos.length}
              </h3>
            </div>
            <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '12px', color: '#f59e0b' }}>
              <Calendar size={24} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <span>Jornadas y eventos</span>
          </div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(17, 26, 46, 0.9))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {esBaseAdmin ? 'Caja de Mi Base' : 'Total Caja Nac.'}
              </p>
              <h3 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-heading)', marginTop: '4px', color: '#34d399', lineHeight: 1.2 }}>
                Bs. {fmtBs(totalCajaBs)}
              </h3>
              <p style={{ fontSize: '11px', color: '#60a5fa', marginTop: '3px' }}>
                ≈ $ {fmtUsd(totalCajaUsd)}
              </p>
            </div>
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px', color: '#10b981' }}>
              <DollarSign size={24} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <CreditCard size={14} style={{ color: '#34d399' }} />
            <span>{pagosScope.length} pagos registrados</span>
          </div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(17, 26, 46, 0.9))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sincronizacion</p>
              <h3 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-heading)', marginTop: '4px', color: '#a78bfa' }}>
                {syncTasa}%
              </h3>
            </div>
            <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '12px', color: '#8b5cf6' }}>
              <Database size={24} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <span>{sincronizados} de {registrosFiltrados.length} actualizados</span>
          </div>
        </div>
      </div>

      {/* Ranking Semanal + Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', marginBottom: '24px' }}>
        {/* ─── Ranking Semanal ─────────────────────────────────────────────── */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Trophy size={20} style={{ color: '#f59e0b' }} />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Ranking Semanal de Bases
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                Recaudacion del {weekStart.toLocaleDateString('es-VE')} al hoy
              </p>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total semana</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#34d399' }}>Bs. {fmtBs(totalSemanalBs)}</div>
            </div>
          </div>

          {rankingBases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#475569' }}>
              <BarChart3 size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
              <p style={{ fontSize: '13px' }}>No hay pagos registrados esta semana.</p>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>Los datos se actualizan automaticamente al registrar pagos.</p>
            </div>
          ) : (
            <>
              {/* Podio Top 3 */}
              {rankingBases.length >= 1 && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'flex-end', justifyContent: 'center' }}>
                  {/* 2nd place */}
                  {rankingBases.length >= 2 && (
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{
                        background: MEDAL_COLORS[1].bg,
                        borderRadius: '12px',
                        padding: '14px 10px',
                        boxShadow: MEDAL_COLORS[1].shadow,
                        marginBottom: '8px',
                        minHeight: '90px',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px',
                      }}>
                        <div style={{ fontSize: '22px' }}>{MEDAL_COLORS[1].icon}</div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#ffffff', textAlign: 'center', lineHeight: 1.2 }}>
                          {rankingBases[1].estado}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>
                        Bs. {fmtBs(rankingBases[1].total_bs)}
                      </div>
                      <div style={{ fontSize: '10px', color: '#475569' }}>{rankingBases[1].cantidad_pagos} pagos</div>
                    </div>
                  )}
                  {/* 1st place */}
                  <div style={{ flex: 1.2, textAlign: 'center' }}>
                    <div style={{
                      background: MEDAL_COLORS[0].bg,
                      borderRadius: '14px',
                      padding: '18px 10px',
                      boxShadow: MEDAL_COLORS[0].shadow,
                      marginBottom: '8px',
                      minHeight: '110px',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px',
                    }}>
                      <Star size={16} style={{ color: '#ffffff', marginBottom: '2px' }} />
                      <div style={{ fontSize: '24px' }}>{MEDAL_COLORS[0].icon}</div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff', textAlign: 'center', lineHeight: 1.2 }}>
                        {rankingBases[0].estado}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#fbbf24' }}>
                      Bs. {fmtBs(rankingBases[0].total_bs)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{rankingBases[0].cantidad_pagos} pagos</div>
                  </div>
                  {/* 3rd place */}
                  {rankingBases.length >= 3 && (
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{
                        background: MEDAL_COLORS[2].bg,
                        borderRadius: '12px',
                        padding: '14px 10px',
                        boxShadow: MEDAL_COLORS[2].shadow,
                        marginBottom: '8px',
                        minHeight: '80px',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px',
                      }}>
                        <div style={{ fontSize: '22px' }}>{MEDAL_COLORS[2].icon}</div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#ffffff', textAlign: 'center', lineHeight: 1.2 }}>
                          {rankingBases[2].estado}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#cd7c3e' }}>
                        Bs. {fmtBs(rankingBases[2].total_bs)}
                      </div>
                      <div style={{ fontSize: '10px', color: '#475569' }}>{rankingBases[2].cantidad_pagos} pagos</div>
                    </div>
                  )}
                </div>
              )}

              {/* Full ranking table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rankingBases.map((base, idx) => (
                  <div key={base.estado} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px', borderRadius: '8px',
                    background: idx < 3 ? 'rgba(255,255,255,0.04)' : 'transparent',
                    border: idx < 3 ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                  }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 800, minWidth: '24px', textAlign: 'center',
                      color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7c3e' : '#475569',
                    }}>
                      {idx + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {base.nombre}
                        </span>
                        <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, marginLeft: '8px', whiteSpace: 'nowrap' }}>
                          Bs. {fmtBs(base.total_bs)}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                        <div style={{
                          width: `${base.porcentaje}%`, height: '100%',
                          background: idx === 0 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                            : idx === 1 ? 'linear-gradient(90deg, #64748b, #94a3b8)'
                              : idx === 2 ? 'linear-gradient(90deg, #a05c2a, #cd7c3e)'
                                : 'linear-gradient(90deg, #2563eb, #38bdf8)',
                          borderRadius: '2px', transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '10px', color: '#64748b', minWidth: '40px' }}>
                      <div>{base.cantidad_pagos} pago{base.cantidad_pagos !== 1 ? 's' : ''}</div>
                      <div style={{ color: '#60a5fa' }}>$ {fmtUsd(base.total_usd)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quick actions */}
          <div className="card">
            <div className="card-title" style={{ fontSize: '16px' }}>
              <span>Acciones Rapidas</span>
            </div>
            <p className="card-subtitle" style={{ marginBottom: '14px' }}>Operaciones frecuentes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-primary" style={{ justifyContent: 'space-between' }} onClick={() => onNavigate('pagos')}>
                <span>💳 Caja y Pagos</span>
                <ArrowUpRight size={16} />
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'space-between' }} onClick={() => onNavigate('asistencia')}>
                <span>⏱️ Control de Asistencia</span>
                <ArrowUpRight size={16} />
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'space-between' }} onClick={() => onNavigate('personas', 'new-persona')}>
                <span>+ Registrar Persona</span>
                <ArrowUpRight size={16} />
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'space-between' }} onClick={() => onNavigate('importador')}>
                <span>📂 Importar Archivo</span>
                <ArrowUpRight size={16} />
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'space-between' }} onClick={() => onNavigate('eventos', 'new-evento')}>
                <span>+ Registrar Actividad</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>

          {/* Operational status */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Activity size={18} style={{ color: '#34d399' }} />
              <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>Estado Operativo</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Almacenamiento:</span>
                <strong style={{ color: '#e2e8f0' }}>Local Activo</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Registros:</span>
                <strong style={{ color: '#60a5fa' }}>{registros.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Asistencia Activa:</span>
                <strong style={{ color: '#34d399' }}>{asistencias.filter(a => a.estado === 'Activo').length} atletas</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tasa BCV:</span>
                <strong style={{ color: '#fbbf24' }}>Bs. {tasaBcv.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution by State */}
      {personas.length > 0 && (
        <div className="card">
          <div className="card-title">
            <MapPin size={20} style={{ color: 'var(--accent-amber)' }} />
            <span>Distribucion por Entidad Federal</span>
          </div>
          <p className="card-subtitle">Personas registradas por estado</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(conteoEstados).slice(0, 10).map(([estado, cantidad]) => {
              const porcentaje = Math.min(100, Math.round((cantidad / personas.length) * 100));
              return (
                <div key={estado}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{estado}</span>
                    <span style={{ color: '#94a3b8' }}>{cantidad} ({porcentaje}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${porcentaje}%`, height: '100%', background: 'linear-gradient(90deg, #2563eb, #38bdf8)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
