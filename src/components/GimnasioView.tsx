import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Bike, 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Plus, 
  UserCheck, 
  Activity,
  Layers,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { 
  BicicletaSpinning, 
  HorarioPisoItem, 
  ClaseProgramada, 
  UsuarioSesion, 
  EstadoEspacio,
  Registro
} from '../types';

interface GimnasioViewProps {
  sesion: UsuarioSesion;
  onNavigateToPersona?: (cedula: string) => void;
}

export const GimnasioView: React.FC<GimnasioViewProps> = ({ sesion }) => {
  const [subTab, setSubTab] = useState<'spinning' | 'pisos' | 'clases'>('spinning');
  
  // Datos reactivos
  const [bicicletas, setBicicletas] = useState<BicicletaSpinning[]>(() => StorageService.obtenerBicicletasSpinning());
  const [horariosPisos, setHorariosPisos] = useState<HorarioPisoItem[]>(() => StorageService.obtenerHorariosPisos());
  const [clases, setClases] = useState<ClaseProgramada[]>(() => StorageService.obtenerClases());
  const [personas, setPersonas] = useState<Registro[]>(() => StorageService.obtenerRegistros('persona'));

  // Filtros
  const [filtroTurno, setFiltroTurno] = useState<string>('TODOS');
  const [filtroPiso, setFiltroPiso] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modales
  const [modalBici, setModalBici] = useState<BicicletaSpinning | null>(null);
  const [biciUsuarioSearch, setBiciUsuarioSearch] = useState('');
  const [selectedPersonaBici, setSelectedPersonaBici] = useState<Registro | null>(null);

  // Recargar listeners
  useEffect(() => {
    const handleSpinningUpdate = () => setBicicletas(StorageService.obtenerBicicletasSpinning());
    const handlePisosUpdate = () => setHorariosPisos(StorageService.obtenerHorariosPisos());
    const handleClasesUpdate = () => setClases(StorageService.obtenerClases());
    const handlePersonasUpdate = () => setPersonas(StorageService.obtenerRegistros('persona'));

    window.addEventListener('mpv-spinning-updated', handleSpinningUpdate);
    window.addEventListener('mpv-pisos-updated', handlePisosUpdate);
    window.addEventListener('mpv-clases-updated', handleClasesUpdate);
    window.addEventListener('mpv-data-updated', handlePersonasUpdate);

    return () => {
      window.removeEventListener('mpv-spinning-updated', handleSpinningUpdate);
      window.removeEventListener('mpv-pisos-updated', handlePisosUpdate);
      window.removeEventListener('mpv-clases-updated', handleClasesUpdate);
      window.removeEventListener('mpv-data-updated', handlePersonasUpdate);
    };
  }, []);

  // Métricas rápidas
  const totalBicis = bicicletas.length;
  const bicisDisponibles = bicicletas.filter(b => b.estado === 'Disponible').length;
  const bicisOcupadas = bicicletas.filter(b => b.estado === 'Ocupada').length;
  const bicisMantenimiento = bicicletas.filter(b => b.estado === 'Mantenimiento').length;

  // Acciones de Spinning
  const handleAsignarBici = () => {
    if (!modalBici) return;
    if (!selectedPersonaBici && !biciUsuarioSearch) return;

    const nombre = selectedPersonaBici 
      ? `${selectedPersonaBici.datos.nombre} ${selectedPersonaBici.datos.apellido}`.trim()
      : biciUsuarioSearch;
    const cedula = selectedPersonaBici ? selectedPersonaBici.datos.cedula : 'Sin Cédula';
    const id = selectedPersonaBici ? (selectedPersonaBici.datos.id_gbp || selectedPersonaBici.id) : `U-${Date.now().toString().slice(-4)}`;

    StorageService.asignarBicicletaSpinning(
      modalBici.id,
      { id, nombre, cedula },
      sesion.cedula
    );

    setModalBici(null);
    setSelectedPersonaBici(null);
    setBiciUsuarioSearch('');
  };

  const handleLiberarBici = (biciId: string) => {
    StorageService.liberarBicicletaSpinning(biciId, sesion.cedula);
    if (modalBici?.id === biciId) setModalBici(null);
  };

  const handleEstadoBici = (biciId: string, nuevoEstado: 'Disponible' | 'Ocupada' | 'Mantenimiento') => {
    StorageService.cambiarEstadoBicicleta(biciId, nuevoEstado, sesion.cedula);
    if (modalBici?.id === biciId) setModalBici(null);
  };

  const getBadgeColor = (estado: EstadoEspacio) => {
    switch (estado) {
      case 'Disponible': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'Ocupado': return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
      case 'Mantenimiento': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'Cerrado': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      default: return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  // Filtrado de horarios
  const horariosFiltrados = horariosPisos.filter(h => {
    if (filtroTurno !== 'TODOS' && h.turno !== filtroTurno) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Encabezado del Módulo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(245,158,11,0.2) 100%)',
              border: '1px solid rgba(245,158,11,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b'
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Gran Base de Paz — Gimnasio Vertical
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                Control operativo por pisos, mapa interactivo de spinning y programación de disciplinas deportivas.
              </p>
            </div>
          </div>
        </div>

        {/* Subpestañas */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <button
            className={`btn ${subTab === 'spinning' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setSubTab('spinning')}
          >
            <Bike size={16} />
            <span>Sala de Spinning (20 Bicis)</span>
          </button>
          <button
            className={`btn ${subTab === 'pisos' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setSubTab('pisos')}
          >
            <Layers size={16} />
            <span>Monitor de Pisos y Horarios</span>
          </button>
          <button
            className={`btn ${subTab === 'clases' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setSubTab('clases')}
          >
            <Calendar size={16} />
            <span>Programación de Clases</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VISTA 1: SALA DE SPINNING (MAPA INTERACTIVO 20 BICICLETAS) */}
      {/* ========================================================= */}
      {subTab === 'spinning' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tarjetas KPI de Spinning */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                <Bike size={24} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Capacidad Total</span>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff' }}>{totalBicis} Bicicletas</div>
              </div>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Disponibles Ahora</span>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#34d399' }}>{bicisDisponibles}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <Activity size={24} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>En Uso / Ocupadas</span>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#60a5fa' }}>{bicisOcupadas}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>En Mantenimiento</span>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#fbbf24' }}>{bicisMantenimiento}</div>
              </div>
            </div>
          </div>

          {/* Tarima del Instructor y Escenario */}
          <div className="card" style={{ padding: '24px', background: 'rgba(10, 15, 29, 0.85)', border: '1px solid var(--border-glow)' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 20px',
                background: 'linear-gradient(90deg, rgba(245,158,11,0.15) 0%, rgba(239,68,68,0.15) 100%)',
                border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: '20px',
                color: '#f59e0b',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                <Activity size={14} />
                <span>Tarima Principal del Instructor • Frente de la Sala</span>
              </div>
            </div>

            {/* Layout en 4 Filas según el Excel Oficial */}
            {(['Fila A (Frente)', 'Fila B', 'Fila C', 'Fila D (Fondo)'] as const).map(filaNombre => {
              const bicisDeFila = bicicletas.filter(b => b.fila === filaNombre);
              return (
                <div key={filaNombre} style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      minWidth: '120px'
                    }}>
                      {filaNombre}
                    </span>
                    <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: filaNombre.includes('Fila B') || filaNombre.includes('Fila C') 
                      ? 'repeat(6, 1fr)' 
                      : 'repeat(4, 1fr)',
                    gap: '12px'
                  }}>
                    {bicisDeFila.map(bici => {
                      const isOccupied = bici.estado === 'Ocupada';
                      const isMaintenance = bici.estado === 'Mantenimiento';
                      const isAvailable = bici.estado === 'Disponible';

                      let borderColor = 'rgba(16, 185, 129, 0.3)';
                      let bgGrad = 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(10, 15, 29, 0.9) 100%)';
                      let iconColor = '#10b981';

                      if (isOccupied) {
                        borderColor = 'rgba(59, 130, 246, 0.5)';
                        bgGrad = 'linear-gradient(180deg, rgba(59, 130, 246, 0.15) 0%, rgba(10, 15, 29, 0.95) 100%)';
                        iconColor = '#38bdf8';
                      } else if (isMaintenance) {
                        borderColor = 'rgba(245, 158, 11, 0.4)';
                        bgGrad = 'linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(10, 15, 29, 0.95) 100%)';
                        iconColor = '#f59e0b';
                      }

                      return (
                        <div
                          key={bici.id}
                          onClick={() => setModalBici(bici)}
                          style={{
                            padding: '14px 10px',
                            background: bgGrad,
                            border: `1px solid ${borderColor}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            position: 'relative',
                            transition: 'all 0.2s ease',
                            boxShadow: isOccupied ? '0 4px 15px rgba(59, 130, 246, 0.1)' : 'none'
                          }}
                          className="hover-elevate"
                        >
                          {/* Número / ID */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            marginBottom: '6px'
                          }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0' }}>
                              {bici.id}
                            </span>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: iconColor
                            }} />
                          </div>

                          {/* Ícono de Bicicleta */}
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: iconColor,
                            marginBottom: '8px'
                          }}>
                            <Bike size={22} />
                          </div>

                          {/* Estado / Usuario Asignado */}
                          {isOccupied ? (
                            <div style={{ width: '100%' }}>
                              <div style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#ffffff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {bici.usuario_nombre?.split(' ')[0] || 'Usuario'}
                              </div>
                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                {bici.usuario_cedula || bici.hora_asignada || 'Activo'}
                              </div>
                            </div>
                          ) : isMaintenance ? (
                            <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 600 }}>
                              Mantenimiento
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 500 }}>
                              Disponible
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Leyenda interactiva */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              flexWrap: 'wrap',
              fontSize: '12px',
              color: '#94a3b8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span>Disponible (Clic para asignar usuario)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                <span>Ocupada (En sesión activa)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                <span>En Mantenimiento Técnico</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: MONITOR DE PISOS Y HORARIOS OPERATIVOS           */}
      {/* ========================================================= */}
      {subTab === 'pisos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tarjetas informativas de los 4 Pisos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #38bdf8' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 700 }}>Piso 2</div>
              <h4 style={{ color: '#ffffff', margin: '4px 0 8px 0', fontSize: '15px' }}>Fuerza y Cardio</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                • Crossfit & Funcional<br />
                • Musculación / Pesas<br />
                • Sala de Spinning (20 bicis)
              </p>
            </div>

            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#ef4444', fontWeight: 700 }}>Piso 3</div>
              <h4 style={{ color: '#ffffff', margin: '4px 0 8px 0', fontSize: '15px' }}>Deportes de Combate</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                • Karate, Taekwondo & Judo<br />
                • Jiu-Jitsu & Muay Thai<br />
                • Boxeo, Kung Fu & Kickboxing
              </p>
            </div>

            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #a855f7' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#a855f7', fontWeight: 700 }}>Piso 4</div>
              <h4 style={{ color: '#ffffff', margin: '4px 0 8px 0', fontSize: '15px' }}>Expresión y Salud</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                • Yoga & Flexibilidad<br />
                • Esgrima Olímpica<br />
                • Danza y Ritmos Latinos
              </p>
            </div>

            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#10b981', fontWeight: 700 }}>Piso 5</div>
              <h4 style={{ color: '#ffffff', margin: '4px 0 8px 0', fontSize: '15px' }}>Cancha Multiuso</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                • Fútbol Sala Comunitario<br />
                • Baloncesto y Voleibol<br />
                • Torneos de Pacificación
              </p>
            </div>
          </div>

          {/* Tabla Matriz de Horarios */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                  Programación Operativa por Franjas Horarias
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Matriz del Gimnasio Vertical según el cronograma oficial del Movimiento.
                </span>
              </div>

              {/* Filtro Turno */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Turno:</span>
                <select
                  className="form-select"
                  style={{ width: '140px', padding: '6px 10px', fontSize: '12px' }}
                  value={filtroTurno}
                  onChange={e => setFiltroTurno(e.target.value)}
                >
                  <option value="TODOS">Todos los Turnos</option>
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noche">Noche</option>
                </select>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Horario</th>
                    <th>Turno</th>
                    <th>Piso 2: Crossfit</th>
                    <th>Piso 2: Musculación</th>
                    <th>Piso 2: Spinning</th>
                    <th>Piso 3: Artes Marciales</th>
                    <th>Piso 4: Yoga / Danza</th>
                    <th>Piso 5: Cancha Multiuso</th>
                  </tr>
                </thead>
                <tbody>
                  {horariosFiltrados.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} style={{ color: 'var(--accent-amber)' }} />
                          <span>{h.horario}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{
                          backgroundColor: h.turno === 'Mañana' ? 'rgba(56, 189, 248, 0.15)' : h.turno === 'Tarde' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          color: h.turno === 'Mañana' ? '#38bdf8' : h.turno === 'Tarde' ? '#fbbf24' : '#c084fc'
                        }}>
                          {h.turno}
                        </span>
                      </td>
                      {[
                        h.piso2_crossfit,
                        h.piso2_musculacion,
                        h.piso2_spinning,
                        h.piso3_artes_marciales,
                        h.piso4_yoga_danza,
                        h.piso5_cancha
                      ].map((est, idx) => {
                        const style = getBadgeColor(est);
                        return (
                          <td key={idx}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: style.bg,
                              color: style.text,
                              border: `1px solid ${style.border}`
                            }}>
                              {est}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 3: PROGRAMACIÓN DE CLASES Y DISCIPLINAS             */}
      {/* ========================================================= */}
      {subTab === 'clases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                  Clases y Entrenamientos Programados
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Asignación semanal de instructores, cupos y disciplinas oficiales.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="search-bar" style={{ width: '240px' }}>
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Buscar disciplina o instructor..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {clases
                .filter(c => 
                  c.disciplina.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.instructor.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(clase => {
                  const disponibles = clase.cupos_totales - clase.cupos_inscritos;
                  const porcentaje = Math.round((clase.cupos_inscritos / clase.cupos_totales) * 100);

                  return (
                    <div key={clase.id} className="card" style={{
                      padding: '18px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: '#38bdf8',
                            fontSize: '11px',
                            fontWeight: 700
                          }}>
                            {clase.piso}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {clase.dia}
                          </span>
                        </div>

                        <h4 style={{ color: '#ffffff', fontSize: '16px', margin: '0 0 6px 0', fontWeight: 600 }}>
                          {clase.disciplina}
                        </h4>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '13px', marginBottom: '12px' }}>
                          <Users size={14} style={{ color: 'var(--accent-amber)' }} />
                          <span>Instructor: <strong>{clase.instructor}</strong></span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '12px' }}>
                          <Clock size={13} />
                          <span>Horario: {clase.hora}</span>
                        </div>
                      </div>

                      {/* Barra de Cupos */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                          <span style={{ color: '#94a3b8' }}>Inscritos: {clase.cupos_inscritos} / {clase.cupos_totales}</span>
                          <span style={{ color: disponibles > 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
                            {disponibles > 0 ? `${disponibles} cupos libres` : 'Completo'}
                          </span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                          <div style={{
                            width: `${porcentaje}%`,
                            height: '100%',
                            background: porcentaje > 85 ? 'var(--accent-red)' : 'var(--accent-blue)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>

                      {/* Botón de Inscripción */}
                      <button
                        className="btn btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '8px' }}
                        disabled={disponibles <= 0}
                        onClick={() => {
                          const exito = StorageService.inscribirEnClase(clase.id, sesion.cedula);
                          if (exito) alert(`Inscripción registrada con éxito en ${clase.disciplina}.`);
                        }}
                      >
                        <UserCheck size={14} />
                        <span>{disponibles > 0 ? 'Registrar Participante (+1)' : 'Cupos Agotados'}</span>
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DETALLES / ASIGNACIÓN DE BICICLETA DE SPINNING      */}
      {/* ========================================================= */}
      {modalBici && (
        <div className="modal-overlay" onClick={() => setModalBici(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <Bike size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#ffffff', fontSize: '18px' }}>
                    {modalBici.id} — {modalBici.fila}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Gestión de asignación en tiempo real
                  </span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setModalBici(null)}>✕</button>
            </div>

            {/* Estado actual */}
            <div style={{
              padding: '14px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Estado de la Unidad:</span>
                <span className="badge" style={{
                  backgroundColor: modalBici.estado === 'Disponible' ? 'rgba(16,185,129,0.2)' : modalBici.estado === 'Ocupada' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)',
                  color: modalBici.estado === 'Disponible' ? '#34d399' : modalBici.estado === 'Ocupada' ? '#60a5fa' : '#fbbf24'
                }}>
                  {modalBici.estado}
                </span>
              </div>

              {modalBici.estado === 'Ocupada' && (
                <div>
                  <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: 600 }}>
                    Usuario: {modalBici.usuario_nombre}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Cédula / ID: {modalBici.usuario_cedula} ({modalBici.usuario_id})
                  </div>
                  <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px' }}>
                    Hora de inicio: {modalBici.hora_asignada || 'En curso'}
                  </div>
                </div>
              )}
            </div>

            {/* Acciones según estado */}
            {modalBici.estado === 'Ocupada' ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => handleLiberarBici(modalBici.id)}
                >
                  <CheckCircle2 size={16} />
                  <span>Liberar Unidad (Finalizar Sesión)</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleEstadoBici(modalBici.id, 'Mantenimiento')}
                >
                  <AlertTriangle size={16} />
                  <span>Reportar Falla</span>
                </button>
              </div>
            ) : modalBici.estado === 'Disponible' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Asignar a Usuario Registrado:</label>
                  <div className="search-bar" style={{ width: '100%', marginBottom: '8px' }}>
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Buscar por cédula o nombre..."
                      value={biciUsuarioSearch}
                      onChange={e => {
                        setBiciUsuarioSearch(e.target.value);
                        setSelectedPersonaBici(null);
                      }}
                    />
                  </div>

                  {biciUsuarioSearch.trim() && !selectedPersonaBici && (
                    <div style={{
                      maxHeight: '150px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      background: '#0d1527'
                    }}>
                      {personas
                        .filter(p => 
                          `${p.datos.nombre} ${p.datos.apellido}`.toLowerCase().includes(biciUsuarioSearch.toLowerCase()) ||
                          p.datos.cedula.includes(biciUsuarioSearch)
                        )
                        .slice(0, 5)
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPersonaBici(p);
                              setBiciUsuarioSearch(`${p.datos.nombre} ${p.datos.apellido} (${p.datos.cedula})`);
                            }}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              fontSize: '12px'
                            }}
                            className="hover-subtle"
                          >
                            <div style={{ color: '#ffffff', fontWeight: 600 }}>
                              {p.datos.nombre} {p.datos.apellido}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                              Cédula: {p.datos.cedula} • {p.datos.estado_solvencia || 'Solvente'}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={handleAsignarBici}
                    disabled={!biciUsuarioSearch.trim()}
                  >
                    <UserCheck size={16} />
                    <span>Confirmar Asignación</span>
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleEstadoBici(modalBici.id, 'Mantenimiento')}
                  >
                    <AlertTriangle size={15} />
                    <span>Mantenimiento</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => handleEstadoBici(modalBici.id, 'Disponible')}
                >
                  <CheckCircle2 size={16} />
                  <span>Marcar como Operativa y Disponible</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
