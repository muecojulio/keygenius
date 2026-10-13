"use client";

import { useMemo, useState } from "react";
import { BarraDias, Boton, CAMPO, EtiquetaEstado, Tarjeta, formatearFecha } from "@/components/ui";
import type { LicenciaVista } from "@/lib/tipos";

export function TablaLicencias({
  licencias,
  cargando,
  onBloquear,
}: {
  licencias: LicenciaVista[];
  cargando: boolean;
  onBloquear: (licencia: LicenciaVista) => void | Promise<void>;
}) {
  const [filtro, setFiltro] = useState("");

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return licencias;
    return licencias.filter(
      (l) =>
        l.nombre_app.toLowerCase().includes(q) ||
        l.clave.toLowerCase().includes(q) ||
        (l.dispositivo_id ?? "").toLowerCase().includes(q) ||
        l.estado.toLowerCase().includes(q),
    );
  }, [licencias, filtro]);

  return (
    <Tarjeta className="p-0">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Licencias</h2>
          <p className="text-sm text-slate-400">
            {licencias.length} registradas · se actualiza sola cada 5 segundos
          </p>
        </div>
        <input
          type="search"
          aria-label="Buscar licencias"
          placeholder="Buscar app, clave, equipo…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className={`${CAMPO} sm:w-72`}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3 font-semibold">Aplicación</th>
              <th className="px-5 py-3 font-semibold">Clave</th>
              <th className="px-5 py-3 font-semibold">Equipo</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold">Días consumidos</th>
              <th className="px-5 py-3 font-semibold">Faltan (32)</th>
              <th className="px-5 py-3 font-semibold">Faltan p/ 30</th>
              <th className="px-5 py-3 font-semibold">Vence</th>
              <th className="px-5 py-3 text-right font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {cargando && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                  Cargando licencias…
                </td>
              </tr>
            )}
            {!cargando && visibles.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                  {licencias.length === 0
                    ? "Aún no hay licencias. Genera una clave o usa «Cargar ejemplos»."
                    : "Ninguna licencia coincide con la búsqueda."}
                </td>
              </tr>
            )}
            {visibles.map((l) => (
              <FilaLicencia key={l.id} licencia={l} onBloquear={onBloquear} />
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}

function FilaLicencia({
  licencia: l,
  onBloquear,
}: {
  licencia: LicenciaVista;
  onBloquear: (licencia: LicenciaVista) => void | Promise<void>;
}) {
  const sinActivar = l.diasActiva === null;
  const bloqueable = l.estado !== "BLOQUEADA";
  return (
    <tr className="align-middle transition hover:bg-white/[0.03]">
      <td className="px-5 py-4 font-medium text-slate-100">{l.nombre_app}</td>
      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs tracking-wider text-indigo-200">{l.clave}</td>
      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-300">{l.dispositivo_id ?? "—"}</td>
      <td className="px-5 py-4">
        <div className="flex flex-col items-start gap-1.5">
          <EtiquetaEstado estado={l.estado} />
          {l.aviso && l.estado === "ACTIVA" && (
            <span className="text-xs text-amber-300">⚠ {l.aviso}</span>
          )}
          {l.aviso && l.estado === "BLOQUEADA" && <span className="text-xs text-rose-300/80">{l.aviso}</span>}
        </div>
      </td>
      <td className="px-5 py-4">
        {sinActivar ? (
          <span className="text-slate-500">Sin activar</span>
        ) : (
          <div className="space-y-1.5">
            <p className="tabular-nums">
              <span className="font-semibold text-slate-100">{l.diasActiva}</span>
              <span className="text-slate-500"> / 32 días</span>
            </p>
            <BarraDias dias={l.diasActiva ?? 0} />
          </div>
        )}
      </td>
      <td className="px-5 py-4 tabular-nums">
        {l.diasRestantes === null ? (
          <span className="text-slate-500">—</span>
        ) : (
          <span className={l.diasRestantes <= 3 ? "font-semibold text-rose-300" : "text-slate-200"}>
            {l.diasRestantes} {l.diasRestantes === 1 ? "día" : "días"}
          </span>
        )}
      </td>
      <td className="px-5 py-4 tabular-nums">
        {l.diasRestantesPara30 === null ? (
          <span className="text-slate-500">—</span>
        ) : (
          <span className={l.diasRestantesPara30 > 0 && l.diasRestantesPara30 <= 3 ? "font-semibold text-amber-300" : "text-slate-200"}>
            {l.diasRestantesPara30}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-slate-300">{formatearFecha(l.fecha_expiracion)}</td>
      <td className="px-5 py-4 text-right">
        <Boton
          variante="peligro"
          disabled={!bloqueable}
          onClick={() => void onBloquear(l)}
          className="px-3 py-1.5 text-xs"
        >
          {bloqueable ? "Bloquear" : "Bloqueada"}
        </Boton>
      </td>
    </tr>
  );
}
