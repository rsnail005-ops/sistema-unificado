import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface Persona {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  estado_solvencia?: string;
  plan_activo?: string;
  tipo_membresia?: string;
  fecha_vencimiento?: string;
}

interface BasePersonasTableProps {
  personas: Persona[];
}

const ESTADO_COLOR: Record<string, string> = {
  activo: '#10b981',
  solvente: '#10b981',
  vencido: '#ef4444',
  deuda: '#ef4444',
  suspendido: '#f59e0b',
};

function getColor(estado?: string): string {
  const key = (estado || '').toLowerCase();
  if (key.includes('proximo') || key.includes('vencer')) return '#f59e0b';
  return ESTADO_COLOR[key] || '#94a3b8';
}

export const BasePersonasTable: React.FC<BasePersonasTableProps> = ({ personas }) => {
  const [busqueda, setBusqueda] = useState('');

  const filtradas = personas.filter(p => {
    const q = busqueda.toLowerCase();
    return (
      (p.cedula || '').toLowerCase().includes(q) ||
      (p.nombres || '').toLowerCase().includes(q) ||
      (p.apellidos || '').toLowerCase().includes(q)
    );
  });

  const th: React.CSSProperties = {
    padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  };

  const td: React.CSSProperties = {
    padding: '11px 14px', fontSize: 13, color: '#cbd5e1',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  };

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o cedula..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10, boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#e2e8f0', fontSize: 14, outline: 'none',
          }}
        />
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              <th style={th}>Nombre</th>
              <th style={th}>Cedula</th>
              <th style={th}>Membresia</th>
              <th style={th}>Plan</th>
              <th style={th}>Vencimiento</th>
              <th style={th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: 'center', color: '#475569', fontStyle: 'italic', padding: 32 }}>
                  {personas.length === 0 ? 'No hay personas registradas en esta base' : 'Sin resultados para la busqueda'}
                </td>
              </tr>
            ) : filtradas.map(p => {
              const color = getColor(p.estado_solvencia);
              const dotBg = color;
              const tagBg = color + '20';
              const tagBorder = color + '50';
              return (
                <tr key={p.id}>
                  <td style={td}><strong style={{ color: '#e2e8f0' }}>{p.apellidos}, {p.nombres}</strong></td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{p.cedula}</td>
                  <td style={td}>{p.tipo_membresia || '-'}</td>
                  <td style={td}>{p.plan_activo || '-'}</td>
                  <td style={{ ...td, fontSize: 12 }}>
                    {p.fecha_vencimiento ? p.fecha_vencimiento.slice(0, 10) : '-'}
                  </td>
                  <td style={td}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px', borderRadius: 999,
                      background: tagBg, border: '1px solid ' + tagBorder,
                      color, fontSize: 11, fontWeight: 700,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotBg, display: 'inline-block' }} />
                      {p.estado_solvencia || 'N/D'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: '#475569', textAlign: 'right' }}>
        {filtradas.length} de {personas.length} persona{personas.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};