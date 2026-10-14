"use client";

import { useId, useState, type ReactNode } from "react";
import { Icono, type NombreIcono } from "@/components/iconos";

/**
 * Panel plegable con apertura y cierre animados (altura real, sin saltos) y
 * estado accesible siempre sincronizado (`aria-expanded` + `aria-controls`).
 */
export function Acordeon({
  titulo,
  resumen,
  icono = "documento",
  abiertoInicial = false,
  children,
  className = "",
}: {
  titulo: string;
  resumen?: string;
  icono?: NombreIcono;
  abiertoInicial?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const id = useId();
  const idPanel = `${id}-panel`;

  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] ${className}`}>
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => setAbierto((previo) => !previo)}
        className="tacto flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-white/5"
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-200">
          <Icono nombre={icono} className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-100">{titulo}</span>
          {resumen && <span className="block text-xs text-slate-400">{resumen}</span>}
        </span>
        <Icono
          nombre="abajo"
          className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${
            abierto ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        id={idPanel}
        className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${
          abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden" inert={!abierto}>
          <div className="border-t border-white/5 px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
