import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Building2, MapPin, User, Edit2,
  BarChart3, Layers, Users, BookOpen, FileText, Loader2,
  TrendingUp, CreditCard, UserCheck, Activity
} from "lucide-react";
import { BaseMision, BaseDisciplina, BaseReporte, BaseStats, UsuarioSesion, isDesarrollador } from "../../types";
import { SupabaseService } from "../../services/supabase";
import { BaseEditModal } from "./BaseEditModal";
import { BasePisosMap } from "./BasePisosMap";
import { BasePersonasTable } from "./BasePersonasTable";
import { BaseReportesPanel } from "./BaseReportesPanel";

type DetTab = "resumen" | "pisos" | "personas" | "disciplinas" | "reportes";

interface BaseDetalleProps {
  base: BaseMision;
  sesion: UsuarioSesion;
  onBack: () => void;
  onBaseUpdated: (b: BaseMision) => void;
}

const KPI: React.FC<{ label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode }> = ({ label, value, sub, color, icon }) => (
  <div style={{
    padding: "20px", borderRadius: 16, flex: "1 1 160px",
    background: `linear-gradient(135deg, ${color}18, ${color}08)`,
    border: `1px solid ${color}30`, display: "flex", flexDirection: "column", gap: 6,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ color, opacity: 0.9 }}>{icon}</div>
      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, color: "#e2e8f0", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#64748b" }}>{sub}</div>}
  </div>
);

