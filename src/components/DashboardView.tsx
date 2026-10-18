import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  FileText, 
  Database, 
  TrendingUp, 
  MapPin, 
  ArrowUpRight, 
  Activity,
  Building2,
  Bike,
  CreditCard,
  UserCheck,
  DollarSign
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { ESTADOS_VENEZUELA } from '../data/venezuela';
import { Registro } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: any, action?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [selectedEstado, setSelectedEstado] = useState<string>('TODOS');
  
  // Lista reactiva de registros
  const [registros, setRegistros] = useState<Registro[]>(() =>
    StorageService.obtenerRegistros(undefined, selectedEstado)
  );

  // Datos reactivos Gran Base de Paz
  const [bicis, setBicis] = useState(() => StorageService.obtenerBicicletasSpinning());
  const [asistencias, setAsistencias] = useState(() => StorageService.obtenerAsistencias());
  const [pagos, setPagos] = useState(() => StorageService.obtenerPagos());

  const recargar = () => {
    setRegistros(StorageService.obtenerRegistros(undefined, selectedEstado));
    setBicis(StorageService.obtenerBicicletasSpinning());
    setAsistencias(StorageService.obtenerAsistencias());
    setPagos(StorageService.obtenerPagos());
  };

  useEffect(() => {
    recargar();
  }, [selectedEstado]);

  useEffect(() => {
    window.addEventListener('mpv-data-updated', recargar);
    window.addEventListener('mpv-spinning-updated', recargar);
    window.addEventListener('mpv-asistencia-updated', recargar);
    window.addEventListener('mpv-pagos-updated', recargar);
    return () => {
      window.removeEventListener('mpv-data-updated', recargar);
      window.removeEventListener('mpv-spinning-updated', recargar);
      window.removeEventListener('mpv-asistencia-updated', recargar);
      window.removeEventListener('mpv-pagos-updated', recargar);
    };
  }, [selectedEstado]);

  const personas = registros.filter(r => r.tipo === 'persona');
  const eventos = registros.filter(r => r.tipo === 'evento');
  const documentos = registros.filter(r => r.tipo === 'documento');
  
  const sincronizados = registros.filter(r => r.sincronizado).length;
  const syncTasa = registros.length > 0 ? Math.round((sincronizados / registros.length) * 100) : 100;

  // Conteo por estado
  const conteoEstados: Record<string, number> = {};
  registros.forEach(r => {
    const est = r.ubicacion.estado || 'Sin Asignar';
    conteoEstados[est] = (conteoEstados[est] || 0) + 1;
  });

  return (
    <div className="dashboard-container">
      {/* Barra de Filtro Regional */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#ffffff' }}>
            Panel Principal
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Resumen general de operaciones y registros territoriales.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px' }}>
            <MapPin size={16} style={{ color: 'var(--accent-amber)' }} />
            <span>Entidad Federal:</span>
          </div>
          <select
            className="form-select"
            style={{ width: '220px' }}
            value={selectedEstado}
            onChange={e => setSelectedEstado(e.target.value)}
          >
            <option value="TODOS">Todos los Estados</option>
            {ESTADOS_VENEZUELA.map(e => (
              <option key={e.nombre} value={e.nombre}>{e.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarjetas KPI */}
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

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(17, 26, 46, 0.9))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Documentos</p>
              <h3 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-heading)', marginTop: '4px', color: '#34d399' }}>
                {documentos.length}
              </h3>
            </div>
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px', color: '#10b981' }}>
              <FileText size={24} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <span>Archivos indexados</span>
          </div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(17, 26, 46, 0.9))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sincronización</p>
              <h3 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-heading)', marginTop: '4px', color: '#a78bfa' }}>
                {syncTasa}%
              </h3>
            </div>
            <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '12px', color: '#8b5cf6' }}>
              <Database size={24} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <span>{sincronizados} de {registros.length} actualizados</span>
          </div>
        </div>
      </div>

      {/* Sección Operativa Gran Base de Paz (Gimnasio Vertical) */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} style={{ color: 'var(--accent-amber)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Estado Operativo • Gran Base de Paz (Gimnasio Vertical)
            </h3>
          </div>
          <button 
            className="btn btn-ghost" 
            style={{ fontSize: '12px', color: '#38bdf8' }}
            onClick={() => onNavigate('gimnasio')}
          >
            <span>Ver Planificación Completa</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div 
            className="card hover-elevate" 
            style={{ padding: '16px', cursor: 'pointer', borderLeft: '4px solid #38bdf8' }}
            onClick={() => onNavigate('gimnasio')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sala de Spinning</span>
              <Bike size={18} style={{ color: '#38bdf8' }} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>
              {bicis.filter(b => b.estado === 'Ocupada').length} / 20 Bicis en uso
            </div>
            <span style={{ fontSize: '11px', color: '#34d399' }}>
              {bicis.filter(b => b.estado === 'Disponible').length} disponibles ahora
            </span>
          </div>

          <div 
            className="card hover-elevate" 
            style={{ padding: '16px', cursor: 'pointer', borderLeft: '4px solid #10b981' }}
            onClick={() => onNavigate('asistencia')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Afluencia en Vivo</span>
              <UserCheck size={18} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#34d399' }}>
              {asistencias.filter(a => a.estado === 'Activo').length} Atletas
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Entrenando en instalaciones
            </span>
          </div>

          <div 
            className="card hover-elevate" 
            style={{ padding: '16px', cursor: 'pointer', borderLeft: '4px solid #f59e0b' }}
            onClick={() => onNavigate('pagos')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Caja y Membresías</span>
              <CreditCard size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fbbf24' }}>
              Bs. {pagos.reduce((acc, p) => acc + (p.estado === 'Solvente' ? Number(p.monto_bs || 0) : 0), 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {personas.filter(p => p.datos.estado_solvencia === 'Solvente').length} usuarios solventes
            </span>
          </div>

          <div 
            className="card hover-elevate" 
            style={{ padding: '16px', cursor: 'pointer', borderLeft: '4px solid #c084fc' }}
            onClick={() => onNavigate('gimnasio')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Gimnasio Vertical</span>
              <Activity size={18} style={{ color: '#c084fc' }} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>
              4 Pisos Operativos
            </div>
            <span style={{ fontSize: '11px', color: '#38bdf8' }}>
              Piso 2 al 5 activos
            </span>
          </div>
        </div>
      </div>

      {/* Grilla Central */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Distribución por Estados */}
        <div className="card">
          <div className="card-title">
            <MapPin size={20} style={{ color: 'var(--accent-amber)' }} />
            <span>Distribución por Entidad Federal</span>
          </div>
          <p className="card-subtitle">Registros por estado</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.keys(conteoEstados).length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>No hay registros para este filtro.</p>
            ) : (
              Object.entries(conteoEstados).map(([estado, cantidad]) => {
                const porcentaje = Math.min(100, Math.round((cantidad / registros.length) * 100));
                return (
                  <div key={estado}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{estado}</span>
                      <span style={{ color: '#94a3b8' }}>{cantidad} ({porcentaje}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${porcentaje}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease'
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Acceso Rápido y Estado Operativo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-title" style={{ fontSize: '16px' }}>
              <span>Acciones Rápidas</span>
            </div>
            <p className="card-subtitle" style={{ marginBottom: '14px' }}>Operaciones frecuentes</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn btn-primary"
                style={{ justifyContent: 'space-between' }}
                onClick={() => onNavigate('gimnasio')}
              >
                <span>🏢 Gimnasio Vertical & Spinning</span>
                <ArrowUpRight size={16} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'space-between' }}
                onClick={() => onNavigate('pagos')}
              >
                <span>💳 Caja y Pagos</span>
                <ArrowUpRight size={16} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'space-between' }}
                onClick={() => onNavigate('asistencia')}
              >
                <span>⏱️ Control de Asistencia</span>
                <ArrowUpRight size={16} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'space-between' }}
                onClick={() => onNavigate('personas', 'new-persona')}
              >
                <span>+ Registrar Persona</span>
                <ArrowUpRight size={16} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'space-between' }}
                onClick={() => onNavigate('eventos', 'new-evento')}
              >
                <span>+ Registrar Actividad</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Activity size={18} style={{ color: '#34d399' }} />
              <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
                Estado Operativo
              </h4>
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
                <span>Sincronizados:</span>
                <strong style={{ color: '#34d399' }}>{sincronizados}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
