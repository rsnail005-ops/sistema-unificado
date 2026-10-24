import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Receipt, 
  Printer, 
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  CloudUpload,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { LOGO_OFICIAL } from '../assets/logos';
import { BcvService } from '../services/bcvService';
import { 
  PagoRegistro, 
  UsuarioSesion, 
  PlanPago, 
  ServicioPago, 
  MetodoPago, 
  EstadoMembresia,
  obtenerEstadoMembresia,
  Registro
} from '../types';

interface PagosViewProps {
  sesion: UsuarioSesion;
}

export const PagosView: React.FC<PagosViewProps> = ({ sesion }) => {
  const [pagos, setPagos] = useState<PagoRegistro[]>(() => StorageService.obtenerPagos());
  const [personas, setPersonas] = useState<Registro[]>(() => StorageService.obtenerRegistros('persona'));
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comprobanteModal, setComprobanteModal] = useState<PagoRegistro | null>(null);
  const [pagoToDelete, setPagoToDelete] = useState<PagoRegistro | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const handleSincronizarServidor = async () => {
    setIsSyncing(true);
    try {
      const res = await StorageService.procesarColaSincronizacion();
      setPagos(StorageService.obtenerPagos());
      if (res.errores > 0) {
        setToastMsg({ tipo: 'err', texto: `Sincronización: ${res.exitosos} enviado(s), ${res.errores} con error.` });
      } else {
        setToastMsg({ tipo: 'ok', texto: `¡Sincronización exitosa! ${res.exitosos} registro(s) sincronizados con Supabase.` });
      }
    } catch (err: any) {
      setToastMsg({ tipo: 'err', texto: `Error sincronizando: ${err.message || 'Sin conexión'}` });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const handleConfirmarEliminarPago = () => {
    if (!pagoToDelete) return;
    StorageService.eliminarPago(pagoToDelete.id, sesion.cedula);
    setToastMsg({ tipo: 'ok', texto: `Pago de ${pagoToDelete.usuario_nombre} eliminado correctamente.` });
    setPagoToDelete(null);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Helper para sumar días a una fecha
  const calcularFechaOffset = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
  };

  // Formulario nuevo pago y membresía
  const [usuarioSearch, setUsuarioSearch] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<Registro | null>(null);
  const [formTipoMembresia, setFormTipoMembresia] = useState<'Semanal' | 'Mensual' | 'Personalizada'>('Mensual');
  const [formFechaVencimiento, setFormFechaVencimiento] = useState<string>(calcularFechaOffset(30));
  const [formPlan, setFormPlan] = useState<PlanPago>('Mensual');
  const [formServicio, setFormServicio] = useState<ServicioPago>('Servicio de Maquinas Musculacion');
  const [formMonto, setFormMonto] = useState<string>('1850.00');
  const [formMetodo, setFormMetodo] = useState<MetodoPago>('Punto de Venta');
  const [formReferencia, setFormReferencia] = useState('');
  const [formObs, setFormObs] = useState('');

  const recargar = () => {
    setPagos(StorageService.obtenerPagos());
    setPersonas(StorageService.obtenerRegistros('persona'));
  };

  useEffect(() => {
    window.addEventListener('mpv-pagos-updated', recargar);
    window.addEventListener('mpv-data-updated', recargar);
    return () => {
      window.removeEventListener('mpv-pagos-updated', recargar);
      window.removeEventListener('mpv-data-updated', recargar);
    };
  }, []);

  // Cálculo de estado para la fecha seleccionada en el formulario
  const estadoCalculadoFormulario: EstadoMembresia = obtenerEstadoMembresia(undefined, formFechaVencimiento);

  // Métricas financieras y de membresía
  const totalRecaudado = pagos.reduce((acc, p) => acc + Number(p.monto_bs || 0), 0);

  // Contadores exactos de los 3 estados solicitados: Activo, Próximo a Vencer, Vencido
  let activosCount = 0;
  let proximosCount = 0;
  let vencidosCount = 0;

  personas.forEach(p => {
    const est = obtenerEstadoMembresia(p.datos.estado_solvencia, p.datos.fecha_vencimiento);
    if (est === 'Activo') activosCount++;
    else if (est === 'Próximo a Vencer') proximosCount++;
    else if (est === 'Vencido') vencidosCount++;
  });

  const handleSeleccionarTipoMembresia = (tipo: 'Semanal' | 'Mensual' | 'Personalizada') => {
    setFormTipoMembresia(tipo);
    if (tipo === 'Semanal') {
      setFormPlan('Semanal');
      setFormFechaVencimiento(calcularFechaOffset(7));
    } else if (tipo === 'Mensual') {
      setFormPlan('Mensual');
      setFormFechaVencimiento(calcularFechaOffset(30));
    }
  };

  const handleGuardarPago = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersona && !usuarioSearch.trim()) {
      alert('Por favor ingrese o seleccione un usuario.');
      return;
    }

    const nombre = selectedPersona 
      ? `${selectedPersona.datos.nombre} ${selectedPersona.datos.apellido}`.trim()
      : usuarioSearch;
    const cedula = selectedPersona ? selectedPersona.datos.cedula : 'V-00000000';
    const id = selectedPersona ? (selectedPersona.datos.id_gbp || selectedPersona.id) : `U-${Date.now().toString().slice(-4)}`;

    const estadoFinal = estadoCalculadoFormulario;
    const tasaActual = BcvService.obtenerTasaSincrona().tasa;
    const montoBsNum = Number(formMonto);
    const montoUsdNum = BcvService.bolivaresADolares(montoBsNum, tasaActual);

    const nuevo = StorageService.registrarPago({
      usuario_id: id,
      usuario_nombre: nombre,
      usuario_cedula: cedula,
      fecha_pago: new Date().toISOString().split('T')[0],
      fecha_vencimiento: formFechaVencimiento,
      tipo_membresia: formTipoMembresia,
      plan: formPlan,
      servicio: formServicio,
      monto_bs: montoBsNum,
      monto_usd: montoUsdNum,
      tasa_bcv: tasaActual,
      metodo_pago: formMetodo,
      referencia: formReferencia || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      estado: estadoFinal,
      observaciones: formObs
    }, sesion.cedula);

    setIsModalOpen(false);
    setSelectedPersona(null);
    setUsuarioSearch('');
    setFormReferencia('');
    setFormObs('');
    setComprobanteModal(nuevo);
  };

  // Filtrado de pagos
  const pagosFiltrados = pagos.filter(p => {
    const estadoPago = obtenerEstadoMembresia(p.estado, p.fecha_vencimiento);
    if (filtroEstado !== 'TODOS' && estadoPago !== filtroEstado) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match = 
        p.usuario_nombre.toLowerCase().includes(term) ||
        p.usuario_cedula.toLowerCase().includes(term) ||
        p.referencia.toLowerCase().includes(term) ||
        p.servicio.toLowerCase().includes(term);
      if (!match) return false;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(59,130,246,0.2) 100%)',
            border: '1px solid rgba(16,185,129,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <CreditCard size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Control de Pagos y Membresías
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
              Gestión de ingresos, vencimientos por calendario y estados de membresía del Sistema Unificado de Usuarios GNP.

            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={handleSincronizarServidor}
            disabled={isSyncing}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 18px', 
              fontWeight: 600,
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              borderColor: 'rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              cursor: isSyncing ? 'not-allowed' : 'pointer'
            }}
          >
            <CloudUpload size={17} className={isSyncing ? 'spin' : ''} />
            <span>{isSyncing ? 'Sincronizando...' : 'Enviar Pagos al Servidor'}</span>
          </button>

          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={17} />
            <span>Registrar Nuevo Pago / Membresía</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Membresías con los 3 Colores Oficiales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Recaudación Total */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Recaudación Total</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>
              Bs. {totalRecaudado.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, marginTop: '2px' }}>
              ≈ ${BcvService.bolivaresADolares(totalRecaudado).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
          </div>
        </div>

        {/* Activo (Verde) */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #10b981' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Membresías Activas</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
              {activosCount}
            </div>
          </div>
        </div>

        {/* Próximo a Vencer (Naranja) */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Próximas a Vencer (≤ 3 días)</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>
              {proximosCount}
            </div>
          </div>
        </div>

        {/* Vencido (Rojo) */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <XCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Membresías Vencidas</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444' }}>
              {vencidosCount}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Pagos y Membresías */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="search-bar" style={{ width: '320px' }}>
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar por atleta, cédula, referencia..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Filtrar Estado:</span>
            <select
              className="form-select"
              style={{ width: '180px', padding: '6px 12px', fontSize: '12.5px' }}
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="Activo">🟢 Activo</option>
              <option value="Próximo a Vencer">🟠 Próximo a Vencer</option>
              <option value="Vencido">🔴 Vencido</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha Pago</th>
                <th>Usuario / Atleta</th>
                <th>Cédula</th>
                <th>Membresía</th>
                <th>Servicio</th>
                <th>Monto (Bs.)</th>
                <th>Método</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Comprobante</th>
              </tr>
            </thead>
            <tbody>
              {pagosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                    No se encontraron pagos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                pagosFiltrados.map(p => {
                  const estadoActual = obtenerEstadoMembresia(p.estado, p.fecha_vencimiento);
                  const badge = getBadgeStyle(estadoActual);
                  return (
                    <tr key={p.id}>
                      <td style={{ color: '#94a3b8', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{p.fecha_pago}</span>
                          <span
                            title={p.sincronizado ? 'Sincronizado con Supabase' : 'Pendiente de sincronizar con el servidor'}
                            style={{
                              display: 'inline-block',
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: p.sincronizado ? '#10b981' : '#f59e0b',
                              boxShadow: p.sincronizado ? '0 0 6px rgba(16,185,129,0.7)' : '0 0 6px rgba(245,158,11,0.7)'
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>{p.usuario_nombre}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
                          {p.usuario_cedula}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#cbd5e1' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          background: 'rgba(59, 130, 246, 0.1)', 
                          color: '#60a5fa', 
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          {p.tipo_membresia || p.plan || 'Mensual'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#94a3b8' }}>{p.servicio}</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>
                        <div>Bs. {Number(p.monto_bs || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
                          ≈ ${(p.monto_usd || BcvService.bolivaresADolares(Number(p.monto_bs || 0), p.tasa_bcv)).toFixed(2)} USD
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: '#cbd5e1' }}>{p.metodo_pago}</td>
                      <td style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 600 }}>
                        {p.fecha_vencimiento || 'No registrada'}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
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
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            className="btn-icon"
                            title="Ver / Imprimir Comprobante Oficial"
                            onClick={() => setComprobanteModal(p)}
                          >
                            <Receipt size={17} style={{ color: 'var(--accent-amber)' }} />
                          </button>
                          <button
                            className="btn-icon"
                            title="Eliminar Pago"
                            onClick={() => setPagoToDelete(p)}
                            style={{ color: '#f87171' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL REGISTRAR NUEVO PAGO Y MEMBRESÍA                    */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '620px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <Plus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#ffffff', fontSize: '18px', fontWeight: 700 }}>
                    Registrar Pago y Membresía
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    Selección semanal, mensual o con selector de fecha calendario.
                  </span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleGuardarPago} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Selección de Usuario */}
              <div className="form-group">
                <label className="form-label">Usuario Beneficiario / Atleta *</label>
                <div className="search-bar" style={{ width: '100%', marginBottom: '6px' }}>
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Buscar por cédula o nombre..."
                    value={usuarioSearch}
                    onChange={e => {
                      setUsuarioSearch(e.target.value);
                      setSelectedPersona(null);
                    }}
                    required
                  />
                </div>

                {usuarioSearch.trim() && !selectedPersona && (
                  <div style={{
                    maxHeight: '130px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    background: '#0d1527'
                  }}>
                    {personas
                      .filter(p => 
                        `${p.datos.nombre} ${p.datos.apellido}`.toLowerCase().includes(usuarioSearch.toLowerCase()) ||
                        p.datos.cedula.includes(usuarioSearch)
                      )
                      .slice(0, 5)
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPersona(p);
                            setUsuarioSearch(`${p.datos.nombre} ${p.datos.apellido} (${p.datos.cedula})`);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            fontSize: '12.5px'
                          }}
                          className="hover-subtle"
                        >
                          <span style={{ color: '#ffffff', fontWeight: 600 }}>{p.datos.nombre} {p.datos.apellido}</span>
                          <span style={{ color: '#94a3b8', marginLeft: '8px' }}>({p.datos.cedula})</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Selector de Modalidad de Membresía */}
              <div style={{
                padding: '14px',
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '12px'
              }}>
                <label className="form-label" style={{ color: '#93c5fd', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarIcon size={14} />
                  <span>Duración de la Membresía *</span>
                </label>
                
                {/* Botones de Selección Rápida */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleSeleccionarTipoMembresia('Semanal')}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: formTipoMembresia === 'Semanal' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                      background: formTipoMembresia === 'Semanal' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                      color: formTipoMembresia === 'Semanal' ? '#ffffff' : '#94a3b8',
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
                      border: formTipoMembresia === 'Mensual' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                      background: formTipoMembresia === 'Mensual' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                      color: formTipoMembresia === 'Mensual' ? '#ffffff' : '#94a3b8',
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
                      border: formTipoMembresia === 'Personalizada' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                      background: formTipoMembresia === 'Personalizada' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.03)',
                      color: formTipoMembresia === 'Personalizada' ? '#ffffff' : '#94a3b8',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🗓️ Elegir en Calendario
                  </button>
                </div>

                {/* Campo Calendario Fecha de Vencimiento */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '4px' }}>
                      Fecha de Vencimiento de Membresía:
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={formFechaVencimiento}
                      onChange={e => {
                        setFormFechaVencimiento(e.target.value);
                        setFormTipoMembresia('Personalizada');
                      }}
                      required
                    />
                  </div>

                  {/* Estado Visual que Tendrá */}
                  <div>
                    <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '4px' }}>
                      Estado Resultante:
                    </label>
                    {(() => {
                      const badge = getBadgeStyle(estadoCalculadoFormulario);
                      return (
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.text,
                          fontWeight: 700,
                          fontSize: '12.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: badge.dot }}></span>
                          <span>{estadoCalculadoFormulario}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Servicio y Plan */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Servicio Deportivo *</label>
                  <select
                    className="form-select"
                    value={formServicio}
                    onChange={e => setFormServicio(e.target.value as ServicioPago)}
                  >
                    <option value="Servicio de Maquinas Musculacion">Musculación / Máquinas</option>
                    <option value="Servicio de Spinning">Spinning / Ciclismo Indoor</option>
                    <option value="Servicio de Crossfit">Crossfit & Funcional</option>
                    <option value="Servicio de Maquinas para correr">Cintas para Correr</option>
                    <option value="Servicio de Danza">Danza & Baile</option>
                    <option value="Servicio de Cancha">Cancha Multiuso</option>
                    <option value="Servicio de Auditorio">Auditorio Cultural</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Categoría de Inscripción</label>
                  <select
                    className="form-select"
                    value={formPlan}
                    onChange={e => setFormPlan(e.target.value as PlanPago)}
                  >
                    <option value="Semanal">Semanal</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Inscripción">Inscripción Inicial</option>
                    <option value="Inscripción + Mensualidad">Inscripción + Mensualidad</option>
                    <option value="Abono por Adelanto">Abono por Adelanto</option>
                    <option value="Diario">Pase Diario</option>
                  </select>
                </div>
              </div>

              {/* Monto y Método */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Monto (Bs.) *</label>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                      ≈ ${BcvService.bolivaresADolares(Number(formMonto) || 0).toFixed(2)} USD
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formMonto}
                    onChange={e => setFormMonto(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                  <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '3px' }}>
                    Tasa Oficial BCV: Bs. {BcvService.obtenerTasaSincrona().tasa.toFixed(2)} / USD
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Método de Pago *</label>
                  <select
                    className="form-select"
                    value={formMetodo}
                    onChange={e => setFormMetodo(e.target.value as MetodoPago)}
                  >
                    <option value="Punto de Venta">Punto de Venta</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>
              </div>

              {/* Referencia y Observaciones */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">N° de Referencia / Comprobante</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. 948291"
                    value={formReferencia}
                    onChange={e => setFormReferencia(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Observaciones</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Notas adicionales..."
                    value={formObs}
                    onChange={e => setFormObs(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  <CheckCircle2 size={16} />
                  <span>Emitir Pago y Activar Membresía</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL COMPROBANTE OFICIAL DE PAGO                        */}
      {/* ========================================================= */}
      {comprobanteModal && (
        <div className="modal-overlay" onClick={() => setComprobanteModal(null)}>
          <div className="modal-content" style={{ maxWidth: '460px', background: '#0a0f1d' }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '24px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '16px',
              background: 'radial-gradient(circle at top, rgba(30, 58, 138, 0.25) 0%, rgba(10, 15, 29, 0.98) 100%)',
              textAlign: 'center'
            }}>
              {/* Logo Oficial - Sistema Unificado de Usuarios GNP */}
              <div style={{ marginBottom: '14px', textAlign: 'center' }}>
                <img
                  src={LOGO_OFICIAL}
                  alt="Logo Oficial"
                  style={{ height: '62px', margin: '0 auto 8px auto', display: 'block', objectFit: 'contain' }}
                />
                <h4 style={{ color: '#60a5fa', margin: 0, fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em' }}>
                  REPÚBLICA BOLIVARIANA DE VENEZUELA
                </h4>
                <div style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 700 }}>
                  SISTEMA UNIFICADO DE USUARIOS GNP
                </div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                  Gran Base de Paz • Gimnasio Vertical
                </div>
              </div>

              <div style={{
                margin: '16px 0',
                padding: '12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px',
                border: '1px dashed rgba(255,255,255,0.15)'
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Comprobante Oficial de Membresía
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
                  Bs. {Number(comprobanteModal.monto_bs || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                  ≈ ${(comprobanteModal.monto_usd || BcvService.bolivaresADolares(Number(comprobanteModal.monto_bs || 0), comprobanteModal.tasa_bcv)).toFixed(2)} USD
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Tasa BCV Aplicada: Bs. {(comprobanteModal.tasa_bcv || BcvService.obtenerTasaSincrona().tasa).toFixed(2)} / USD
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginTop: '4px' }}>
                  Ref: {comprobanteModal.referencia}
                </div>
              </div>

              <div style={{ textAlign: 'left', fontSize: '12.5px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Beneficiario:</span>
                  <strong style={{ color: '#ffffff' }}>{comprobanteModal.usuario_nombre}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Cédula:</span>
                  <span>{comprobanteModal.usuario_cedula}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Membresía / Plan:</span>
                  <span style={{ color: '#60a5fa', fontWeight: 600 }}>{comprobanteModal.tipo_membresia || comprobanteModal.plan}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Servicio:</span>
                  <span>{comprobanteModal.servicio}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Método de Pago:</span>
                  <span>{comprobanteModal.metodo_pago}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Fecha de Emisión:</span>
                  <span>{comprobanteModal.fecha_pago}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Fecha de Vencimiento:</span>
                  <span style={{ color: '#f8fafc', fontWeight: 700 }}>
                    {comprobanteModal.fecha_vencimiento || 'No registrada'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>Estado de Membresía:</span>
                  {(() => {
                    const est = obtenerEstadoMembresia(comprobanteModal.estado, comprobanteModal.fecha_vencimiento);
                    const b = getBadgeStyle(est);
                    return (
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: b.bg,
                        color: b.text,
                        border: `1px solid ${b.border}`
                      }}>
                        {est}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => {
                    window.print();
                  }}
                >
                  <Printer size={15} />
                  <span>Imprimir Recibo</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setComprobanteModal(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL CONFIRMACIÓN ELIMINAR PAGO                          */}
      {/* ========================================================= */}
      {pagoToDelete && (
        <div className="modal-overlay" onClick={() => setPagoToDelete(null)}>
          <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Trash2 size={26} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              ¿Eliminar este Pago?
            </h3>
            <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '16px', lineHeight: 1.5 }}>
              Estás a punto de eliminar el pago de <strong>Bs. {Number(pagoToDelete.monto_bs || 0).toFixed(2)}</strong> registrado a nombre de <strong>{pagoToDelete.usuario_nombre}</strong> ({pagoToDelete.usuario_cedula}).
            </p>

            <div style={{
              background: 'rgba(10, 15, 29, 0.7)',
              border: '1px solid #1e2d4a',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '12px',
              color: '#94a3b8',
              textAlign: 'left',
              marginBottom: '20px'
            }}>
              <div><strong>Plan:</strong> {pagoToDelete.plan}</div>
              <div><strong>Referencia:</strong> {pagoToDelete.referencia}</div>
              <div><strong>Fecha:</strong> {pagoToDelete.fecha_pago}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setPagoToDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1, backgroundColor: '#dc2626', color: '#ffffff' }}
                onClick={handleConfirmarEliminarPago}
              >
                Sí, Eliminar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '12px',
          background: toastMsg.tipo === 'ok' ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '13.5px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toastMsg.tipo === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMsg.texto}</span>
        </div>
      )}
    </div>
  );
};
