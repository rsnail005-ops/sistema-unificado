import React, { useState, useEffect } from "react";
import {
  Building2, Plus, Edit2, Trash2, Loader2, Save, X, BookOpen, Clock, DollarSign, User, Layers
} from "lucide-react";
import { BaseMision, BaseDisciplina, HorarioDisciplina, PISOS_BASE, UsuarioSesion } from "../types";
import { SupabaseService } from "../services/supabase";

interface MiBaseViewProps {
  sesion: UsuarioSesion;
}

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

interface DisciplinaForm {
  nombre: string;
  piso: string;
  tutor: string;
  precio_bs: string;
  precio_usd: string;
  horarios: HorarioDisciplina[];
}

const formVacio = (): DisciplinaForm => ({
  nombre: "", piso: "Piso 1", tutor: "", precio_bs: "", precio_usd: "",
  horarios: [{ dia: "Lunes", hora_inicio: "08:00", hora_fin: "09:00" }],
});

export const MiBaseView: React.FC<MiBaseViewProps> = ({ sesion }) => {
  const [base, setBase] = useState<BaseMision | null>(null);
  const [disciplinas, setDisciplinas] = useState<BaseDisciplina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{ modo: "crear" | "editar"; disc?: BaseDisciplina } | null>(null);
  const [form, setForm] = useState<DisciplinaForm>(formVacio());
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState("");
  const [eliminando, setEliminando] = useState<string | null>(null);

  // Busca la base por nombre de la sesion (base_misiones_nombre)
  const nombreBase = sesion.base_misiones_nombre || "";

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError("");
      // Primero carga todas las bases y busca la que coincide
      const rBases = await SupabaseService.listarBases();
      if (!rBases.ok) { setError("Error al cargar bases"); setCargando(false); return; }
      const basesArr: BaseMision[] = rBases.data || [];
      const trimmed = nombreBase.trim().toLowerCase();
      const adminName = `${sesion.nombres} ${sesion.apellidos}`.trim().toLowerCase();
      const miBase = basesArr.find(b =>
        (trimmed && b.nombre.toLowerCase() === trimmed) ||
        (adminName && b.administrador?.toLowerCase() === adminName)
      ) || (trimmed ? basesArr.find(b => b.nombre.toLowerCase().includes(trimmed)) : null) || null;

      setBase(miBase);
      if (miBase) {
        const rDisc = await SupabaseService.listarDisciplinas(miBase.id);
        if (rDisc.ok) setDisciplinas(rDisc.data || []);
      }
      setCargando(false);
    };
    cargar();
  }, [nombreBase]);

  const abrirCrear = () => {
    setForm(formVacio());
    setFormError("");
    setModal({ modo: "crear" });
  };

  const abrirEditar = (d: BaseDisciplina) => {
    setForm({
      nombre: d.nombre, piso: d.piso, tutor: d.tutor || "",
      precio_bs: d.precio_bs != null ? String(d.precio_bs) : "",
      precio_usd: d.precio_usd != null ? String(d.precio_usd) : "",
      horarios: d.horarios && d.horarios.length > 0 ? [...d.horarios] : [{ dia: "Lunes", hora_inicio: "08:00", hora_fin: "09:00" }],
    });
    setFormError("");
    setModal({ modo: "editar", disc: d });
  };

  const cerrarModal = () => { setModal(null); setForm(formVacio()); setFormError(""); };

  const handleGuardar = async () => {
    if (!base) return;
    if (!form.nombre.trim()) { setFormError("El nombre es requerido"); return; }
    setGuardando(true);
    setFormError("");
    const payload = {
      base_id: base.id,
      nombre: form.nombre.trim(),
      piso: form.piso,
      tutor: form.tutor.trim() || null,
      precio_bs: form.precio_bs ? parseFloat(form.precio_bs) : null,
      precio_usd: form.precio_usd ? parseFloat(form.precio_usd) : null,
      horarios: form.horarios,
      activa: true,
    };
    if (modal?.modo === "crear") {
      const res = await SupabaseService.crearDisciplina(payload);
      if (!res.ok) { setFormError(res.error || "Error al crear"); setGuardando(false); return; }
      setDisciplinas(prev => [...prev, res.data]);
    } else if (modal?.disc) {
      const res = await SupabaseService.actualizarDisciplina(modal.disc.id, payload);
      if (!res.ok) { setFormError(res.error || "Error al actualizar"); setGuardando(false); return; }
      setDisciplinas(prev => prev.map(d => d.id === modal.disc!.id ? { ...d, ...payload } as BaseDisciplina : d));
    }
    setGuardando(false);
    cerrarModal();
  };

  const handleEliminar = async (d: BaseDisciplina) => {
    if (!confirm(`Eliminar "${d.nombre}"?`)) return;
    setEliminando(d.id);
    const res = await SupabaseService.eliminarDisciplina(d.id);
    setEliminando(null);
    if (!res.ok) { alert("Error: " + res.error); return; }
    setDisciplinas(prev => prev.filter(x => x.id !== d.id));
  };

  const addHorario = () => setForm(f => ({ ...f, horarios: [...f.horarios, { dia: "Lunes", hora_inicio: "08:00", hora_fin: "09:00" }] }));
  const removeHorario = (i: number) => setForm(f => ({ ...f, horarios: f.horarios.filter((_, idx) => idx !== i) }));
  const updateHorario = (i: number, key: keyof HorarioDisciplina, val: string) =>
    setForm(f => ({ ...f, horarios: f.horarios.map((h, idx) => idx === i ? { ...h, [key]: val } : h) }));

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8, boxSizing: "border-box",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#e2e8f0", fontSize: 13, outline: "none",
  };

  if (cargando) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, color: "#64748b" }}>
      <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
      <span>Cargando tu base...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, color: "#ef4444" }}>{error}</div>
  );

  if (!base) return (
    <div style={{ padding: 32, color: "#94a3b8", textAlign: "center" }}>
      <Building2 size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
      <p>No se encontro una base asignada a tu cuenta.<br />Contacta al administrador nacional.</p>
    </div>
  );

  const pisoGroups: Record<string, BaseDisciplina[]> = {};
  PISOS_BASE.forEach(p => { pisoGroups[p] = []; });
  disciplinas.forEach(d => {
    if (!pisoGroups[d.piso]) pisoGroups[d.piso] = [];
    pisoGroups[d.piso].push(d);
  });

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header de la base */}
      <div style={{
        padding: "20px 24px", borderRadius: 16, marginBottom: 28,
        background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.1))",
        border: "1px solid rgba(124,58,237,0.3)",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(124,58,237,0.4)",
        }}>
          <Building2 size={24} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#e2e8f0" }}>{base.nombre}</h2>
          <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: 13 }}>
            {base.estado}{base.municipio ? ` • ${base.municipio}` : ""}
            {base.direccion ? ` • ${base.direccion}` : ""}
          </p>
        </div>
        <button onClick={abrirCrear} style={{
          marginLeft: "auto", padding: "10px 18px", borderRadius: 10, cursor: "pointer",
          background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none",
          color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7,
          boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
        }}>
          <Plus size={16} /> Nueva Disciplina
        </button>
      </div>

      {/* Disciplinas por piso */}
      <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px 0" }}>
        Disciplinas de tu Base ({disciplinas.length})
      </h3>

      {disciplinas.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#475569", fontStyle: "italic", borderRadius: 14, border: "1px dashed rgba(255,255,255,0.1)" }}>
          Aun no hay disciplinas registradas. Haz clic en "Nueva Disciplina" para agregar la primera.
        </div>
      ) : (
        PISOS_BASE.map(piso => {
          const items = pisoGroups[piso] || [];
          if (items.length === 0) return null;
          return (
            <div key={piso} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Layers size={14} color="#7c3aed" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>{piso}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                {items.map(d => (
                  <div key={d.id} style={{
                    padding: "16px 18px", borderRadius: 12,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                    position: "relative",
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0", marginBottom: 8 }}>{d.nombre}</div>
                    {d.tutor && <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}><User size={10} style={{ verticalAlign: "middle", marginRight: 4 }} />{d.tutor}</div>}
                    {d.precio_bs && <div style={{ fontSize: 12, color: "#10b981", marginBottom: 4 }}><DollarSign size={10} style={{ verticalAlign: "middle", marginRight: 4 }} />Bs {d.precio_bs}{d.precio_usd ? ` / $${d.precio_usd}` : ""}</div>}
                    {d.horarios && d.horarios.map((h, i) => (
                      <div key={i} style={{ fontSize: 11, color: "#64748b" }}><Clock size={9} style={{ verticalAlign: "middle", marginRight: 4 }} />{h.dia} {h.hora_inicio}–{h.hora_fin}</div>
                    ))}
                    <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                      <button onClick={() => abrirEditar(d)} style={{ padding: "5px 10px", borderRadius: 7, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                        <Edit2 size={11} /> Editar
                      </button>
                      <button onClick={() => handleEliminar(d)} disabled={eliminando === d.id} style={{ padding: "5px 10px", borderRadius: 7, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                        <Trash2 size={11} /> {eliminando === d.id ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) cerrarModal(); }}>
          <div style={{ background: "linear-gradient(135deg, #1e1b2e, #16213e)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 20, padding: 28, width: 560, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 16, fontWeight: 700 }}>
                {modal.modo === "crear" ? "Nueva Disciplina" : "Editar Disciplina"}
              </h3>
              <button onClick={cerrarModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="ej. Crossfit, Yoga, Spinning..." style={inp} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Piso</label>
                <select value={form.piso} onChange={e => setForm(f => ({ ...f, piso: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                  {PISOS_BASE.map(p => <option key={p} value={p} style={{ background: "#1e1b2e" }}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tutor / Instructor</label>
                <input value={form.tutor} onChange={e => setForm(f => ({ ...f, tutor: e.target.value }))} placeholder="Nombre del tutor..." style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Precio (Bs)</label>
                <input type="number" value={form.precio_bs} onChange={e => setForm(f => ({ ...f, precio_bs: e.target.value }))} placeholder="0.00" style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Precio (USD)</label>
                <input type="number" value={form.precio_usd} onChange={e => setForm(f => ({ ...f, precio_usd: e.target.value }))} placeholder="0.00" style={inp} />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Horarios</label>
                <button onClick={addHorario} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  <Plus size={11} /> Agregar
                </button>
              </div>
              {form.horarios.map((h, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <select value={h.dia} onChange={e => updateHorario(i, "dia", e.target.value)} style={{ ...inp, padding: "7px 10px" }}>
                    {DIAS.map(d => <option key={d} value={d} style={{ background: "#1e1b2e" }}>{d}</option>)}
                  </select>
                  <input type="time" value={h.hora_inicio} onChange={e => updateHorario(i, "hora_inicio", e.target.value)} style={{ ...inp, padding: "7px 10px" }} />
                  <input type="time" value={h.hora_fin} onChange={e => updateHorario(i, "hora_fin", e.target.value)} style={{ ...inp, padding: "7px 10px" }} />
                  <button onClick={() => removeHorario(i)} disabled={form.horarios.length === 1} style={{ padding: "7px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", cursor: "pointer" }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {formError && <div style={{ padding: "8px 12px", borderRadius: 7, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 12, marginBottom: 14 }}>{formError}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={cerrarModal} style={{ padding: "9px 18px", borderRadius: 9, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando} style={{ padding: "9px 20px", borderRadius: 9, background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Save size={14} /> {guardando ? "Guardando..." : modal.modo === "crear" ? "Crear" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
