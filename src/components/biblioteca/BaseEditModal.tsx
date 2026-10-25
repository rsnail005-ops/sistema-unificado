import React, { useState } from 'react';
import { X, Save, Building2 } from 'lucide-react';
import { BaseMision } from '../../types';
import { SupabaseService } from '../../services/supabase';

interface BaseEditModalProps {
  base: BaseMision;
  onClose: () => void;
  onSaved: (updated: BaseMision) => void;
}

export const BaseEditModal: React.FC<BaseEditModalProps> = ({ base, onClose, onSaved }) => {
  const [form, setForm] = useState({
    nombre: base.nombre || '',
    estado: base.estado || '',
    municipio: base.municipio || '',
    direccion: base.direccion || '',
    administrador: base.administrador || '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setGuardando(true);
    setError('');
    const res = await SupabaseService.actualizarBase(base.id, form);
    setGuardando(false);
    if (!res.ok) { setError(res.error || 'Error al guardar'); return; }
    onSaved({ ...base, ...form });
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  const fields = [
    { label: 'Nombre de la Base', name: 'nombre', placeholder: 'Gran Base...' },
    { label: 'Estado', name: 'estado', placeholder: 'ej. Caracas, Miranda...' },
    { label: 'Municipio', name: 'municipio', placeholder: 'Municipio...' },
    { label: 'Direccion', name: 'direccion', placeholder: 'Av. Principal...' },
    { label: 'Nombre del Administrador', name: 'administrador', placeholder: 'Nombre del responsable...' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e1b2e 0%, #16213e 100%)',
        border: '1px solid rgba(124,58,237,0.3)',
        borderRadius: 20, padding: 32, width: 520, maxWidth: '95vw',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Editar Base</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{base.id}</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {fields.map(({ label, name, placeholder }) => (
            <div key={name} style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
              </label>
              <input name={name} value={(form as any)[name]} onChange={handleChange} placeholder={placeholder} style={inp} />
            </div>
          ))}
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
              Cancelar
            </button>
            <button type="submit" disabled={guardando} style={{ padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Save size={16} />
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
