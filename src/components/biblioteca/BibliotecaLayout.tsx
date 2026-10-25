import React, { useState, useEffect } from "react";
import { Building2, LogOut, Settings, RefreshCw, Loader2, Library } from "lucide-react";
import { BaseMision, UsuarioSesion, isDesarrollador } from "../../types";
import { SupabaseService } from "../../services/supabase";
import { StorageService } from "../../services/storage";
import { BibliotecaBasesGrid } from "./BibliotecaBasesGrid";
import { BaseDetalle } from "./BaseDetalle";

interface BibliotecaLayoutProps {
  sesion: UsuarioSesion;
}

export const BibliotecaLayout: React.FC<BibliotecaLayoutProps> = ({ sesion }) => {
  const [bases, setBases] = useState<BaseMision[]>([]);
  const [baseSeleccionada, setBaseSeleccionada] = useState<BaseMision | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarBases = async () => {
    setCargando(true);
    setError("");
    const res = await SupabaseService.listarBases();
    setCargando(false);
    if (!res.ok) { setError(res.error || "Error al cargar bases"); return; }
    setBases(res.data || []);
  };

  useEffect(() => { cargarBases(); }, []);

  const handleCerrarSesion = () => {
    StorageService.cerrarSesion();
    window.dispatchEvent(new Event("mpv-session-updated"));
  };

  const rolLabel = isDesarrollador(sesion) ? "Desarrollador" : "Administrador Nacional";

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "linear-gradient(135deg, #0d1117 0%, #0f172a 50%, #0d1117 100%)",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", gap: 16, padding: "0 28px",
        height: 60, flexShrink: 0,
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(124,58,237,0.4)",
          }}>
            <Library size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#e2e8f0", lineHeight: 1 }}>Biblioteca de Bases</div>
            <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1, marginTop: 2 }}>Sistema Nacional — Movimiento Paz y Vida</div>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={cargarBases} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 6, borderRadius: 8, display: "flex" }}>
            <RefreshCw size={16} />
          </button>

          <div style={{ height: 20, width: 1, background: "rgba(255,255,255,0.1)" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 1, textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{sesion.nombres} {sesion.apellidos}</div>
            <div style={{ fontSize: 11, color: "#7c3aed" }}>{rolLabel}</div>
          </div>

          <button onClick={handleCerrarSesion} style={{
            padding: "6px 12px", borderRadius: 8, cursor: "pointer",
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444", fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      {/* Cuerpo */}
      <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {cargando ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "#64748b" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 15 }}>Cargando bases de misiones...</span>
          </div>
        ) : error ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
            <div style={{ color: "#ef4444", fontSize: 14 }}>{error}</div>
            <button onClick={cargarBases} style={{ padding: "8px 20px", borderRadius: 8, background: "#7c3aed", border: "none", color: "#fff", cursor: "pointer", fontSize: 13 }}>
              Reintentar
            </button>
          </div>
        ) : baseSeleccionada ? (
          <div style={{ height: "100%", overflow: "auto" }}>
            <BaseDetalle
              base={baseSeleccionada}
              sesion={sesion}
              onBack={() => setBaseSeleccionada(null)}
              onBaseUpdated={updated => {
                setBases(prev => prev.map(b => b.id === updated.id ? updated : b));
                setBaseSeleccionada(updated);
              }}
            />
          </div>
        ) : (
          <div style={{ height: "100%", overflow: "auto" }}>
            <BibliotecaBasesGrid bases={bases} onSeleccionar={setBaseSeleccionada} />
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 999px; }
      `}</style>
    </div>
  );
};