export const BaseDetalle: React.FC<BaseDetalleProps> = ({ base: baseProp, sesion, onBack, onBaseUpdated }) => {
  const [base, setBase] = useState(baseProp);
  const [tab, setTab] = useState<DetTab>("resumen");
  const [stats, setStats] = useState<BaseStats | null>(null);
  const [disciplinas, setDisciplinas] = useState<BaseDisciplina[]>([]);
  const [personas, setPersonas] = useState<any[]>([]);
  const [reportes, setReportes] = useState<BaseReporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    setBase(baseProp);
  }, [baseProp]);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setCargando(true);
      const [rStats, rDisc, rPers, rRep] = await Promise.all([
        SupabaseService.obtenerStatsBase(base.id),
        SupabaseService.listarDisciplinas(base.id),
        SupabaseService.listarPersonasBase(base.id),
        SupabaseService.listarReportes(base.id),
      ]);
      if (cancelado) return;
      if (rStats.ok) setStats(rStats.data);
      if (rDisc.ok) setDisciplinas(rDisc.data || []);
      if (rPers.ok) setPersonas(rPers.data || []);
      if (rRep.ok) setReportes(rRep.data || []);
      setCargando(false);
    };
    cargar();
    return () => { cancelado = true; };
  }, [base.id]);

  const tabs: { id: DetTab; label: string; icon: React.ReactNode }[] = [
    { id: "resumen", label: "Resumen", icon: <BarChart3 size={15} /> },
    { id: "pisos", label: "Pisos", icon: <Layers size={15} /> },
    { id: "personas", label: "Personas", icon: <Users size={15} /> },
    { id: "disciplinas", label: "Disciplinas", icon: <BookOpen size={15} /> },
    { id: "reportes", label: "Reportes", icon: <FileText size={15} /> },
  ];

  const tabBtn = (t: DetTab): React.CSSProperties => ({
    padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
    border: "none", display: "flex", alignItems: "center", gap: 6,
    background: tab === t ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(255,255,255,0.05)",
    color: tab === t ? "#fff" : "#94a3b8", transition: "all 0.2s",
    boxShadow: tab === t ? "0 4px 14px rgba(124,58,237,0.3)" : "none",
  });

  return (
    <div style={{ padding: "28px 32px", height: "100%", overflow: "auto" }}>
      {/* Header de la base */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={onBack} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "none", border: "none", color: "#7c3aed", cursor: "pointer",
          fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0,
        }}>
          <ArrowLeft size={16} /> Volver a la Biblioteca
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(124,58,237,0.4)",
          }}>
            <Building2 size={26} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>{base.nombre}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#94a3b8" }}>
                <MapPin size={13} /> {base.estado}{base.municipio ? `, ${base.municipio}` : ""}
              </span>
              {base.administrador && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#94a3b8" }}>
                  <User size={13} /> {base.administrador}
                </span>
              )}
              {base.direccion && (
                <span style={{ fontSize: 13, color: "#94a3b8" }}>{base.direccion}</span>
              )}
            </div>
          </div>
          {isDesarrollador(sesion) && (
            <button onClick={() => setEditando(true)} style={{
              padding: "8px 16px", borderRadius: 10, cursor: "pointer",
              background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)",
              color: "#a78bfa", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Edit2 size={14} /> Editar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} style={tabBtn(t.id)} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64, gap: 12, color: "#64748b" }}>
          <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
          <span>Cargando datos de la base...</span>
        </div>
      ) : (
        <>
          {/* Tab: Resumen */}
          {tab === "resumen" && (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
                <KPI label="Personas" value={stats?.total_personas ?? 0} sub="registradas" color="#7c3aed" icon={<Users size={18} />} />
                <KPI label="Activas" value={stats?.personas_activas ?? 0} sub="solventes" color="#10b981" icon={<UserCheck size={18} />} />
                <KPI label="Asistencias" value={stats?.total_asistencias ?? 0} sub="total" color="#38bdf8" icon={<Activity size={18} />} />
                <KPI label="Ingresos Bs" value={stats ? `Bs ${stats.ingresos_bs.toFixed(0)}` : "—"} color="#f59e0b" icon={<CreditCard size={18} />} />
                <KPI label="Ingresos USD" value={stats ? `$${stats.ingresos_usd.toFixed(2)}` : "—"} color="#34d399" icon={<TrendingUp size={18} />} />
                <KPI label="Disciplinas" value={disciplinas.length} sub="configuradas" color="#ec4899" icon={<BookOpen size={18} />} />
              </div>
              <div style={{ padding: 20, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <h3 style={{ margin: "0 0 14px 0", fontSize: 14, color: "#94a3b8" }}>Vista rapida de pisos</h3>
                <BasePisosMap disciplinas={disciplinas} />
              </div>
            </div>
          )}

          {/* Tab: Pisos */}
          {tab === "pisos" && (
            <div>
              <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
                Distribucion de disciplinas por piso — <strong style={{ color: "#e2e8f0" }}>{base.nombre}</strong>
              </p>
              <BasePisosMap disciplinas={disciplinas} />
            </div>
          )}

          {/* Tab: Personas */}
          {tab === "personas" && <BasePersonasTable personas={personas} />}

          {/* Tab: Disciplinas */}
          {tab === "disciplinas" && (
            <div>
              {disciplinas.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "#475569", fontStyle: "italic" }}>
                  No hay disciplinas configuradas en esta base
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                  {disciplinas.map(d => (
                    <div key={d.id} style={{
                      padding: "16px 20px", borderRadius: 14,
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 8 }}>{d.nombre}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>📍 {d.piso}</span>
                        {d.tutor && <span style={{ fontSize: 12, color: "#94a3b8" }}>👤 {d.tutor}</span>}
                        {d.precio_bs && <span style={{ fontSize: 12, color: "#10b981" }}>💰 Bs {d.precio_bs.toFixed(0)}{d.precio_usd ? ` / $${d.precio_usd.toFixed(2)}` : ""}</span>}
                        {d.horarios && d.horarios.length > 0 && (
                          <div style={{ marginTop: 6 }}>
                            {d.horarios.map((h, i) => (
                              <span key={i} style={{ display: "block", fontSize: 11, color: "#64748b" }}>
                                🕐 {h.dia} {h.hora_inicio}–{h.hora_fin}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Reportes */}
          {tab === "reportes" && (
            <BaseReportesPanel
              baseId={base.id}
              cedula={sesion.cedula}
              reportes={reportes}
              onReporteGenerado={r => setReportes(prev => [r, ...prev])}
            />
          )}
        </>
      )}

      {editando && (
        <BaseEditModal
          base={base}
          onClose={() => setEditando(false)}
          onSaved={updated => {
            setBase(updated);
            onBaseUpdated(updated);
            setEditando(false);
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
