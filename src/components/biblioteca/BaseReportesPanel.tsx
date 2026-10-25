import React, { useState } from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import { BaseReporte } from '../../types';
import { SupabaseService } from '../../services/supabase';

interface BaseReportesPanelProps {
  baseId: string;
  cedula: string;
  reportes: BaseReporte[];
  onReporteGenerado: (r: BaseReporte) => void;
}

function getPeriodo(tipo: 'semanal' | 'mensual'): string {
  const now = new Date();
  if (tipo === 'mensual') {
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    return now.getFullYear() + '-' + mes;
  }
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - startOfYear.getTime();
  const week = Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
  return now.getFullYear() + '-W' + String(week).padStart(2, '0');
}

export const BaseReportesPanel: React.FC<BaseReportesPanelProps> = ({ baseId, cedula, reportes, onReporteGenerado }) => {
  const [tipo, setTipo] = useState<'semanal' | 'mensual'>('mensual');
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  const [seleccionado, setSeleccionado] = useState<BaseReporte | null>(null);

  const handleGenerar = async () => {
    setGenerando(true);
    setError('');
    const periodo = getPeriodo(tipo);
    const statsRes = await SupabaseService.obtenerStatsBase(baseId);
    const datos = statsRes.ok ? (statsRes.data || {}) : {};
    const res = await SupabaseService.generarReporteManual(baseId, tipo, datos, periodo, cedula);
    setGenerando(false);
    if (!res.ok) { setError(res.error || 'Error al generar'); return; }
    onReporteGenerado(res.data);
  };

  const filtrados = reportes.filter(r => r.tipo === tipo);

  const tabBtn = (t: 'semanal' | 'mensual'): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    border: 'none',
    background: tipo === t ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.05)',
    color: tipo === t ? '#fff' : '#94a3b8',
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button style={tabBtn('mensual')} onClick={() => setTipo('mensual')}>Mensual</button>
        <button style={tabBtn('semanal')} onClick={() => setTipo('semanal')}>Semanal</button>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={handleGenerar}
            disabled={generando}
            style={{
              padding: '8px 18px', borderRadius: 8, cursor: generando ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              background: generando ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #059669, #10b981)',
              border: 'none', color: '#fff',
            }}
          >
            <RefreshCw size={14} />
            {generando ? 'Generando...' : 'Generar ' + tipo}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {filtrados.length === 0 ? (
          <div style={{ color: '#475569', fontSize: 13, fontStyle: 'italic', padding: 24, width: '100%', textAlign: 'center' }}>
            No hay reportes generados todavia
          </div>
        ) : filtrados.map(r => {
          const isSelected = seleccionado?.id === r.id;
          const bg = isSelected ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)';
          const borderC = isSelected ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)';
          return (
            <div
              key={r.id}
              onClick={() => setSeleccionado(isSelected ? null : r)}
              style={{
                padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                background: bg, border: '1px solid ' + borderC,
                minWidth: 180, flex: '0 0 auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Calendar size={14} color="#7c3aed" />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{r.periodo}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {new Date(r.generado_en).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {r.generado_por === 'sistema' ? 'Sistema automatico' : r.generado_por}
              </div>
            </div>
          );
        })}
      </div>

      {seleccionado && (
        <div style={{
          marginTop: 20, padding: 20, borderRadius: 14,
          background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
        }}>
          <h4 style={{ margin: '0 0 14px 0', color: '#c4b5fd', fontSize: 14 }}>
            Resumen del periodo {seleccionado.periodo}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Personas', val: seleccionado.datos_json?.total_personas ?? '-' },
              { label: 'Activas', val: seleccionado.datos_json?.personas_activas ?? '-' },
              { label: 'Asistencias', val: seleccionado.datos_json?.total_asistencias ?? '-' },
              { label: 'Pagos', val: seleccionado.datos_json?.total_pagos ?? '-' },
              { label: 'Ingresos Bs', val: seleccionado.datos_json?.ingresos_bs != null ? 'Bs ' + Number(seleccionado.datos_json.ingresos_bs).toFixed(0) : '-' },
              { label: 'Ingresos USD', val: seleccionado.datos_json?.ingresos_usd != null ? '$' + Number(seleccionado.datos_json.ingresos_usd).toFixed(2) : '-' },
            ].map(({ label, val }) => (
              <div key={label} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0' }}>{val}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};