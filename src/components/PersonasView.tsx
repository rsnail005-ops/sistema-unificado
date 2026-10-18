import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  Download, 
  Trash2, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  FileSpreadsheet,
  Calendar as CalendarIcon
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { SaimeService } from '../services/saime';
import { ESTADOS_VENEZUELA, obtenerMunicipiosDeEstado, obtenerParroquiasDeMunicipio } from '../data/venezuela';
import { Registro, PersonaDatos, UsuarioSesion, EstadoMembresia, obtenerEstadoMembresia } from '../types';

interface PersonasViewProps {
  sesion: UsuarioSesion | null;
  initialOpenForm?: boolean;
  onClearAutoOpen?: () => void;
}

export const PersonasView: React.FC<PersonasViewProps> = ({ sesion, initialOpenForm, onClearAutoOpen }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState('TODOS');
  const [selectedMembresiaFilter, setSelectedMembresiaFilter] = useState('TODOS');
  
  // Lista reactiva de registros
  const [registros, setRegistros] = useState<Registro[]>(() => 
    StorageService.obtenerRegistros('persona', selectedEstadoFilter)
  );

  // Apertura automática desde accesos rápidos
  useEffect(() => {
    if (initialOpenForm) {
      setShowForm(true);
      if (onClearAutoOpen) onClearAutoOpen();
    }
  }, [initialOpenForm, onClearAutoOpen]);

  // Sincronización reactiva con eventos de almacenamiento
  const recargarRegistros = () => {
    setRegistros(StorageService.obtenerRegistros('persona', selectedEstadoFilter));
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      if (buffer) {
        const res = StorageService.importarDatosDesdeExcel(buffer, sesion?.cedula || 'V-00000000');
        alert(res.mensaje);
        recargarRegistros();
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  useEffect(() => {
    recargarRegistros();
  }, [selectedEstadoFilter]);

  useEffect(() => {
    window.addEventListener('mpv-data-updated', recargarRegistros);
    return () => {
      window.removeEventListener('mpv-data-updated', recargarRegistros);
    };
  }, [selectedEstadoFilter]);

  // Helper para sumar días a una fecha
  const calcularFechaOffset = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
  };

  // Estado del Formulario
  const [cedulaInput, setCedulaInput] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [genero, setGenero] = useState<'Masculino' | 'Femenino' | 'Otro'>('Masculino');
  const [programa, setPrograma] = useState('Gran Base de Paz - Gimnasio Vertical');
  const [disciplinaGbp, setDisciplinaGbp] = useState('Musculación / Máquinas');
  const [rolComunitario, setRolComunitario] = useState('Atleta / Beneficiario');
  const [observaciones, setObservaciones] = useState('');

  // Membresía en Formulario
  const [tipoMembresia, setTipoMembresia] = useState<'Semanal' | 'Mensual' | 'Personalizada'>('Mensual');
  const [fechaVencimiento, setFechaVencimiento] = useState<string>(calcularFechaOffset(30));

  // Selector geográfico en cascada
  const [estadoSelect, setEstadoSelect] = useState('Distrito Capital');
  const [municipioSelect, setMunicipioSelect] = useState('Libertador');
  const [parroquiaSelect, setParroquiaSelect] = useState('Sucre (Catia)');
  const [comunidad, setComunidad] = useState('');

  // Feedback SAIME
  const [isValidatingSaime, setIsValidatingSaime] = useState(false);
  const [saimeStatus, setSaimeStatus] = useState<{ validado: boolean; mensaje: string } | null>(null);

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

  // Auto-completado al escribir cédula
  useEffect(() => {
    const clean = cedulaInput.replace(/[^0-9]/g, '');
    if (clean.length >= 6) {
      const timer = setTimeout(async () => {
        setIsValidatingSaime(true);
        const res = await SaimeService.verificarIdentidad(cedulaInput);
        setIsValidatingSaime(false);
        if (res.exito && res.ciudadano) {
          setNombre(res.ciudadano.nombres);
          setApellido(res.ciudadano.apellidos);
          if (res.ciudadano.fecha_nacimiento) setFechaNacimiento(res.ciudadano.fecha_nacimiento);
          if (res.ciudadano.genero) setGenero(res.ciudadano.genero);
          setSaimeStatus({ validado: true, mensaje: `Verificado: ${res.ciudadano.nombres} ${res.ciudadano.apellidos}` });
        } else {
          setSaimeStatus({ validado: false, mensaje: res.mensaje || 'No localizada en línea (ingreso manual)' });
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setSaimeStatus(null);
    }
  }, [cedulaInput]);

  const handleValidarSaime = async () => {
    if (!cedulaInput.trim()) return;
    setIsValidatingSaime(true);
    setSaimeStatus(null);
    const res = await SaimeService.verificarIdentidad(cedulaInput);
    setIsValidatingSaime(false);
    if (res.exito && res.ciudadano) {
      setCedulaInput(res.ciudadano.cedula);
      setNombre(res.ciudadano.nombres);
      setApellido(res.ciudadano.apellidos);
      if (res.ciudadano.fecha_nacimiento) setFechaNacimiento(res.ciudadano.fecha_nacimiento);
      if (res.ciudadano.genero) setGenero(res.ciudadano.genero);
      setSaimeStatus({ validado: true, mensaje: `Verificado: ${res.ciudadano.nombres} ${res.ciudadano.apellidos}` });
    } else {
      setSaimeStatus({ validado: false, mensaje: res.mensaje });
    }
  };

  const handleSeleccionarTipoMembresia = (tipo: 'Semanal' | 'Mensual' | 'Personalizada') => {
    setTipoMembresia(tipo);
    if (tipo === 'Semanal') {
      setFechaVencimiento(calcularFechaOffset(7));
    } else if (tipo === 'Mensual') {
      setFechaVencimiento(calcularFechaOffset(30));
    }
  };

  const estadoMembresiaCalculado: EstadoMembresia = obtenerEstadoMembresia(undefined, fechaVencimiento);

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedulaInput.trim() || !nombre.trim() || !apellido.trim()) {
      alert('Complete los campos obligatorios: Cédula, Nombres y Apellidos.');
      return;
    }

    const personaData: PersonaDatos = {
      nombre,
      apellido,
      cedula: SaimeService.normalizarCedula(cedulaInput),
      telefono,
      correo,
      fecha_nacimiento: fechaNacimiento,
      genero,
      programa,
      disciplina_gbp: disciplinaGbp,
      rol_comunitario: rolComunitario,
      tipo_membresia: tipoMembresia,
      fecha_vencimiento: fechaVencimiento,
      estado_solvencia: estadoMembresiaCalculado,
      observaciones
    };

    StorageService.guardarRegistro({
      tipo: 'persona',
      datos: personaData,
      ubicacion: {
        estado: estadoSelect,
        municipio: municipioSelect,
        parroquia: parroquiaSelect,
        comunidad
      }
    }, sesion?.cedula || 'V-00000000');

    // Actualización inmediata del estado local
    setRegistros(StorageService.obtenerRegistros('persona', selectedEstadoFilter));

    setShowForm(false);
    setCedulaInput('');
    setNombre('');
    setApellido('');
    setTelefono('');
    setCorreo('');
    setObservaciones('');
    setSaimeStatus(null);
  };

  const handleEliminar = (id: string) => {
    if (confirm('¿Desea eliminar este registro?')) {
      StorageService.eliminarRegistro(id, sesion?.cedula || 'V-00000000');
      setRegistros(StorageService.obtenerRegistros('persona', selectedEstadoFilter));
    }
  };

  const handleExportarCSV = () => {
    const rows = [
      ['ID', 'Cédula', 'Nombre Completo', 'Disciplina', 'Membresía', 'Vencimiento', 'Estado', 'Estado Geo', 'Municipio', 'Parroquia'],
      ...registros.map(r => {
        const est = obtenerEstadoMembresia(r.datos.estado_solvencia, r.datos.fecha_vencimiento);
        return [
          r.id,
          r.datos.cedula,
          `${r.datos.nombre} ${r.datos.apellido}`,
          r.datos.disciplina_gbp || r.datos.programa,
          r.datos.tipo_membresia || 'Mensual',
          r.datos.fecha_vencimiento || '',
          est,
          r.ubicacion.estado,
          r.ubicacion.municipio,
          r.ubicacion.parroquia
        ];
      })
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(i => `"${i}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `usuarios_membresias_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtrados = registros.filter(r => {
    const texto = `${r.datos.nombre} ${r.datos.apellido} ${r.datos.cedula} ${r.datos.programa} ${r.datos.disciplina_gbp || ''} ${r.ubicacion.estado}`.toLowerCase();
    const matchText = texto.includes(searchTerm.toLowerCase());
    if (!matchText) return false;

    if (selectedMembresiaFilter !== 'TODOS') {
      const est = obtenerEstadoMembresia(r.datos.estado_solvencia, r.datos.fecha_vencimiento);
      if (est !== selectedMembresiaFilter) return false;
    }
    return true;
  });

  const getBadgeStyle = (estado: EstadoMembresia) => {
    switch (estado) {
      case 'Activo': 
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.35)', dot: '#10b981' };
      case 'Próximo a Vencer': 
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)', dot: '#f59e0b' };
      case 'Vencido': 
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.35)', dot: '#ef4444' };
    }
  };

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={26} style={{ color: 'var(--accent-blue-light)' }} />
            <span>Padrón de Beneficiarios y Atletas</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Registro de deportistas, voceros y control de estado de membresías de la Gran Base de Paz.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            title="Importar usuarios directamente desde el archivo Excel oficial"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FileSpreadsheet size={16} style={{ color: 'var(--accent-amber)' }} />
            <span>Importar Excel</span>
          </button>
          <button onClick={handleExportarCSV} className="btn btn-secondary">
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ fontWeight: 600 }}>
            <UserPlus size={16} />
            <span>Registrar Atleta / Persona</span>
          </button>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Buscar por cédula, nombre, disciplina o estado..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          {/* Filtro Estado de Membresía */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Membresía:</span>
            <select
              className="form-select"
              style={{ width: '170px' }}
              value={selectedMembresiaFilter}
              onChange={e => setSelectedMembresiaFilter(e.target.value)}
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="Activo">🟢 Activo</option>
              <option value="Próximo a Vencer">🟠 Próximo a Vencer</option>
              <option value="Vencido">🔴 Vencido</option>
            </select>
          </div>

          {/* Filtro Geográfico */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={15} style={{ color: '#f59e0b' }} />
            <select
              className="form-select"
              style={{ width: '180px' }}
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

      {/* Modal de Registro */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} style={{ color: '#3b82f6' }} />
                <span>Registrar Atleta / Beneficiario</span>
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="btn btn-secondary"
                style={{ padding: '4px 10px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar}>
              <div className="modal-body">
                {/* Cédula y Validación SAIME */}
                <div style={{ padding: '14px', background: 'rgba(37, 99, 235, 0.08)', borderRadius: '10px', border: '1px solid rgba(37, 99, 235, 0.25)', marginBottom: '18px' }}>
                  <label className="form-label" style={{ color: '#93c5fd' }}>
                    Cédula de Identidad *
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Ej: V-18452391"
                      value={cedulaInput}
                      onChange={e => setCedulaInput(e.target.value)}
                      className="form-input"
                      style={{ fontWeight: 600 }}
                    />
                    <button
                      type="button"
                      onClick={handleValidarSaime}
                      disabled={isValidatingSaime}
                      className="btn btn-primary"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <ShieldCheck size={16} />
                      <span>{isValidatingSaime ? 'Consultando...' : 'Consultar'}</span>
                    </button>
                  </div>

                  {saimeStatus && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: saimeStatus.validado ? '#34d399' : '#f87171' }}>
                      {saimeStatus.validado ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                      <span>{saimeStatus.mensaje}</span>
                    </div>
                  )}
                </div>

                {/* Datos Personales */}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Nombres *</label>
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apellidos *</label>
                    <input
                      type="text"
                      required
                      value={apellido}
                      onChange={e => setApellido(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      placeholder="+58 412..."
                      value={telefono}
                      onChange={e => setTelefono(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Género</label>
                    <select
                      value={genero}
                      onChange={e => setGenero(e.target.value as any)}
                      className="form-select"
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={fechaNacimiento}
                      onChange={e => setFechaNacimiento(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Configuración de Membresía */}
                <div style={{
                  padding: '14px',
                  background: 'rgba(30, 41, 59, 0.45)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '12px',
                  margin: '12px 0'
                }}>
                  <label className="form-label" style={{ color: '#93c5fd', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarIcon size={14} />
                    <span>Membresía y Vencimiento</span>
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleSeleccionarTipoMembresia('Semanal')}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: tipoMembresia === 'Semanal' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                        background: tipoMembresia === 'Semanal' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: tipoMembresia === 'Semanal' ? '#ffffff' : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      📅 Semanal (7 días)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSeleccionarTipoMembresia('Mensual')}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: tipoMembresia === 'Mensual' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                        background: tipoMembresia === 'Mensual' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: tipoMembresia === 'Mensual' ? '#ffffff' : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ⭐ Mensual (30 días)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSeleccionarTipoMembresia('Personalizada')}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: tipoMembresia === 'Personalizada' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                        background: tipoMembresia === 'Personalizada' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: tipoMembresia === 'Personalizada' ? '#ffffff' : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      🗓️ Elegir en Calendario
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Fecha de Vencimiento:
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={fechaVencimiento}
                        onChange={e => {
                          setFechaVencimiento(e.target.value);
                          setTipoMembresia('Personalizada');
                        }}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Estado Calculado:
                      </label>
                      {(() => {
                        const b = getBadgeStyle(estadoMembresiaCalculado);
                        return (
                          <div style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: b.bg,
                            border: `1px solid ${b.border}`,
                            color: b.text,
                            fontWeight: 700,
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: b.dot }}></span>
                            <span>{estadoMembresiaCalculado}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Ubicación Territorial */}
                <div style={{ marginTop: '8px', marginBottom: '16px' }}>
                  <label className="form-label" style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} />
                    <span>Ubicación Territorial</span>
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
                  <div style={{ marginTop: '10px' }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Comunidad / Sector</label>
                    <input
                      type="text"
                      placeholder="Ej: Sector Los Rosales"
                      value={comunidad}
                      onChange={e => setComunidad(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Disciplina y Rol */}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Disciplina Principal</label>
                    <select value={disciplinaGbp} onChange={e => setDisciplinaGbp(e.target.value)} className="form-select">
                      <option value="Musculación / Máquinas">Musculación / Máquinas</option>
                      <option value="Crossfit & Funcional">Crossfit & Funcional</option>
                      <option value="Spinning / Ciclismo Indoor">Spinning / Ciclismo</option>
                      <option value="Boxeo y Kickboxing">Boxeo y Kickboxing</option>
                      <option value="Karate y Artes Marciales">Karate y Artes Marciales</option>
                      <option value="Danza y Baile">Danza y Baile</option>
                      <option value="Cancha Multiuso">Cancha Multiuso</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rol Comunitario</label>
                    <input
                      type="text"
                      value={rolComunitario}
                      onChange={e => setRolComunitario(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observaciones</label>
                  <textarea
                    rows={2}
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    className="form-textarea"
                    placeholder="Detalles adicionales..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Atleta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de Personas y Membresías */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cédula / ID Base</th>
              <th>Nombre y Apellido</th>
              <th>Disciplina</th>
              <th>Ubicación</th>
              <th>Membresía</th>
              <th>Sincronización</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No se encontraron atletas o usuarios registrados.
                </td>
              </tr>
            ) : (
              filtrados.map(r => {
                const estadoActual = obtenerEstadoMembresia(r.datos.estado_solvencia, r.datos.fecha_vencimiento);
                const badge = getBadgeStyle(estadoActual);
                return (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#60a5fa' }}>
                        {r.datos.cedula}
                      </span>
                      {r.datos.id_gbp && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
                          {r.datos.id_gbp}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {r.datos.nombre} {r.datos.apellido}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {r.datos.rol_comunitario || 'Atleta'} {r.datos.telefono ? `• ${r.datos.telefono}` : ''}
                      </div>
                    </td>
                    <td>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.15)', color: '#93c5fd', fontSize: '12px', fontWeight: 500 }}>
                        {r.datos.disciplina_gbp || r.datos.programa}
                      </span>
                    </td>
                    <td>
                      <div style={{ color: '#e2e8f0', fontSize: '13px' }}>
                        {r.ubicacion.estado} • {r.ubicacion.municipio}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Pq. {r.ubicacion.parroquia} {r.datos.sector ? `(Sec: ${r.datos.sector})` : r.ubicacion.comunidad ? `(${r.ubicacion.comunidad})` : ''}
                      </div>
                    </td>
                    <td>
                      <div>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 9px',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: badge.dot }}></span>
                          {estadoActual}
                        </span>
                        {r.datos.fecha_vencimiento && (
                          <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '3px' }}>
                            Vence: <strong style={{ color: '#cbd5e1' }}>{r.datos.fecha_vencimiento}</strong>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {r.sincronizado ? (
                        <span className="status-pill status-online" style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex' }}>
                          ✓ Sincronizado
                        </span>
                      ) : (
                        <span className="status-pill status-syncing" style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex' }}>
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleEliminar(r.id)}
                        className="btn btn-danger"
                        style={{ padding: '5px 8px' }}
                        title="Eliminar Registro"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
