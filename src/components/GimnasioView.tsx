import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dumbbell, 
  Search, 
  UserPlus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Star, 
  CreditCard, 
  UserCheck, 
  MapPin, 
  DollarSign, 
  Filter, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  X,
  Phone,
  Building2,
  ChevronRight,
  Award,
  Zap,
  CalendarCheck2
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { BcvService, TasaBCVInfo } from '../services/bcvService';
import { ESTADOS_VENEZUELA } from '../data/venezuela';
import { 
  Registro, 
  UsuarioSesion, 
  EstadoMembresia, 
  obtenerEstadoMembresia, 
  MetodoPago, 
  isDeveloperSesion,
  puedeVerNacional,
  isAdministradorBase,
  AsistenciaRegistro
} from '../types';

interface GimnasioViewProps {
  sesion: UsuarioSesion;
  onNavigateToPersona?: (cedula: string) => void;
}

type TabFiltroMembresia = 'TODOS' | 'ACTIVO' | 'PROXIMO' | 'VENCIDO' | 'ATLETA';

export const GimnasioView: React.FC<GimnasioViewProps> = ({ sesion }) => {
  // Datos reactivos
  const [personas, setPersonas] = useState<Registro[]>(() => StorageService.obtenerRegistros('persona'));
  const [asistenciasHoy, setAsistenciasHoy] = useState<AsistenciaRegistro[]>(() => StorageService.obtenerAsistencias());
  const [tasaBCV, setTasaBCV] = useState<TasaBCVInfo>(() => BcvService.obtenerTasaSincrona());

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroMembresia, setFiltroMembresia] = useState<TabFiltroMembresia>('TODOS');

  // Aislamiento territorial por Estado y Base de Misiones
  const isSuperUser = puedeVerNacional(sesion);
  const esAdminBase = isAdministradorBase(sesion);
  const baseAsignada = (sesion.base_misiones_nombre || '').trim();

  const [filtroEstado, setFiltroEstado] = useState<string>(isSuperUser ? 'TODOS' : (sesion.estado_asignado || 'TODOS'));
  const [filtroBaseMisiones, setFiltroBaseMisiones] = useState<string>(
    esAdminBase ? baseAsignada : (isSuperUser ? '' : baseAsignada)
  );

  // Modales
  const [modalRenovacion, setModalRenovacion] = useState<Registro | null>(null);
  const [modalNuevoUsuario, setModalNuevoUsuario] = useState(false);
  const [alertaVencidoModal, setAlertaVencidoModal] = useState<Registro | null>(null);
  const [toastMsg, setToastMsg] = useState<{ tipo: 'ok' | 'warn'; texto: string } | null>(null);

  // Formulario Renovación
  const [opcionSemanas, setOpcionSemanas] = useState<'1' | '2' | 'custom'>('1');
  const [fechaFinRenovacion, setFechaFinRenovacion] = useState<string>(() => StorageService.calcularProximoViernes(1));
  const [montoBsRenovacion, setMontoBsRenovacion] = useState<string>('');
  const [metodoPagoRenovacion, setMetodoPagoRenovacion] = useState<MetodoPago>('Pago Móvil');
  const [referenciaRenovacion, setReferenciaRenovacion] = useState<string>('');
  const [registrarEnCaja, setRegistrarEnCaja] = useState<boolean>(true);

  // Formulario Nuevo Usuario
  const [formCedula, setFormCedula] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formApellido, setFormApellido] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formGenero, setFormGenero] = useState<'Masculino' | 'Femenino' | 'Otro'>('Masculino');
  const [formEsAtleta, setFormEsAtleta] = useState(false);
  const [formDisciplinaAtleta, setFormDisciplinaAtleta] = useState('Levantamiento de Pesas');
  const [formBaseMisiones, setFormBaseMisiones] = useState(sesion.base_misiones_nombre || 'Gran Base de Paz');
  const [formEstado, setFormEstado] = useState(sesion.estado_asignado || 'Distrito Capital');
  const [formSemanasIniciales, setFormSemanasIniciales] = useState<'1' | '2'>('1');
  const [formMontoInicial, setFormMontoInicial] = useState<string>('');

  // Recarga reactiva
  const recargarDatos = () => {
    setPersonas(StorageService.obtenerRegistros('persona'));
    setAsistenciasHoy(StorageService.obtenerAsistencias());
    setTasaBCV(BcvService.obtenerTasaSincrona());
  };

  useEffect(() => {
    window.addEventListener('mpv-data-updated', recargarDatos);
    window.addEventListener('mpv-asistencia-updated', recargarDatos);
    window.addEventListener('mpv-pagos-updated', recargarDatos);
    window.addEventListener('mpv-bcv-updated', recargarDatos);

    return () => {
      window.removeEventListener('mpv-data-updated', recargarDatos);
      window.removeEventListener('mpv-asistencia-updated', recargarDatos);
      window.removeEventListener('mpv-pagos-updated', recargarDatos);
      window.removeEventListener('mpv-bcv-updated', recargarDatos);
    };
  }, []);

  const hoyStr = new Date().toISOString().split('T')[0];

  // Identificar si una persona ya asistió hoy
  const asistenciaPorCedula = useMemo(() => {
    const mapa = new Map<string, AsistenciaRegistro>();
    asistenciasHoy
      .filter(a => a.fecha === hoyStr)
      .forEach(a => {
        if (a.usuario_cedula) mapa.set(a.usuario_cedula.trim().toUpperCase(), a);
      });
    return mapa;
  }, [asistenciasHoy, hoyStr]);

  // Filtrado de usuarios por Base de Misiones / Estado con aislamiento estricto
  const usuariosGym = useMemo(() => {
    return personas.filter(p => {
      // 1. Si es Administrador de Base, filtrar estrictamente por su base
      if (esAdminBase) {
        if (!baseAsignada) return true;
        const basePersona = (p.datos?.base_misiones || p.ubicacion?.comunidad || '').toLowerCase();
        return basePersona.includes(baseAsignada.toLowerCase());
      }

      // 2. Si es Administrador Nacional o Desarrollador, aplicar filtros seleccionados libremente
      if (filtroEstado !== 'TODOS' && p.ubicacion?.estado !== filtroEstado) {
        return false;
      }
      if (filtroBaseMisiones.trim()) {
        const basePersona = (p.datos?.base_misiones || p.ubicacion?.comunidad || '').toLowerCase();
        if (!basePersona.includes(filtroBaseMisiones.trim().toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [personas, filtroEstado, filtroBaseMisiones, esAdminBase, baseAsignada]);

  // Cálculo de KPIs
  const metricas = useMemo(() => {
    let activos = 0;
    let proximos = 0;
    let vencidos = 0;
    let atletas = 0;

    usuariosGym.forEach(p => {
      const esAtleta = !!p.datos?.es_atleta_alto_rendimiento;
      if (esAtleta) {
        atletas++;
        activos++;
        return;
      }
      const st = obtenerEstadoMembresia(p.datos?.estado_solvencia, p.datos?.fecha_vencimiento, false);
      if (st === 'Activo') activos++;
      else if (st === 'Próximo a Vencer') proximos++;
      else if (st === 'Vencido') vencidos++;
    });

    return { total: usuariosGym.length, activos, proximos, vencidos, atletas };
  }, [usuariosGym]);

  // Filtrado reactivo en pantalla
  const usuariosFiltrados = useMemo(() => {
    return usuariosGym.filter(p => {
      const esAtleta = !!p.datos?.es_atleta_alto_rendimiento;
      const estado = obtenerEstadoMembresia(p.datos?.estado_solvencia, p.datos?.fecha_vencimiento, esAtleta);

      if (filtroMembresia === 'ATLETA' && !esAtleta) return false;
      if (filtroMembresia === 'ACTIVO' && (estado !== 'Activo' || esAtleta)) return false;
      if (filtroMembresia === 'PROXIMO' && estado !== 'Próximo a Vencer') return false;
      if (filtroMembresia === 'VENCIDO' && estado !== 'Vencido') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const cedula = (p.datos?.cedula || '').toLowerCase();
        const nombre = `${p.datos?.nombre || ''} ${p.datos?.apellido || ''}`.toLowerCase();
        const idGbp = (p.datos?.id_gbp || '').toLowerCase();
        if (!cedula.includes(q) && !nombre.includes(q) && !idGbp.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [usuariosGym, filtroMembresia, searchTerm]);

  const handleAbrirRenovacion = (persona: Registro) => {
    setModalRenovacion(persona);
    setOpcionSemanas('1');
    setFechaFinRenovacion(StorageService.calcularProximoViernes(1));
    setMontoBsRenovacion(''); // Monto libre: el operador ingresa la cifra que corresponda
    setReferenciaRenovacion('');
    setRegistrarEnCaja(true);
  };

  const handleCambiarOpcionSemanas = (opc: '1' | '2' | 'custom') => {
    setOpcionSemanas(opc);
    if (opc === '1') {
      setFechaFinRenovacion(StorageService.calcularProximoViernes(1));
    } else if (opc === '2') {
      setFechaFinRenovacion(StorageService.calcularProximoViernes(2));
    }
    // El monto no se sobreescribe: queda a discreción del usuario/operador
  };

  const handleConfirmarRenovacion = () => {
    if (!modalRenovacion) return;

    const esAtleta = !!modalRenovacion.datos?.es_atleta_alto_rendimiento;
    const montoBsNum = esAtleta ? 0 : (parseFloat(montoBsRenovacion) || 0);
    const montoUsdNum = BcvService.bolivaresADolares(montoBsNum, tasaBCV.tasa);

    StorageService.renovarMembresiaGym({
      personaId: modalRenovacion.id,
      nuevaFechaVencimiento: esAtleta ? '2099-12-31' : fechaFinRenovacion,
      tipoMembresia: opcionSemanas === '1' ? 'Semanal' : 'Personalizada',
      pago: registrarEnCaja && !esAtleta ? {
        monto_bs: montoBsNum,
        monto_usd: montoUsdNum,
        tasa_bcv: tasaBCV.tasa,
        metodo_pago: metodoPagoRenovacion,
        referencia: referenciaRenovacion || `SEMANAL-${Date.now().toString().slice(-4)}`,
        observaciones: `Membresía semanal gym (Lunes a Viernes hasta ${fechaFinRenovacion})`
      } : undefined
    }, sesion.cedula);

    setModalRenovacion(null);
    setAlertaVencidoModal(null);
    setToastMsg({
      tipo: 'ok',
      texto: `Membresía de ${modalRenovacion.datos.nombre} renovada hasta el viernes ${fechaFinRenovacion}`
    });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleMarcarAsistencia = (persona: Registro) => {
    const esAtleta = !!persona.datos?.es_atleta_alto_rendimiento;
    const st = obtenerEstadoMembresia(persona.datos?.estado_solvencia, persona.datos?.fecha_vencimiento, esAtleta);

    if (st === 'Vencido') {
      setAlertaVencidoModal(persona);
      return;
    }

    const asist = StorageService.registrarEntradaAsistencia({
      id: persona.datos?.id_gbp || persona.id,
      nombre: `${persona.datos?.nombre} ${persona.datos?.apellido}`.trim(),
      cedula: persona.datos?.cedula,
      disciplina: esAtleta ? (persona.datos?.disciplina_atleta || 'Alto Rendimiento') : 'Gimnasio / Musculación'
    }, sesion.cedula);

    setToastMsg({
      tipo: 'ok',
      texto: `⚡ Entrada registrada para ${persona.datos?.nombre} a las ${asist.hora_entrada}`
    });
    setTimeout(() => setToastMsg(null), 3500);
  };


  const handleGuardarNuevoUsuario = () => {
    if (!formCedula.trim() || !formNombre.trim()) {
      alert('Por favor ingresa la cédula y el nombre del usuario.');
      return;
    }

    const fechaVenc = formEsAtleta 
      ? '2099-12-31' 
      : StorageService.calcularProximoViernes(formSemanasIniciales === '1' ? 1 : 2);

    const nuevo = StorageService.guardarRegistro({
      tipo: 'persona',
      datos: {
        id_gbp: `GBP-${Math.floor(1000 + Math.random() * 9000)}`,
        nombre: formNombre.trim(),
        apellido: formApellido.trim(),
        cedula: formCedula.trim().toUpperCase(),
        telefono: formTelefono.trim(),
        fecha_nacimiento: '1995-01-01',
        genero: formGenero,
        programa: 'Gran Base de Paz - Gimnasio Vertical',
        rol_comunitario: formEsAtleta ? 'Atleta de Alto Rendimiento' : 'Usuario Gimnasio',
        base_misiones: formBaseMisiones.trim() || sesion.base_misiones_nombre || 'Gran Base de Paz',
        es_atleta_alto_rendimiento: formEsAtleta,
        disciplina_atleta: formEsAtleta ? formDisciplinaAtleta : undefined,
        disciplina_gbp: 'Musculación y Fitness',
        estado_solvencia: 'Activo',
        tipo_membresia: 'Semanal',
        fecha_inscripcion: hoyStr,
        fecha_vencimiento: fechaVenc
      },
      ubicacion: {
        estado: formEstado || sesion.estado_asignado || 'Distrito Capital',
        municipio: sesion.municipio_asignado || 'Libertador',
        parroquia: sesion.parroquia_asignada || 'Sucre',
        comunidad: formBaseMisiones.trim() || sesion.base_misiones_nombre || 'Gran Base de Paz'
      }
    }, sesion.cedula);

    if (!formEsAtleta) {
      const montoBs = parseFloat(formMontoInicial) || 0;
      if (montoBs > 0) {
        StorageService.registrarPago({
          usuario_id: nuevo.datos.id_gbp,
          usuario_nombre: `${nuevo.datos.nombre} ${nuevo.datos.apellido}`.trim(),
          usuario_cedula: nuevo.datos.cedula,
          fecha_pago: hoyStr,
          plan: formSemanasIniciales === '1' ? 'Semanal' : 'Abono por Adelanto',
          servicio: 'Servicio de Maquinas Musculacion',
          monto_bs: montoBs,
          monto_usd: BcvService.bolivaresADolares(montoBs, tasaBCV.tasa),
          tasa_bcv: tasaBCV.tasa,
          metodo_pago: 'Efectivo',
          referencia: `INIC-${Date.now().toString().slice(-4)}`,
          estado: 'Solvente',
          tipo_membresia: 'Semanal',
          fecha_vencimiento: fechaVenc,
          observaciones: `Inscripción inicial gym (${formSemanasIniciales} semana(s) de Lunes a Viernes)`
        }, sesion.cedula);
      }
    }

    setModalNuevoUsuario(false);
    setFormCedula('');
    setFormNombre('');
    setFormApellido('');
    setFormTelefono('');
    setFormMontoInicial('');
    setFormEsAtleta(false);
    setToastMsg({
      tipo: 'ok',
      texto: `¡Usuario ${formNombre} inscrito con éxito!`
    });
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="gym-container">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`gym-toast ${toastMsg.tipo === 'ok' ? 'toast-ok' : 'toast-warn'}`}>
          {toastMsg.tipo === 'ok' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span>{toastMsg.texto}</span>
        </div>
      )}

      {/* HEADER HERO BANNER */}
      <div className="gym-hero">
        <div className="gym-hero-bg-glow" />
        <div className="gym-hero-content">
          <div className="gym-hero-left">
            <div className="gym-hero-icon-box">
              <Dumbbell size={32} />
            </div>
            <div>
              <div className="gym-hero-badge-row">
                <span className="gym-pill-tag">
                  <Clock size={12} /> Ciclo Semanal: Lunes a Viernes
                </span>
                <span className="gym-pill-gold">
                  <Star size={12} /> Atletas Exentos (0 Bs)
                </span>
              </div>
              <h1 className="gym-hero-title">
                Gimnasio Vertical — Membresías & Control
              </h1>
              <p className="gym-hero-subtitle">
                Gestión semanal de usuarios, control de solvencia en tiempo real y asistencia diaria por sede.
              </p>
            </div>
          </div>

          <div className="gym-hero-right">
            {/* Tasa BCV Pill */}
            <div className="gym-stat-pill">
              <DollarSign size={16} className="text-emerald" />
              <div>
                <div className="stat-pill-label">Tasa Oficial BCV</div>
                <div className="stat-pill-value">Bs. {tasaBCV.tasa.toFixed(2)}</div>
              </div>
            </div>

            {/* Sede / Base de Misiones */}
            <div className="gym-stat-pill">
              <Building2 size={16} className="text-blue" />
              <div>
                <div className="stat-pill-label">Base de Misiones</div>
                <div className="stat-pill-value truncate-140">
                  {filtroBaseMisiones || sesion.base_misiones_nombre || 'Gran Base de Paz'}
                </div>
              </div>
            </div>

            {/* Selector de Estado para Superadmin */}
            {isSuperUser && (
              <div className="gym-stat-pill state-picker">
                <Filter size={15} className="text-amber" />
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="gym-select-mini"
                >
                  <option value="TODOS">Todos los Estados</option>
                  {ESTADOS_VENEZUELA.map(est => (
                    <option key={est.nombre} value={est.nombre}>{est.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Botón Principal: Inscribir */}
            <button
              onClick={() => setModalNuevoUsuario(true)}
              className="gym-btn-primary"
            >
              <UserPlus size={18} />
              Inscribir Usuario
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="gym-kpi-grid">
        {/* Total Miembros */}
        <div 
          onClick={() => setFiltroMembresia('TODOS')}
          className={`gym-kpi-card ${filtroMembresia === 'TODOS' ? 'active-kpi blue' : ''}`}
        >
          <div className="kpi-top">
            <span className="kpi-label">Total Miembros</span>
            <div className="kpi-icon-wrap blue"><Dumbbell size={18} /></div>
          </div>
          <div className="kpi-number">{metricas.total}</div>
          <div className="kpi-sub">Usuarios registrados en el gym</div>
        </div>

        {/* Activos */}
        <div 
          onClick={() => setFiltroMembresia('ACTIVO')}
          className={`gym-kpi-card ${filtroMembresia === 'ACTIVO' ? 'active-kpi emerald' : ''}`}
        >
          <div className="kpi-top">
            <span className="kpi-label">Activos / Solventes</span>
            <div className="kpi-icon-wrap emerald"><CheckCircle2 size={18} /></div>
          </div>
          <div className="kpi-number text-emerald">{metricas.activos}</div>
          <div className="kpi-sub">Membresía semanal al día</div>
        </div>

        {/* Por Vencer */}
        <div 
          onClick={() => setFiltroMembresia('PROXIMO')}
          className={`gym-kpi-card ${filtroMembresia === 'PROXIMO' ? 'active-kpi amber' : ''}`}
        >
          <div className="kpi-top">
            <span className="kpi-label">Por Vencer (≤3 d)</span>
            <div className="kpi-icon-wrap amber"><AlertTriangle size={18} /></div>
          </div>
          <div className="kpi-number text-amber">{metricas.proximos}</div>
          <div className="kpi-sub">Vence este viernes</div>
        </div>

        {/* Vencidos */}
        <div 
          onClick={() => setFiltroMembresia('VENCIDO')}
          className={`gym-kpi-card ${filtroMembresia === 'VENCIDO' ? 'active-kpi red' : ''}`}
        >
          <div className="kpi-top">
            <span className="kpi-label">Vencidos / Deuda</span>
            <div className="kpi-icon-wrap red"><XCircle size={18} /></div>
          </div>
          <div className="kpi-number text-red">{metricas.vencidos}</div>
          <div className="kpi-sub">Requiere renovar ciclo</div>
        </div>

        {/* Atletas de Alto Rendimiento */}
        <div 
          onClick={() => setFiltroMembresia('ATLETA')}
          className={`gym-kpi-card gold-card ${filtroMembresia === 'ATLETA' ? 'active-kpi gold' : ''}`}
        >
          <div className="kpi-top">
            <span className="kpi-label text-gold">Alto Rendimiento</span>
            <div className="kpi-icon-wrap gold"><Star size={18} /></div>
          </div>
          <div className="kpi-number text-gold">{metricas.atletas}</div>
          <div className="kpi-sub">Exentos de cobro (0 Bs)</div>
        </div>
      </div>

      {/* TOOLBAR: BUSCADOR & FILTROS */}
      <div className="gym-toolbar">
        <div className="gym-search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cédula o nombre del usuario..."
            className="gym-search-input"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="clear-search">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="gym-filter-tabs">
          <button
            onClick={() => setFiltroMembresia('TODOS')}
            className={`gym-tab ${filtroMembresia === 'TODOS' ? 'tab-active' : ''}`}
          >
            Todos ({metricas.total})
          </button>
          <button
            onClick={() => setFiltroMembresia('ACTIVO')}
            className={`gym-tab tab-emerald ${filtroMembresia === 'ACTIVO' ? 'tab-active-emerald' : ''}`}
          >
            🟢 Activos ({metricas.activos - metricas.atletas})
          </button>
          <button
            onClick={() => setFiltroMembresia('PROXIMO')}
            className={`gym-tab tab-amber ${filtroMembresia === 'PROXIMO' ? 'tab-active-amber' : ''}`}
          >
            🟡 Por Vencer ({metricas.proximos})
          </button>
          <button
            onClick={() => setFiltroMembresia('VENCIDO')}
            className={`gym-tab tab-red ${filtroMembresia === 'VENCIDO' ? 'tab-active-red' : ''}`}
          >
            🔴 Vencidos ({metricas.vencidos})
          </button>
          <button
            onClick={() => setFiltroMembresia('ATLETA')}
            className={`gym-tab tab-gold ${filtroMembresia === 'ATLETA' ? 'tab-active-gold' : ''}`}
          >
            ⭐ Atletas ({metricas.atletas})
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE USUARIOS */}
      <div className="gym-table-wrapper">
        <table className="gym-table">
          <thead>
            <tr>
              <th>Miembro / Usuario</th>
              <th>Categoría Deportiva</th>
              <th>Base de Misiones / Estado</th>
              <th>Estado Membresía</th>
              <th>Vigencia (Viernes)</th>
              <th className="text-center">Asistencia Hoy</th>
              <th className="text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="gym-empty-state">
                  <Dumbbell size={48} className="empty-icon" />
                  <h4>No se encontraron miembros en esta vista</h4>
                  <p>Intenta con otro término de búsqueda o inscribe un nuevo usuario.</p>
                </td>
              </tr>
            ) : (
              usuariosFiltrados.map((p) => {
                const esAtleta = !!p.datos?.es_atleta_alto_rendimiento;
                const estado = obtenerEstadoMembresia(p.datos?.estado_solvencia, p.datos?.fecha_vencimiento, esAtleta);
                const cedulaNorm = (p.datos?.cedula || '').trim().toUpperCase();
                const asistenciaHoy = asistenciaPorCedula.get(cedulaNorm);

                // Días restantes hasta el viernes
                let diasRestantes: number | null = null;
                if (p.datos?.fecha_vencimiento && !esAtleta) {
                  const hoy = new Date();
                  hoy.setHours(0, 0, 0, 0);
                  const venc = new Date(p.datos.fecha_vencimiento.includes('T') ? p.datos.fecha_vencimiento : p.datos.fecha_vencimiento + 'T00:00:00');
                  if (!isNaN(venc.getTime())) {
                    diasRestantes = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                  }
                }

                return (
                  <tr key={p.id} className="gym-row">
                    {/* Miembro */}
                    <td>
                      <div className="member-cell">
                        <div className={`member-avatar ${esAtleta ? 'avatar-gold' : 'avatar-blue'}`}>
                          {p.datos?.nombre?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="member-name">
                            {p.datos?.nombre} {p.datos?.apellido}
                            {esAtleta && <Star size={14} className="star-inline" />}
                          </div>
                          <div className="member-meta">
                            <span className="member-cedula">{p.datos?.cedula}</span>
                            {p.datos?.telefono && (
                              <span className="member-phone">
                                <Phone size={11} /> {p.datos.telefono}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td>
                      {esAtleta ? (
                        <div className="category-block">
                          <span className="badge-athlete">
                            <Sparkles size={12} /> Alto Rendimiento
                          </span>
                          <span className="sub-discipline">
                            {p.datos?.disciplina_atleta || p.datos?.disciplina_gbp || 'Selección Deportiva'}
                          </span>
                        </div>
                      ) : (
                        <div className="category-block">
                          <span className="text-secondary font-medium">Membresía Semanal</span>
                          <span className="sub-discipline">{p.datos?.disciplina_gbp || 'Musculación'}</span>
                        </div>
                      )}
                    </td>

                    {/* Base de Misiones / Estado */}
                    <td>
                      <div className="location-cell">
                        <MapPin size={14} className="location-icon" />
                        <div>
                          <div className="base-name">{p.datos?.base_misiones || p.ubicacion?.comunidad || 'Gran Base de Paz'}</div>
                          <div className="state-name">{p.ubicacion?.estado}</div>
                        </div>
                      </div>
                    </td>

                    {/* Estado Membresía */}
                    <td>
                      {esAtleta ? (
                        <span className="status-badge badge-gold">
                          <Star size={12} /> Exento (0 Bs)
                        </span>
                      ) : estado === 'Activo' ? (
                        <span className="status-badge badge-emerald">
                          <CheckCircle2 size={12} /> Activo ({diasRestantes !== null ? `${diasRestantes}d` : 'Solvente'})
                        </span>
                      ) : estado === 'Próximo a Vencer' ? (
                        <span className="status-badge badge-amber">
                          <AlertTriangle size={12} /> Por Vencer ({diasRestantes}d)
                        </span>
                      ) : (
                        <span className="status-badge badge-red">
                          <XCircle size={12} /> Vencido
                        </span>
                      )}
                    </td>

                    {/* Vigencia */}
                    <td>
                      {esAtleta ? (
                        <span className="text-gold font-semibold">Permanente</span>
                      ) : p.datos?.fecha_vencimiento ? (
                        <div className="expiry-cell">
                          <span className="expiry-date">{p.datos.fecha_vencimiento}</span>
                          <span className="expiry-sub">Viernes de corte</span>
                        </div>
                      ) : (
                        <span className="text-muted">Sin asignar</span>
                      )}
                    </td>

                    {/* Asistencia Hoy */}
                    <td className="text-center">
                      {asistenciaHoy ? (
                        <div className="attendance-done">
                          <UserCheck size={14} />
                          Ingresó {asistenciaHoy.hora_entrada}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMarcarAsistencia(p)}
                          className={`btn-checkin ${estado === 'Vencido' && !esAtleta ? 'checkin-expired' : 'checkin-ready'}`}
                        >
                          <Zap size={14} />
                          Entrada Hoy
                        </button>
                      )}
                    </td>

                    {/* Acción */}
                    <td className="text-right">
                      <button
                        onClick={() => handleAbrirRenovacion(p)}
                        className="btn-renew"
                      >
                        <CreditCard size={14} />
                        Renovar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE RENOVACIÓN & PAGO */}
      {modalRenovacion && (
        <div className="gym-modal-backdrop">
          <div className="gym-modal-box">
            <button onClick={() => setModalRenovacion(null)} className="modal-close-btn">
              <X size={20} />
            </button>

            <div className="modal-header-custom">
              <div className="modal-icon-badge">
                <CreditCard size={24} />
              </div>
              <div>
                <h2>Renovar Membresía Semanal</h2>
                <p>{modalRenovacion.datos?.nombre} {modalRenovacion.datos?.apellido} ({modalRenovacion.datos?.cedula})</p>
              </div>
            </div>

            {modalRenovacion.datos?.es_atleta_alto_rendimiento ? (
              <div className="athlete-alert-box">
                <div className="athlete-alert-title">
                  <Star size={18} /> Atleta de Alto Rendimiento (Exento)
                </div>
                <p>
                  Este atleta está becado por la Gran Base de Paz y no requiere pago de membresía semanal (Costo 0 Bs).
                </p>
              </div>
            ) : (
              <div className="modal-form-content">
                {/* Selector de Semanas */}
                <div className="form-section">
                  <label className="section-label">Ciclo de Renovación (Lunes a Viernes)</label>
                  <div className="weeks-selector">
                    <button
                      type="button"
                      onClick={() => handleCambiarOpcionSemanas('1')}
                      className={`week-btn ${opcionSemanas === '1' ? 'week-btn-active' : ''}`}
                    >
                      <div className="week-title">+1 Semana</div>
                      <div className="week-sub">Hasta este viernes</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCambiarOpcionSemanas('2')}
                      className={`week-btn ${opcionSemanas === '2' ? 'week-btn-active' : ''}`}
                    >
                      <div className="week-title">+2 Semanas</div>
                      <div className="week-sub">Viernes siguiente (Adelanto)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCambiarOpcionSemanas('custom')}
                      className={`week-btn ${opcionSemanas === 'custom' ? 'week-btn-active' : ''}`}
                    >
                      <div className="week-title">Personalizado</div>
                      <div className="week-sub">Elegir en calendario</div>
                    </button>
                  </div>
                </div>

                {/* Fecha Fin */}
                <div className="form-section">
                  <label className="section-label">Fecha de Vencimiento de Membresía</label>
                  <div className="input-with-icon">
                    <Calendar size={18} className="field-icon" />
                    <input
                      type="date"
                      value={fechaFinRenovacion}
                      onChange={(e) => setFechaFinRenovacion(e.target.value)}
                      className="gym-field"
                    />
                  </div>
                </div>

                {/* Panel de Cobro y Caja */}
                <div className="checkout-card">
                  <div className="checkout-row">
                    <span className="checkout-label">Monto de Membresía (Bs) — Monto Libre:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={montoBsRenovacion}
                      onChange={(e) => setMontoBsRenovacion(e.target.value)}
                      placeholder="Monto acordado en Bs..."
                      className="checkout-input"
                    />
                  </div>

                  <div className="checkout-row secondary">
                    <span>Equivalente en Divisas (Tasa BCV):</span>
                    <span className="checkout-usd">
                      ≈ ${BcvService.bolivaresADolares(parseFloat(montoBsRenovacion) || 0, tasaBCV.tasa).toFixed(2)} USD
                    </span>
                  </div>

                  <div className="checkout-grid">
                    <div>
                      <label className="field-caption">Método de Pago</label>
                      <select
                        value={metodoPagoRenovacion}
                        onChange={(e) => setMetodoPagoRenovacion(e.target.value as MetodoPago)}
                        className="gym-select"
                      >
                        <option value="Pago Móvil">Pago Móvil</option>
                        <option value="Punto de Venta">Punto de Venta</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                      </select>
                    </div>

                    <div>
                      <label className="field-caption">Referencia de Pago</label>
                      <input
                        type="text"
                        value={referenciaRenovacion}
                        onChange={(e) => setReferenciaRenovacion(e.target.value)}
                        placeholder="Ej: PM-92810"
                        className="gym-field-mini"
                      />
                    </div>
                  </div>

                  <div className="checkbox-row">
                    <input
                      type="checkbox"
                      id="checkCaja"
                      checked={registrarEnCaja}
                      onChange={(e) => setRegistrarEnCaja(e.target.checked)}
                      className="gym-checkbox"
                    />
                    <label htmlFor="checkCaja">
                      Registrar automáticamente este ingreso en <strong>Caja y Pagos</strong>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setModalRenovacion(null)}
                className="btn-cancel"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRenovacion}
                className="btn-confirm-renew"
              >
                Confirmar Renovación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALERTA MEMBRESÍA VENCIDA AL MARCAR ACCESO */}
      {alertaVencidoModal && (
        <div className="gym-modal-backdrop">
          <div className="gym-modal-box alert-box-wrap">
            <div className="alert-icon-big">
              <AlertTriangle size={36} />
            </div>
            <h3>Membresía Vencida</h3>
            <p className="alert-text">
              El usuario <strong>{alertaVencidoModal.datos?.nombre} {alertaVencidoModal.datos?.apellido}</strong> ({alertaVencidoModal.datos?.cedula}) tiene su membresía semanal vencida desde el{' '}
              <span className="text-red font-mono font-bold">{alertaVencidoModal.datos?.fecha_vencimiento}</span>.
            </p>
            <div className="alert-subcard">
              Para ingresar al gimnasio, el miembro debe renovar su ciclo semanal de Lunes a Viernes.
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setAlertaVencidoModal(null)}
                className="btn-cancel"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  const target = alertaVencidoModal;
                  setAlertaVencidoModal(null);
                  handleAbrirRenovacion(target);
                }}
                className="btn-confirm-renew"
              >
                Renovar Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INSCRIBIR NUEVO USUARIO */}
      {modalNuevoUsuario && (
        <div className="gym-modal-backdrop">
          <div className="gym-modal-box large">
            <button onClick={() => setModalNuevoUsuario(false)} className="modal-close-btn">
              <X size={20} />
            </button>

            <div className="modal-header-custom">
              <div className="modal-icon-badge">
                <UserPlus size={24} />
              </div>
              <div>
                <h2>Inscribir Miembro en el Gimnasio</h2>
                <p>Registro de usuarios para membresías semanales o deportistas de alto rendimiento</p>
              </div>
            </div>

            <div className="modal-form-content">
              {/* Cédula de Identidad */}
              <div className="form-section">
                <label className="section-label">Cédula de Identidad *</label>
                <input
                  type="text"
                  value={formCedula}
                  onChange={(e) => setFormCedula(e.target.value.toUpperCase())}
                  placeholder="Ej: V-12345678"
                  className="gym-field"
                />
              </div>

              {/* Nombre y Apellido */}
              <div className="form-grid-2">
                <div>
                  <label className="field-caption">Nombres *</label>
                  <input
                    type="text"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej. Juan"
                    className="gym-field"
                  />
                </div>
                <div>
                  <label className="field-caption">Apellidos</label>
                  <input
                    type="text"
                    value={formApellido}
                    onChange={(e) => setFormApellido(e.target.value)}
                    placeholder="Ej. Pérez"
                    className="gym-field"
                  />
                </div>
              </div>

              {/* Teléfono y Género */}
              <div className="form-grid-2">
                <div>
                  <label className="field-caption">Teléfono</label>
                  <input
                    type="text"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    placeholder="+58 412 1234567"
                    className="gym-field"
                  />
                </div>
                <div>
                  <label className="field-caption">Género</label>
                  <select
                    value={formGenero}
                    onChange={(e) => setFormGenero(e.target.value as any)}
                    className="gym-select"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              {/* TOGGLE ALTO RENDIMIENTO */}
              <div className="athlete-toggle-card">
                <div className="athlete-toggle-header">
                  <div>
                    <div className="athlete-title">
                      <Star size={16} /> ¿Es Atleta de Alto Rendimiento?
                    </div>
                    <div className="athlete-sub">
                      Los atletas de selección no pagan membresía (exentos de cobro permanente).
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="toggleAthleteCheck"
                    checked={formEsAtleta}
                    onChange={(e) => setFormEsAtleta(e.target.checked)}
                    className="gym-toggle-switch"
                  />
                </div>

                {formEsAtleta && (
                  <div className="athlete-extra-field">
                    <label className="field-caption text-gold">Disciplina Deportiva del Atleta</label>
                    <input
                      type="text"
                      value={formDisciplinaAtleta}
                      onChange={(e) => setFormDisciplinaAtleta(e.target.value)}
                      placeholder="Ej: Judo, Atletismo, Halterofilia, Boxeo..."
                      className="gym-field-gold"
                    />
                  </div>
                )}
              </div>

              {/* Sede y Estado */}
              <div className="form-grid-2">
                <div>
                  <label className="field-caption">Base de Misiones / Sede</label>
                  <input
                    type="text"
                    value={formBaseMisiones}
                    onChange={(e) => setFormBaseMisiones(e.target.value)}
                    className="gym-field"
                  />
                </div>
                <div>
                  <label className="field-caption">Estado</label>
                  <input
                    type="text"
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value)}
                    className="gym-field"
                  />
                </div>
              </div>

              {/* Membresía inicial */}
              {!formEsAtleta && (
                <div className="form-section">
                  <label className="section-label">Ciclo de Membresía Inicial (Lunes a Viernes)</label>
                  <div className="weeks-selector" style={{ marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setFormSemanasIniciales('1')}
                      className={`week-btn ${formSemanasIniciales === '1' ? 'week-btn-active' : ''}`}
                    >
                      <div className="week-title">1 Semana</div>
                      <div className="week-sub">Vence este viernes</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormSemanasIniciales('2')}
                      className={`week-btn ${formSemanasIniciales === '2' ? 'week-btn-active' : ''}`}
                    >
                      <div className="week-title">2 Semanas</div>
                      <div className="week-sub">Viernes siguiente</div>
                    </button>
                  </div>

                  <div className="checkout-card">
                    <div className="checkout-row">
                      <span className="checkout-label">Monto Inicial a Cobrar (Bs) — Monto Libre:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formMontoInicial}
                        onChange={(e) => setFormMontoInicial(e.target.value)}
                        placeholder="Ej: 300.00"
                        className="checkout-input"
                      />
                    </div>
                    {parseFloat(formMontoInicial) > 0 && (
                      <div className="checkout-row secondary">
                        <span>Equivalente en Divisas (BCV):</span>
                        <span className="checkout-usd">
                          ≈ ${BcvService.bolivaresADolares(parseFloat(formMontoInicial) || 0, tasaBCV.tasa).toFixed(2)} USD
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setModalNuevoUsuario(false)}
                className="btn-cancel"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarNuevoUsuario}
                className="btn-confirm-renew"
              >
                Registrar Miembro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS CSS PROFESIONALES DE LA VISTA DEL GIMNASIO */}
      <style>{`
        .gym-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding-bottom: 40px;
        }

        /* Toast */
        .gym-toast {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 9999;
          color: #ffffff;
          padding: 14px 22px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
          font-size: 13.5px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .toast-ok {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 12px 30px rgba(5, 150, 105, 0.35);
        }
        .toast-warn {
          background: linear-gradient(135deg, #d97706, #b45309);
          box-shadow: 0 12px 30px rgba(217, 119, 6, 0.35);
        }

        /* Hero Banner */
        .gym-hero {
          background: linear-gradient(135deg, #0d1629 0%, #111a33 50%, #0a0f1d 100%);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 20px;
          padding: 24px 28px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .gym-hero-bg-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 250px;
          height: 250px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .gym-hero-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          position: relative;
          z-index: 2;
        }
        .gym-hero-left {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .gym-hero-icon-box {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
          flex-shrink: 0;
        }
        .gym-hero-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .gym-pill-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 20px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34d399;
          font-size: 11.5px;
          font-weight: 700;
        }
        .gym-pill-gold {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 20px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #fbbf24;
          font-size: 11.5px;
          font-weight: 700;
        }
        .gym-hero-title {
          font-family: var(--font-heading);
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .gym-hero-subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin-top: 4px;
        }
        .gym-hero-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .gym-stat-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          background: rgba(17, 26, 46, 0.85);
          border: 1px solid rgba(30, 45, 74, 0.9);
          border-radius: 12px;
          font-size: 12px;
          backdrop-filter: blur(8px);
        }
        .stat-pill-label {
          color: #64748b;
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .stat-pill-value {
          color: #ffffff;
          font-weight: 700;
          font-size: 12.5px;
        }
        .truncate-140 {
          max-width: 140px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .state-picker select {
          background: transparent;
          border: none;
          color: #fbbf24;
          font-weight: 700;
          font-size: 12px;
          outline: none;
          cursor: pointer;
        }
        .gym-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
          transition: all 0.2s ease;
        }
        .gym-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 26px rgba(37, 99, 235, 0.5);
          background: linear-gradient(135deg, #3b82f6, #2563eb);
        }

        /* KPI Cards Grid */
        .gym-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }
        .gym-kpi-card {
          background: #111a2e;
          border: 1px solid #1e2d4a;
          border-radius: 16px;
          padding: 18px 20px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        .gym-kpi-card:hover {
          background: #16223b;
          border-color: #3b82f6;
          transform: translateY(-2px);
        }
        .active-kpi.blue { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3); }
        .active-kpi.emerald { border-color: #10b981; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3); }
        .active-kpi.amber { border-color: #f59e0b; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3); }
        .active-kpi.red { border-color: #ef4444; box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3); }
        .active-kpi.gold { border-color: #fbbf24; box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3); }

        .gold-card {
          background: linear-gradient(135deg, #191b22 0%, #2a220e 100%);
          border-color: rgba(245, 158, 11, 0.3);
        }
        .kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .kpi-label {
          font-size: 11.5px;
          font-weight: 600;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 0.04em;
        }
        .kpi-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kpi-icon-wrap.blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .kpi-icon-wrap.emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .kpi-icon-wrap.amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .kpi-icon-wrap.red { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        .kpi-icon-wrap.gold { background: rgba(245, 158, 11, 0.25); color: #fbbf24; }

        .kpi-number {
          font-family: var(--font-heading);
          font-size: 26px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
        }
        .kpi-sub {
          font-size: 11px;
          color: #64748b;
          margin-top: 6px;
        }

        /* Toolbar */
        .gym-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          background: #111a2e;
          border: 1px solid #1e2d4a;
          border-radius: 16px;
          padding: 12px 18px;
        }
        .gym-search-box {
          position: relative;
          width: 360px;
          max-width: 100%;
          -webkit-app-region: no-drag !important;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          pointer-events: none;
        }
        .gym-search-input {
          width: 100%;
          padding: 10px 36px 10px 38px;
          background: #0a0f1d;
          border: 1px solid #1e2d4a;
          border-radius: 10px;
          color: #ffffff;
          font-size: 13.5px;
          outline: none;
          transition: all 0.2s ease;
          user-select: text !important;
          -webkit-user-select: text !important;
          -webkit-app-region: no-drag !important;
          pointer-events: auto !important;
        }
        .gym-search-input::placeholder {
          color: #475569;
        }
        .gym-search-input:hover {
          border-color: #2e456e;
          background: rgba(10, 15, 29, 0.95);
        }
        .gym-search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.22);
          background: #070b16;
        }
        .clear-search {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          -webkit-app-region: no-drag !important;
          padding: 4px;
          border-radius: 4px;
        }
        .clear-search:hover { color: #ffffff; background: rgba(255, 255, 255, 0.08); }

        .gym-filter-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .gym-tab {
          padding: 7px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          background: transparent;
          border: 1px solid transparent;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.15s;
        }
        .gym-tab:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }
        .tab-active {
          background: #2563eb !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        }
        .tab-active-emerald {
          background: #059669 !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.35);
        }
        .tab-active-amber {
          background: #d97706 !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);
        }
        .tab-active-red {
          background: #dc2626 !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);
        }
        .tab-active-gold {
          background: #b45309 !important;
          color: #fef3c7 !important;
          box-shadow: 0 4px 12px rgba(180, 83, 9, 0.35);
        }

        /* Table */
        .gym-table-wrapper {
          background: #111a2e;
          border: 1px solid #1e2d4a;
          border-radius: 16px;
          overflow-x: auto;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
        .gym-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .gym-table th {
          background: rgba(7, 10, 20, 0.7);
          padding: 14px 18px;
          font-size: 11.5px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #1e2d4a;
        }
        .gym-row {
          border-bottom: 1px solid rgba(30, 45, 74, 0.6);
          transition: background 0.15s;
        }
        .gym-row:hover {
          background: rgba(30, 45, 74, 0.35);
        }
        .gym-row td {
          padding: 14px 18px;
          font-size: 13.5px;
          color: #f8fafc;
          vertical-align: middle;
        }
        .gym-empty-state {
          padding: 48px 20px;
          text-align: center;
          color: #94a3b8;
        }
        .empty-icon {
          color: #334155;
          margin-bottom: 12px;
        }
        .gym-empty-state h4 {
          font-size: 16px;
          color: #e2e8f0;
          margin-bottom: 4px;
        }
        .gym-empty-state p {
          font-size: 12.5px;
          color: #64748b;
        }

        /* Cell specifics */
        .member-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .member-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }
        .avatar-blue {
          background: rgba(37, 99, 235, 0.2);
          color: #60a5fa;
          border: 1px solid rgba(37, 99, 235, 0.4);
        }
        .avatar-gold {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #000000;
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
        }
        .member-name {
          font-weight: 600;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .star-inline {
          color: #fbbf24;
          fill: #fbbf24;
        }
        .member-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          color: #94a3b8;
          font-family: monospace;
          margin-top: 2px;
        }
        .member-phone {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #64748b;
        }
        .category-block {
          display: flex;
          flex-direction: column;
        }
        .badge-athlete {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          font-weight: 700;
          color: #fbbf24;
        }
        .sub-discipline {
          font-size: 11px;
          color: #64748b;
        }
        .location-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
        }
        .location-icon {
          color: #64748b;
          flex-shrink: 0;
        }
        .base-name {
          font-weight: 500;
          color: #e2e8f0;
        }
        .state-name {
          font-size: 10.5px;
          color: #64748b;
        }

        /* Status Badges */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11.5px;
          font-weight: 700;
        }
        .badge-emerald {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34d399;
        }
        .badge-amber {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #fbbf24;
        }
        .badge-red {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #f87171;
        }
        .badge-gold {
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.45);
          color: #fde68a;
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.2);
        }

        .expiry-cell {
          display: flex;
          flex-direction: column;
          font-family: monospace;
          font-size: 12px;
        }
        .expiry-date {
          color: #f1f5f9;
          font-weight: 600;
        }
        .expiry-sub {
          font-size: 10px;
          color: #64748b;
          font-family: sans-serif;
        }

        /* Action Buttons */
        .attendance-done {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          padding: 5px 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
        }
        .btn-checkin {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .checkin-ready {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .checkin-ready:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.45);
        }
        .checkin-expired {
          background: #1e2d4a;
          color: #94a3b8;
          border: 1px solid rgba(239, 68, 68, 0.3) !important;
        }
        .checkin-expired:hover {
          color: #f87171;
          border-color: #ef4444 !important;
        }
        .btn-renew {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #1e2d4a;
          color: #cbd5e1;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-renew:hover {
          background: #2563eb;
          border-color: #3b82f6;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        /* Modal Styles */
        .gym-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(3, 7, 18, 0.82);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          -webkit-app-region: no-drag !important;
        }
        .gym-modal-box {
          background: #111a2e;
          border: 1px solid #1e3a5f;
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 28px;
          position: relative;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
          -webkit-app-region: no-drag !important;
        }
        .gym-modal-box.large {
          max-width: 580px;
        }
        .modal-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
        }
        .modal-close-btn:hover { color: #ffffff; }

        .modal-header-custom {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
        }
        .modal-icon-badge {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
          flex-shrink: 0;
        }
        .modal-header-custom h2 {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }
        .modal-header-custom p {
          font-size: 12.5px;
          color: #94a3b8;
          margin-top: 2px;
        }

        .modal-form-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .section-label {
          font-size: 12px;
          font-weight: 700;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .weeks-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .week-btn {
          background: #0a0f1d;
          border: 1px solid #1e2d4a;
          border-radius: 12px;
          padding: 10px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .week-btn:hover {
          border-color: #3b82f6;
        }
        .week-btn-active {
          background: #2563eb !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        }
        .week-title {
          font-size: 12.5px;
          font-weight: 700;
          color: #ffffff;
        }
        .week-sub {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 2px;
        }

        .input-with-icon {
          position: relative;
        }
        .field-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          pointer-events: none;
        }
        .input-with-icon .field-icon + .gym-field {
          padding-left: 38px;
        }
        .gym-field {
          width: 100%;
          padding: 10px 14px;
          background: #0a0f1d;
          border: 1px solid #1e2d4a;
          border-radius: 10px;
          color: #ffffff;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
          user-select: text !important;
          -webkit-user-select: text !important;
          -webkit-app-region: no-drag !important;
          pointer-events: auto !important;
        }
        .gym-field::placeholder {
          color: #475569;
          font-size: 13px;
        }
        .gym-field:hover {
          border-color: #2e456e;
          background: rgba(10, 15, 29, 0.95);
        }
        .gym-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.22);
          background: #070b16;
        }

        /* Checkout Card */
        .checkout-card {
          background: #0a0f1d;
          border: 1px solid #1e2d4a;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .checkout-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }
        .checkout-row.secondary {
          font-size: 11.5px;
          color: #94a3b8;
        }
        .checkout-label {
          color: #cbd5e1;
          font-weight: 600;
        }
        .checkout-input {
          min-width: 140px;
          width: auto;
          text-align: right;
          padding: 8px 12px;
          background: #111a2e;
          border: 1px solid #1e2d4a;
          border-radius: 8px;
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
          user-select: text !important;
          -webkit-user-select: text !important;
          -webkit-app-region: no-drag !important;
          pointer-events: auto !important;
        }
        .checkout-input::placeholder {
          color: #475569;
          font-size: 12px;
          font-weight: 400;
        }
        .checkout-input:hover {
          border-color: #2e456e;
        }
        .checkout-input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.22);
          background: #070b16;
        }
        .checkout-usd {
          color: #34d399;
          font-weight: 700;
          font-size: 13px;
        }
        .checkout-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding-top: 8px;
          border-top: 1px solid #1e2d4a;
        }
        .field-caption {
          display: block;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .gym-select {
          width: 100%;
          padding: 8px 10px;
          background: #111a2e;
          border: 1px solid #1e2d4a;
          border-radius: 8px;
          color: #ffffff;
          font-size: 12.5px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
          -webkit-app-region: no-drag !important;
          pointer-events: auto !important;
          cursor: pointer;
        }
        .gym-select:hover { border-color: #2e456e; }
        .gym-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        .gym-field-mini {
          width: 100%;
          padding: 8px 10px;
          background: #111a2e;
          border: 1px solid #1e2d4a;
          border-radius: 8px;
          color: #ffffff;
          font-size: 12.5px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
          user-select: text !important;
          -webkit-user-select: text !important;
          -webkit-app-region: no-drag !important;
          pointer-events: auto !important;
        }
        .gym-field-mini::placeholder { color: #475569; }
        .gym-field-mini:hover { border-color: #2e456e; }
        .gym-field-mini:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #cbd5e1;
          padding-top: 6px;
        }
        .gym-checkbox {
          accent-color: #2563eb;
          cursor: pointer;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 24px;
        }
        .btn-cancel {
          flex: 1;
          padding: 10px;
          border-radius: 12px;
          border: 1px solid #1e2d4a;
          background: transparent;
          color: #94a3b8;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }
        .btn-cancel:hover { background: #16223b; color: #ffffff; }
        .btn-confirm-renew {
          flex: 1;
          padding: 10px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
        }
        .btn-confirm-renew:hover {
          background: linear-gradient(135deg, #059669, #047857);
        }

        /* Athlete Toggle Card */
        .athlete-toggle-card {
          background: linear-gradient(135deg, #1a1b18 0%, #26210f 100%);
          border: 1px solid rgba(245, 158, 11, 0.35);
          border-radius: 14px;
          padding: 14px 16px;
        }
        .athlete-toggle-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .athlete-title {
          font-size: 13px;
          font-weight: 700;
          color: #fbbf24;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .athlete-sub {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .gym-toggle-switch {
          width: 20px;
          height: 20px;
          accent-color: #f59e0b;
          cursor: pointer;
        }
        .athlete-extra-field {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(245, 158, 11, 0.2);
        }
        .gym-field-gold {
          width: 100%;
          padding: 8px 12px;
          background: #0a0f1d;
          border: 1px solid rgba(245, 158, 11, 0.4);
          border-radius: 8px;
          color: #ffffff;
          font-size: 12.5px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
          user-select: text !important;
          -webkit-user-select: text !important;
          -webkit-app-region: no-drag !important;
          pointer-events: auto !important;
        }
        .gym-field-gold::placeholder { color: #785c28; }
        .gym-field-gold:hover { border-color: rgba(245, 158, 11, 0.6); }
        .gym-field-gold:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25);
        }

        /* Alert Box */
        .alert-box-wrap {
          text-align: center;
          border-color: rgba(239, 68, 68, 0.4);
        }
        .alert-icon-big {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px auto;
        }
        .alert-box-wrap h3 {
          color: #ffffff;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .alert-text {
          font-size: 13.5px;
          color: #cbd5e1;
          margin-bottom: 14px;
        }
        .alert-subcard {
          background: #0a0f1d;
          border: 1px solid #1e2d4a;
          border-radius: 10px;
          padding: 12px;
          font-size: 12px;
          color: #94a3b8;
          text-align: left;
          margin-bottom: 20px;
        }

        /* SAIME */
        .saime-loading {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 11px;
          color: #60a5fa;
        }
        .saime-msg {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        /* Colors helper */
        .text-emerald { color: #34d399; }
        .text-amber { color: #fbbf24; }
        .text-red { color: #f87171; }
        .text-gold { color: #fbbf24; }
        .text-blue { color: #60a5fa; }
        .text-muted { color: #64748b; }
        .text-secondary { color: #94a3b8; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }

        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
