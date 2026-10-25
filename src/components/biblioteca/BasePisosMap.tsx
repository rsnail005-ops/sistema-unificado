import React from 'react';
import { BaseDisciplina, PISOS_BASE } from '../../types';
import { Users, Clock, DollarSign } from 'lucide-react';

interface BasePisosMapProps {
  disciplinas: BaseDisciplina[];
}

const PISO_COLORS: Record<string, string> = {
  'Recepcion': '#06b6d4',
  'Piso 1': '#10b981',
  'Piso 2': '#f59e0b',
  'Piso 3': '#8b5cf6',
  'Piso 4': '#ec4899',
  'Piso 5': '#ef4444',
};

function normalizePiso(p: string): string {
  return p.normalize('NFD').replace(/\p{M}/gu, '');
}

export const BasePisosMap: React.FC<BasePisosMapProps> = ({ disciplinas }) => {
  const grouped: Record<string, BaseDisciplina[]> = {};
  PISOS_BASE.forEach(p => { grouped[p] = []; });
  disciplinas.forEach(d => {
    const key = (PISOS_BASE as readonly string[]).find(p => p === d.piso) || d.piso;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  });

  const pisosInvertidos = [...PISOS_BASE].reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pisosInvertidos.map((piso, idx) => {
        const items = grouped[piso] || [];
        const colorKey = normalizePiso(piso);
        const color = PISO_COLORS[colorKey] || '#7c3aed';
        const bgColor = color + '22';
        const borderColor = color + '50';
        const itemBg = color + '18';
        const itemBorder = color + '44';
        return (
          <div key={piso} style={{
            display: 'flex', alignItems: 'stretch', gap: 0,
            borderRadius: 12, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{
              minWidth: 110, padding: '14px 16px',
              background: bgColor,
              borderRight: '2px solid ' + color,
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {piso}
              </span>
              <span style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                {items.length} actividad{items.length !== 1 ? 'es' : ''}
              </span>
            </div>
            <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {items.length === 0 ? (
                <span style={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>Sin actividades registradas</span>
              ) : items.map(d => (
                <div key={d.id} style={{
                  background: itemBg,
                  border: '1px solid ' + itemBorder,
                  borderRadius: 8, padding: '6px 12px',
                  display: 'flex', flexDirection: 'column', gap: 3,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{d.nombre}</span>
                  {d.tutor && (
                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={10} /> {d.tutor}
                    </span>
                  )}
                  {d.horarios && d.horarios.length > 0 && (
                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} /> {d.horarios[0].hora_inicio}-{d.horarios[0].hora_fin}
                    </span>
                  )}
                  {d.precio_bs != null && (
                    <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <DollarSign size={10} /> Bs {d.precio_bs.toFixed(0)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};