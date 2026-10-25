import React, { useState } from "react";
import { Search, Building2, MapPin, User, ChevronRight, Activity } from "lucide-react";
import { BaseMision } from "../../types";

interface BibliotecaBasesGridProps {
  bases: BaseMision[];
  onSeleccionar: (base: BaseMision) => void;
}

const ESTADO_COLORS: Record<string, string> = {
  "Distrito Capital": "#7c3aed",
  Miranda: "#3b82f6",
  Zulia: "#f59e0b",
  Carabobo: "#10b981",
  Aragua: "#06b6d4",
  Lara: "#ec4899",
  "Bolivar": "#f97316",
  "Merida": "#8b5cf6",
  Anzoategui: "#14b8a6",
  Sucre: "#eab308",
};

function colorForBase(estado: string): string {
  return ESTADO_COLORS[estado] || "#7c3aed";
}

export const BibliotecaBasesGrid: React.FC<BibliotecaBasesGridProps> = ({ bases, onSeleccionar }) => {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const estados = ["Todos", ...Array.from(new Set(bases.map(b => b.estado))).sort()];

  const filtradas = bases.filter(b => {
    const q = busqueda.toLowerCase();
    const coincideBusqueda = b.nombre.toLowerCase().includes(q) || b.estado.toLowerCase().includes(q) || (b.municipio || "").toLowerCase().includes(q) || (b.administrador || "").toLowerCase().includes(q);
    const coincideEstado = filtroEstado === "Todos" || b.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  return (
    <div style={{ padding: "28px 32px", height: "100%", overflow: "auto" }}>
      {/* Titulo */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#e2e8f0" }}>
          📚 Biblioteca de Bases
        </h1>
        <p style={{ margin: "6px 0 0 0", color: "#64748b", fontSize: 14 }}>
          {bases.length} bases de misiones registradas en el sistema nacional
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar base, estado, municipio..."
            style={{
              width: "100%", padding: "10px 14px 10px 36px", borderRadius: 10, boxSizing: "border-box",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#e2e8f0", fontSize: 14, outline: "none",
            }}
          />
        </div>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          style={{
            padding: "10px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#e2e8f0", fontSize: 14, outline: "none", cursor: "pointer",
          }}
        >
          {estados.map(e => <option key={e} value={e} style={{ background: "#1e1b2e" }}>{e}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {filtradas.map(base => {
          const color = colorForBase(base.estado);
          return (
            <div
              key={base.id}
              onClick={() => onSeleccionar(base)}
              style={{
                padding: "20px", borderRadius: 16, cursor: "pointer",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid rgba(255,255,255,0.08)`,
                transition: "all 0.2s", position: "relative", overflow: "hidden",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = `${color}12`;
                (e.currentTarget as HTMLDivElement).style.borderColor = `${color}50`;
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${color}20`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              {/* Acento de color */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}80)`, borderRadius: "16px 16px 0 0" }} />

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `${color}20`, border: `1px solid ${color}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Building2 size={20} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0", marginBottom: 6, lineHeight: 1.3 }}>{base.nombre}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#94a3b8" }}>
                      <MapPin size={11} /> {base.estado}{base.municipio ? ` • ${base.municipio}` : ""}
                    </span>
                    {base.administrador && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#94a3b8" }}>
                        <User size={11} /> {base.administrador}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} color={color} style={{ flexShrink: 0, opacity: 0.6 }} />
              </div>

              <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>{base.id}</span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                  background: base.activa ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                  color: base.activa ? "#10b981" : "#ef4444",
                  border: `1px solid ${base.activa ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}>
                  <Activity size={8} />
                  {base.activa ? "Activa" : "Inactiva"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filtradas.length === 0 && (
        <div style={{ textAlign: "center", padding: 64, color: "#475569", fontStyle: "italic" }}>
          No se encontraron bases con esos criterios
        </div>
      )}
    </div>
  );
};
