import React, { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  RefreshCw, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Edit3, 
  RotateCcw,
  TrendingUp
} from 'lucide-react';
import { BcvService, TasaBCVInfo } from '../services/bcvService';

interface BcvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BcvModal: React.FC<BcvModalProps> = ({ isOpen, onClose }) => {
  const [tasaInfo, setTasaInfo] = useState<TasaBCVInfo>(BcvService.obtenerTasaSincrona());
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);

  // Estados del conversor
  const [montoBs, setMontoBs] = useState<string>('1000');
  const [montoUsd, setMontoUsd] = useState<string>('');

  // Edición manual
  const [mostrarManual, setMostrarManual] = useState(false);
  const [tasaManualInput, setTasaManualInput] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      refrescarTasa();
      const bs = parseFloat(montoBs) || 0;
      const usdCalculado = BcvService.bolivaresADolares(bs, tasaInfo.tasa);
      setMontoUsd(usdCalculado > 0 ? usdCalculado.toFixed(2) : '');
    }
  }, [isOpen]);

  const refrescarTasa = async () => {
    setCargando(true);
    setMensaje(null);
    try {
      const nueva = await BcvService.actualizarTasaEnLinea();
      setTasaInfo(nueva);
      const bs = parseFloat(montoBs) || 0;
      const usdCalculado = BcvService.bolivaresADolares(bs, nueva.tasa);
      setMontoUsd(usdCalculado > 0 ? usdCalculado.toFixed(2) : '');
      if (nueva.error) {
        setMensaje({ tipo: 'info', texto: nueva.error });
      }
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + e.message });
    } finally {
      setCargando(false);
    }
  };

  const handleCambioBs = (valor: string) => {
    setMontoBs(valor);
    const num = parseFloat(valor);
    if (!isNaN(num) && num >= 0) {
      const usd = BcvService.bolivaresADolares(num, tasaInfo.tasa);
      setMontoUsd(usd > 0 ? usd.toFixed(2) : '0.00');
    } else {
      setMontoUsd('');
    }
  };

  const handleCambioUsd = (valor: string) => {
    setMontoUsd(valor);
    const num = parseFloat(valor);
    if (!isNaN(num) && num >= 0) {
      const bs = BcvService.dolaresABolivares(num, tasaInfo.tasa);
      setMontoBs(bs > 0 ? bs.toFixed(2) : '0.00');
    } else {
      setMontoBs('');
    }
  };

  const handleGuardarManual = () => {
    const num = parseFloat(tasaManualInput);
    if (isNaN(num) || num <= 0) {
      alert('Ingrese un número mayor a 0');
      return;
    }
    const nueva = BcvService.fijarTasaManual(num);
    setTasaInfo(nueva);
    setMostrarManual(false);
    setTasaManualInput('');
    setMensaje({ tipo: 'info', texto: `Tasa manual: Bs. ${num.toFixed(2)}` });

    const bs = parseFloat(montoBs) || 0;
    const usd = BcvService.bolivaresADolares(bs, nueva.tasa);
    setMontoUsd(usd > 0 ? usd.toFixed(2) : '');
  };

  const handleRestaurarAutomatica = async () => {
    setCargando(true);
    try {
      const nueva = await BcvService.restaurarAutomatica();
      setTasaInfo(nueva);
      setMostrarManual(false);
      setMensaje({ tipo: 'ok', texto: 'Tasa restaurada al BCV oficial.' });
      const bs = parseFloat(montoBs) || 0;
      setMontoUsd(BcvService.bolivaresADolares(bs, nueva.tasa).toFixed(2));
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: e.message });
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  const montosRapidos = [1, 5, 10, 20, 50];

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{ 
        zIndex: 10000, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        className="modal-container" 
        onClick={e => e.stopPropagation()}
        style={{ 
          maxWidth: '430px', 
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'linear-gradient(145deg, #0f172a 0%, #0a0f1d 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          padding: '16px 18px',
          color: '#ffffff'
        }}
      >
        {/* Encabezado Compacto */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '12px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
          paddingBottom: '10px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399'
            }}>
              <DollarSign size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                Tasa Oficial BCV del Día
              </h3>
              <p style={{ margin: 0, fontSize: '10.5px', color: '#94a3b8' }}>
                Banco Central de Venezuela • Conversor Bs ⇄ USD
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: 'none', 
              color: '#94a3b8', 
              borderRadius: '6px', 
              width: '26px', 
              height: '26px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tarjeta de Tasa Actual Compacta */}
        <div style={{
          background: 'radial-gradient(circle at top left, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#34d399', fontWeight: 700 }}>
                {tasaInfo.fuente}
              </span>
              {tasaInfo.esManual && (
                <span style={{ fontSize: '9px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                  Manual
                </span>
              )}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span>Bs. {tasaInfo.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>/ USD</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px', fontSize: '10px', color: '#94a3b8' }}>
              <span>{tasaInfo.fechaLegible}</span>
              <span>•</span>
              <span>{tasaInfo.ultimaConsulta}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <button
              onClick={refrescarTasa}
              disabled={cargando}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#ffffff'
              }}
              title="Actualizar tasa del BCV"
            >
              <RefreshCw size={12} className={cargando ? 'animate-spin' : ''} />
              <span>{cargando ? 'Cargando' : 'Actualizar'}</span>
            </button>

            <button
              onClick={() => {
                setMostrarManual(!mostrarManual);
                setTasaManualInput(tasaInfo.tasa.toString());
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <Edit3 size={10} />
              <span>{mostrarManual ? 'Cerrar' : 'Editar'}</span>
            </button>
          </div>
        </div>

        {/* Panel Desplegable de Ajuste Manual */}
        {mostrarManual && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '10px',
            padding: '10px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', marginBottom: '6px' }}>
              Fijar Tasa Manual / Sin Internet
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                step="0.01"
                value={tasaManualInput}
                onChange={e => setTasaManualInput(e.target.value)}
                placeholder="Ej. 879.12"
                style={{
                  flex: 1,
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  color: '#ffffff',
                  fontSize: '12px'
                }}
              />
              <button
                onClick={handleGuardarManual}
                className="btn btn-amber"
                style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 600 }}
              >
                Guardar
              </button>
              {tasaInfo.esManual && (
                <button
                  onClick={handleRestaurarAutomatica}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '5px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  title="Volver a tasa BCV"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mensaje de Estado */}
        {mensaje && (
          <div style={{
            padding: '6px 10px',
            borderRadius: '6px',
            marginBottom: '10px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: mensaje.tipo === 'ok' ? 'rgba(16, 185, 129, 0.12)' : mensaje.tipo === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
            color: mensaje.tipo === 'ok' ? '#34d399' : mensaje.tipo === 'error' ? '#f87171' : '#60a5fa'
          }}>
            {mensaje.tipo === 'ok' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* CONVERSOR EN VIVO Compacto */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
            {/* Campo Bolívares */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '3px', fontWeight: 600 }}>
                Bolívares (Bs.)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b', fontWeight: 700, fontSize: '11px' }}>
                  Bs.
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoBs}
                  onChange={e => handleCambioBs(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '8px',
                    padding: '6px 8px 6px 28px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Separador */}
            <div style={{ color: '#38bdf8', marginTop: '14px' }}>
              <ArrowRightLeft size={15} />
            </div>

            {/* Campo Dólares */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '3px', fontWeight: 600 }}>
                Dólares ($ USD)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontWeight: 700, fontSize: '12px' }}>
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoUsd}
                  onChange={e => handleCambioUsd(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '8px',
                    padding: '6px 8px 6px 22px',
                    color: '#34d399',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Resultado destacado compacto */}
          <div style={{
            marginTop: '8px',
            padding: '6px 10px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px dashed rgba(16, 185, 129, 0.25)',
            borderRadius: '6px',
            textAlign: 'center',
            fontSize: '11.5px'
          }}>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>
              {BcvService.formatearBs(parseFloat(montoBs) || 0)}
            </span>
            <span style={{ color: '#94a3b8', margin: '0 6px' }}>=</span>
            <span style={{ color: '#34d399', fontWeight: 800, fontSize: '13px' }}>
              {BcvService.formatearUsd(parseFloat(montoUsd) || 0)}
            </span>
          </div>
        </div>

        {/* Tabla de Equivalencias Rápidas en una sola fila */}
        <div>
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
            Montos Comunes:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
            {montosRapidos.map((dolares) => {
              const enBs = BcvService.dolaresABolivares(dolares, tasaInfo.tasa);
              return (
                <button
                  key={dolares}
                  onClick={() => handleCambioUsd(dolares.toString())}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '5px 2px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title={`Calcular $${dolares} USD`}
                >
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8' }}>
                    ${dolares}
                  </div>
                  <div style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 600 }}>
                    Bs. {enBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Botón de Cierre Compacto */}
        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px 16px', fontSize: '12px', fontWeight: 600 }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
