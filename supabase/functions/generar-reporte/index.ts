// Supabase Edge Function: generar-reporte
// Genera snapshots semanales o mensuales para las bases de misiones y los guarda en public.base_reportes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calcularPeriodo(tipo: "semanal" | "mensual"): string {
  const now = new Date();
  if (tipo === "mensual") {
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${mes}`;
  }
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - startOfYear.getTime();
  const week = Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: { tipo?: "semanal" | "mensual"; base_id?: string } = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const tipo = body.tipo === "semanal" ? "semanal" : "mensual";
    const periodo = calcularPeriodo(tipo);

    // Obtener las bases de misiones a procesar
    let basesQuery = supabase.from("bases_misiones").select("id, nombre").eq("activa", true);
    if (body.base_id) {
      basesQuery = basesQuery.eq("id", body.base_id);
    }
    const { data: bases, error: basesErr } = await basesQuery;
    if (basesErr) throw basesErr;

    const reportesGenerados = [];

    for (const base of bases || []) {
      const baseId = base.id;

      // Consultar perfiles, pagos, asistencias y disciplinas de la base
      const [rPerfiles, rPagos, rAsistencias, rDisciplinas] = await Promise.all([
        supabase.from("perfiles").select("id, estado_solvencia").eq("base_misiones_id", baseId),
        supabase.from("pagos").select("monto_bs, monto_usd, creado_en").eq("base_misiones_id", baseId),
        supabase.from("asistencias").select("id, fecha").eq("base_misiones_id", baseId),
        supabase.from("base_disciplinas").select("id, nombre, piso, tutor, precio_bs, precio_usd").eq("base_id", baseId),
      ]);

      const perfiles = rPerfiles.data || [];
      const pagos = rPagos.data || [];
      const asistencias = rAsistencias.data || [];
      const disciplinas = rDisciplinas.data || [];

      const ingresos_bs = pagos.reduce((s, p) => s + (Number(p.monto_bs) || 0), 0);
      const ingresos_usd = pagos.reduce((s, p) => s + (Number(p.monto_usd) || 0), 0);
      const personas_activas = perfiles.filter((p) => {
        const e = (p.estado_solvencia || "").toLowerCase();
        return e === "activo" || e === "solvente";
      }).length;

      const datos_json = {
        base_id: baseId,
        base_nombre: base.nombre,
        total_personas: perfiles.length,
        personas_activas,
        total_pagos: pagos.length,
        total_asistencias: asistencias.length,
        ingresos_bs,
        ingresos_usd,
        total_disciplinas: disciplinas.length,
        disciplinas,
      };

      const { data: reporte, error: repErr } = await supabase
        .from("base_reportes")
        .insert({
          base_id: baseId,
          tipo,
          periodo,
          datos_json,
          generado_por: "sistema_cron",
        })
        .select()
        .single();

      if (!repErr && reporte) {
        reportesGenerados.push(reporte);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, tipo, periodo, total: reportesGenerados.length, reportes: reportesGenerados }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
