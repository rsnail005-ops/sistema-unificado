import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Clock, 
  Search, 
  CheckCircle2, 
  LogOut, 
  Activity, 
  Calendar, 
  Users,
  Timer,
  AlertCircle
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { AsistenciaRegistro, UsuarioSesion, Registro, isAdministradorBase, puedeVerNacional } from '../types';

interface AsistenciaViewProps {
  sesion: UsuarioSesion;
}

export const AsistenciaView: React.FC<AsistenciaViewProps> = ({ sesion }) => {
  const [asistencias, setAsistencias] = useState<AsistenciaRegistro[]>(() => StorageService.obtenerAsistencias());
  const [personas, setPersonas] = useState<Registro[]>(() => StorageService.obtenerRegistros('persona'));
  const [cedulaInput, setCedulaInput] = useState('');
  const [disciplinaInput, setDisciplinaInput] = useState('Gimnasio General / Musculación');
  const [searchTerm, setSearchTerm] = useState('');

  const recargar = () => {
    setAsistencias(StorageService.obtenerAsistencias());
    setPersonas(StorageService.obtenerRegistros('persona'));
  };

  useEffect(() => {
    window.addEventListener('mpv-asistencia-updated', recargar);
    window.addEventListener('mpv-data-updated', recargar);
    return () => {
      window.removeEventListener('mpv-asistencia-updated', recargar);
      window.removeEventListener('mpv-data-updated', recargar);
    };
  }, []);

  const esBaseAdmin = isAdministradorBase(sesion);
  const baseAsignada = sesion.base_misiones_nombre?.trim().toLowerCase() || '';

  // Filtrado estricto por alcance de base de misiones
  const personasAlcance = personas.filter(p => {
    if (!esBaseAdmin || !baseAsignada) return true;
    const baseP = (p.datos.base_misiones || p.ubicacion?.comunidad || '').toLowerCase();
    return baseP.includes(baseAsignada) || baseAsignada.includes(baseP);
  });

  const asistenciasAlcance = asistencias.filter(a => {
    if (!esBaseAdmin || !baseAsignada) return true;
    const baseA = (a.ubicacion?.comunidad || '').toLowerCase();
    const operadorA = (a.registrado_por || '').toLowerCase();
    return (
      (baseA && (baseA.includes(baseAsignada) || baseAsignada.includes(baseA))) ||
      operadorA === sesion.cedula.toLowerCase()
    );
  });

  const hoyStr = new Date().toISOString().split('T')[0];
  const asistenciasHoy = asistenciasAlcance.filter(a => a.fecha === hoyStr);
  const usuariosActivos = asistenciasHoy.filter(a => a.estado === 'Activo');
  const salidasHoy = asistenciasHoy.filter(a => a.estado === 'Finalizado');

  const handleMarcarEntrada = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedulaInput.trim()) return;

    // Buscar si existe en personas de su alcance
    const personaMatch = personasAlcance.find(p => 
      p.datos.cedula.toLowerCase().includes(cedulaInput.trim().toLowerCase()) ||
      `${p.datos.nombre} ${p.datos.apellido}`.toLowerCase().includes(cedulaInput.trim().toLowerCase()) ||
      (p.datos.id_gbp && p.datos.id_gbp.toLowerCase().includes(cedulaInput.trim().toLowerCase()))
    );

    const nombre = personaMatch 
      ? `${personaMatch.datos.nombre} ${personaMatch.datos.apellido}`.trim()
      : 'Usuario Visitante';
    const cedula = personaMatch ? personaMatch.datos.cedula : cedulaInput.trim();
    const id = personaMatch ? (personaMatch.datos.id_gbp || personaMatch.id) : `U-${Date.now().toString().slice(-4)}`;
    const disc = personaMatch?.datos.disciplina_gbp || disciplinaInput;

    // Verificar si ya está activo
    const yaActivo = usuariosActivos.find(a => a.usuario_cedula.toLowerCase() === cedula.toLowerCase());
    if (yaActivo) {
      alert(`El usuario ${nombre} ya tiene una entrada activa registrada a las ${yaActivo.hora_entrada}.`);
      return;
    }

    StorageService.registrarEntradaAsistencia({
      id,
      nombre,
      cedula,
      disciplina: disc
    }, sesion.cedula);

    setCedulaInput('');
  };

  const handleMarcarSalida = (asistenciaId: string) => {
    StorageService.registrarSalidaAsistencia(asistenciaId, sesion.cedula);
  };

  const asistenciasFiltradas = asistenciasAlcance.filter(a => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        a.usuario_nombre.toLowerCase().includes(term) ||
        a.usuario_cedula.toLowerCase().includes(term) ||
        a.disciplina.toLowerCase().includes(term) ||
        a.fecha.includes(term)
      );
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(16,185,129,0.2) 100%)',
            border: '1px solid rgba(56,189,248,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <UserCheck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Control de Asistencia Rápida y Afluencia
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
              Registro de entrada y salida de deportistas y usuarios en la Gran Base de Paz.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI de Asistencia */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #10b981' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
            <Activity size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Entrenando Ahora Mismo</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#34d399' }}>
              {usuariosActivos.length} Usuarios
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
            <Calendar size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Asistencias Hoy</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff' }}>
              {asistenciasHoy.length}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <LogOut size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sesiones Completadas Hoy</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fbbf24' }}>
              {salidasHoy.length}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #c084fc' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc' }}>
            <Timer size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Promedio de Tiempo</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#c084fc' }}>
              1.5 Horas
            </div>
          </div>
        </div>
      </div>

      {/* Entrada Rápida (Check-In) */}
      <div className="card" style={{ padding: '20px', background: 'rgba(10, 15, 29, 0.85)', border: '1px solid var(--border-glow)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} style={{ color: 'var(--accent-amber)' }} />
          <span>Marcar Entrada Rápida (Check-In)</span>
        </h3>

        <form onSubmit={handleMarcarEntrada} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto', gap: '12px', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="form-label">Cédula de Identidad, Nombre o ID Base de Paz *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por cédula, nombre o ID Base de Paz..."
              value={cedulaInput}
              onChange={e => setCedulaInput(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Disciplina / Sala</label>
            <select
              className="form-select"
              value={disciplinaInput}
              onChange={e => setDisciplinaInput(e.target.value)}
            >
              <option value="Gimnasio General / Musculación">Musculación / Pesas (Piso 2)</option>
              <option value="Crossfit / Funcional">Crossfit & Funcional (Piso 2)</option>
              <option value="Spinning / Ciclismo">Sala de Spinning (Piso 2)</option>
              <option value="Boxeo y Kickboxing">Boxeo y Kickboxing (Piso 3)</option>
              <option value="Karate y Artes Marciales">Karate y Artes Marciales (Piso 3)</option>
              <option value="Yoga y Esgrima">Yoga y Esgrima (Piso 4)</option>
              <option value="Danza y Baile">Danza y Baile (Piso 4)</option>
              <option value="Cancha Multiuso">Cancha Multiuso (Piso 5)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 24px' }}>
            <UserCheck size={16} />
            <span>Registrar Entrada</span>
          </button>
        </form>
      </div>

      {/* Lista de Usuarios Activos Entrenando */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} style={{ color: '#34d399' }} />
          <span>Usuarios en Instalaciones ({usuariosActivos.length})</span>
        </h3>

        {usuariosActivos.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No hay usuarios con sesiones activas en este momento.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {usuariosActivos.map(item => (
              <div
                key={item.id}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px' }}>
                    {item.usuario_nombre}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                    {item.usuario_cedula} • <span style={{ color: '#38bdf8' }}>{item.disciplina}</span>
                  </div>
                  <div style={{ color: '#34d399', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    <span>Entrada: {item.hora_entrada}</span>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  title="Marcar salida del usuario"
                  onClick={() => handleMarcarSalida(item.id)}
                >
                  <LogOut size={13} />
                  <span>Salida</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial Completo de Asistencias */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
              Historial de Asistencias
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Registro de uso diario según la matriz del Excel.
            </span>
          </div>

          <div className="search-bar" style={{ width: '280px' }}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Buscar por usuario o disciplina..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Cédula</th>
                <th>Disciplina</th>
                <th>Hora Entrada</th>
                <th>Hora Salida</th>
                <th>Tiempo Estimado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {asistenciasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                    No hay registros de asistencia que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                asistenciasFiltradas.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: '#94a3b8', fontSize: '12px' }}>{a.fecha}</td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{a.usuario_nombre}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
                        {a.usuario_cedula}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#cbd5e1' }}>{a.disciplina}</td>
                    <td style={{ fontSize: '12px', color: '#34d399' }}>{a.hora_entrada}</td>
                    <td style={{ fontSize: '12px', color: a.hora_salida ? '#fbbf24' : '#64748b' }}>
                      {a.hora_salida || 'En progreso'}
                    </td>
                    <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {a.tiempo_horas ? `${a.tiempo_horas} hrs` : '-'}
                    </td>
                    <td>
                      <span className="badge" style={{
                        backgroundColor: a.estado === 'Activo' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        color: a.estado === 'Activo' ? '#34d399' : '#94a3b8'
                      }}>
                        {a.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
