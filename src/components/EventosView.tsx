import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, MapPin, Trash2, Users, Trophy, Music, Shield, BookOpen, HeartHandshake } from 'lucide-react';
import { StorageService } from '../services/storage';
import { ESTADOS_VENEZUELA, obtenerMunicipiosDeEstado, obtenerParroquiasDeMunicipio } from '../data/venezuela';
import { Registro, EventoDatos, UsuarioSesion } from '../types';

interface EventosViewProps {
  sesion: UsuarioSesion | null;
  initialOpenForm?: boolean;
  onClearAutoOpen?: () => void;
}

export const EventosView: React.FC<EventosViewProps> = ({ sesion, initialOpenForm, onClearAutoOpen }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState('TODOS');

  // Lista reactiva de eventos
  const [registros, setRegistros] = useState<Registro[]>(() => 
    StorageService.obtenerRegistros('evento', selectedEstadoFilter)
  );

  // Apertura automática desde accesos rápidos
  useEffect(() => {
    if (initialOpenForm) {
      setShowForm(true);
      if (onClearAutoOpen) onClearAutoOpen();
    }
  }, [initialOpenForm, onClearAutoOpen]);

  const recargarEventos = () => {
    setRegistros(StorageService.obtenerRegistros('evento', selectedEstadoFilter));
  };

  useEffect(() => {
    recargarEventos();
  }, [selectedEstadoFilter]);

  useEffect(() => {
    window.addEventListener('mpv-data-updated', recargarEventos);
    return () => {
      window.removeEventListener('mpv-data-updated', recargarEventos);
    };
  }, [selectedEstadoFilter]);

  // Formulario
  const [titulo, setTitulo] = useState('');
  const [tipoActividad, setTipoActividad] = useState<'Deportiva' | 'Cultural' | 'Preventiva' | 'Formativa' | 'Comunitaria'>('Deportiva');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [lugar, setLugar] = useState('');
  const [asistentesEstimados, setAsistentesEstimados] = useState<number>(50);
  const [coordinadorResponsable, setCoordinadorResponsable] = useState(sesion ? `${sesion.nombres} ${sesion.apellidos}` : '');
  const [descripcion, setDescripcion] = useState('');

  // Geografía
  const [estadoSelect, setEstadoSelect] = useState('Distrito Capital');
  const [municipioSelect, setMunicipioSelect] = useState('Libertador');
  const [parroquiaSelect, setParroquiaSelect] = useState('Sucre (Catia)');

  const municipiosDisponibles = obtenerMunicipiosDeEstado(estadoSelect);
  const parroquiasDisponibles = obtenerParroquiasDeMunicipio(estadoSelect, municipioSelect);

  const handleEstadoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEstado = e.target.value;
    setEstadoSelect(newEstado);
    const muns = obtenerMunicipiosDeEstado(newEstado);
    const primerMun = muns.length > 0 ? muns[0].nombre : '';
    setMunicipioSelect(primerMun);
    const parrs = primerMun ? obtenerParroquiasDeMunicipio(newEstado, primerMun) : [];
    setParroquiaSelect(parrs.length > 0 ? parrs[0] : '');
  };

  const handleMunicipioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMun = e.target.value;
    setMunicipioSelect(newMun);
    const parrs = newMun ? obtenerParroquiasDeMunicipio(estadoSelect, newMun) : [];
    setParroquiaSelect(parrs.length > 0 ? parrs[0] : '');
  };

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !lugar.trim()) {
      alert('Por favor ingrese el título y el lugar de la actividad.');
      return;
    }

    const eventoData: EventoDatos = {
      titulo,
      tipo_actividad: tipoActividad,
      fecha,
      lugar,
      asistentes_estimados: Number(asistentesEstimados),
      coordinador_responsable: coordinadorResponsable || (sesion ? `${sesion.nombres} ${sesion.apellidos}` : 'Coordinador'),
      descripcion
    };

    StorageService.guardarRegistro({
      tipo: 'evento',
      datos: eventoData,
      ubicacion: {
        estado: estadoSelect,
        municipio: municipioSelect,
        parroquia: parroquiaSelect
      }
    }, sesion?.cedula || 'V-00000000');

    setRegistros(StorageService.obtenerRegistros('evento', selectedEstadoFilter));

    setShowForm(false);
    setTitulo('');
    setLugar('');
    setDescripcion('');
  };

  const handleEliminar = (id: string) => {
    if (confirm('¿Desea eliminar esta actividad?')) {
      StorageService.eliminarRegistro(id, sesion?.cedula || 'V-00000000');
      setRegistros(StorageService.obtenerRegistros('evento', selectedEstadoFilter));
    }
  };

  const getIconTipo = (tipo: string) => {
    switch (tipo) {
      case 'Deportiva': return <Trophy size={16} style={{ color: '#3b82f6' }} />;
      case 'Cultural': return <Music size={16} style={{ color: '#ec4899' }} />;
      case 'Preventiva': return <Shield size={16} style={{ color: '#10b981' }} />;
      case 'Formativa': return <BookOpen size={16} style={{ color: '#f59e0b' }} />;
      default: return <HeartHandshake size={16} style={{ color: '#8b5cf6' }} />;
    }
  };

  const filtrados = registros.filter(r => {
    const texto = `${r.datos.titulo} ${r.datos.tipo_actividad} ${r.datos.lugar} ${r.ubicacion.estado}`.toLowerCase();
    return texto.includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={26} style={{ color: 'var(--accent-amber)' }} />
            <span>Eventos y Actividades</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Planificación y seguimiento de actividades comunitarias.
          </p>
        </div>

        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Registrar Actividad</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Buscar por título, tipo o lugar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={15} style={{ color: '#f59e0b' }} />
            <select
              className="form-select"
              style={{ width: '200px' }}
              value={selectedEstadoFilter}
              onChange={e => setSelectedEstadoFilter(e.target.value)}
            >
              <option value="TODOS">Todos los Estados</option>
              {ESTADOS_VENEZUELA.map(e => (
                <option key={e.nombre} value={e.nombre}>{e.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Modal Nuevo Evento */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} style={{ color: 'var(--accent-amber)' }} />
                <span>Nueva Actividad</span>
              </h3>
              <button onClick={() => setShowForm(false)} className="btn btn-secondary" style={{ padding: '4px 10px' }}>✕</button>
            </div>

            <form onSubmit={handleGuardar}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Título de la Actividad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Clínica Deportiva Comunitaria"
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Tipo de Actividad</label>
                    <select
                      value={tipoActividad}
                      onChange={e => setTipoActividad(e.target.value as any)}
                      className="form-select"
                    >
                      <option value="Deportiva">Deportiva</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Preventiva">Preventiva</option>
                      <option value="Formativa">Formativa</option>
                      <option value="Comunitaria">Comunitaria</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha Programada</label>
                    <input
                      type="date"
                      required
                      value={fecha}
                      onChange={e => setFecha(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Aforo Estimado</label>
                    <input
                      type="number"
                      value={asistentesEstimados}
                      onChange={e => setAsistentesEstimados(Number(e.target.value))}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Lugar / Espacio *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Cancha de Usos Múltiples"
                      value={lugar}
                      onChange={e => setLugar(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Responsable</label>
                    <input
                      type="text"
                      value={coordinadorResponsable}
                      onChange={e => setCoordinadorResponsable(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Ubicación */}
                <div style={{ marginTop: '8px', marginBottom: '16px' }}>
                  <label className="form-label" style={{ color: 'var(--accent-amber)' }}>
                    Ubicación
                  </label>
                  <div className="grid-3">
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Estado</label>
                      <select value={estadoSelect} onChange={handleEstadoChange} className="form-select">
                        <option value="">Seleccione estado</option>
                        {ESTADOS_VENEZUELA.map(e => (
                          <option key={e.nombre} value={e.nombre}>{e.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Municipio</label>
                      <select value={municipioSelect} onChange={handleMunicipioChange} className="form-select">
                        <option value="">Seleccione municipio</option>
                        {municipiosDisponibles.map(m => (
                          <option key={m.nombre} value={m.nombre}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Parroquia</label>
                      <select value={parroquiaSelect} onChange={e => setParroquiaSelect(e.target.value)} className="form-select">
                        <option value="">Seleccione parroquia</option>
                        {parroquiasDisponibles.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea
                    rows={3}
                    placeholder="Detalles sobre el evento..."
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    className="form-textarea"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Eventos */}
      <div className="grid-2">
        {filtrados.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
            No hay eventos registrados.
          </div>
        ) : (
          filtrados.map(r => (
            <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getIconTipo(r.datos.tipo_actividad)}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    {r.datos.tipo_actividad}
                  </span>
                </div>
                <div>
                  {r.sincronizado ? (
                    <span className="status-pill status-online" style={{ padding: '2px 8px', fontSize: '10px' }}>✓ Sincronizado</span>
                  ) : (
                    <span className="status-pill status-syncing" style={{ padding: '2px 8px', fontSize: '10px' }}>Pendiente</span>
                  )}
                </div>
              </div>

              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                {r.datos.titulo}
              </h4>

              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px', flex: 1 }}>
                {r.datos.descripcion || 'Sin descripción adicional.'}
              </p>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '14px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0' }}>
                  <Calendar size={13} style={{ color: 'var(--accent-amber)' }} />
                  <span>{r.datos.fecha}</span>
                  <span style={{ color: '#64748b' }}>•</span>
                  <Users size={13} style={{ color: '#60a5fa' }} />
                  <span>{r.datos.asistentes_estimados} asistentes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                  <MapPin size={13} style={{ color: '#ef4444' }} />
                  <span>{r.datos.lugar} ({r.ubicacion.estado}, {r.ubicacion.municipio})</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Resp: {r.datos.coordinador_responsable}
                </span>
                <button
                  onClick={() => handleEliminar(r.id)}
                  className="btn btn-danger"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  <Trash2 size={13} />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
