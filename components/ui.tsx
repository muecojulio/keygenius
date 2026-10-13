import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Estado } from "@/lib/tipos";

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur-sm ${className}`}
    >
      {children}
    </section>
  );
}

const ETIQUETA_ESTADO: Record<Estado, string> = {
  DISPONIBLE: "Disponible",
  ACTIVA: "Activa",
  BLOQUEADA: "Bloqueada",
};

const ESTILO_ESTADO: Record<Estado, string> = {
  DISPONIBLE: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  ACTIVA: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  BLOQUEADA: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
};

export function EtiquetaEstado({ estado }: { estado: Estado }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${ESTILO_ESTADO[estado]}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

/** Barra de días consumidos sobre 32: verde, ámbar desde el día 27, rojo desde el 30. */
export function BarraDias({ dias, total = 32 }: { dias: number; total?: number }) {
  const pct = Math.min(100, Math.max(0, Math.round((dias / total) * 100)));
  const color = dias >= 30 ? "bg-rose-500" : dias >= 27 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

type VarianteBoton = "primario" | "secundario" | "peligro";

const ESTILO_BOTON: Record<VarianteBoton, string> = {
  primario:
    "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-900/40 hover:from-indigo-400 hover:to-violet-400",
  secundario: "border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10",
  peligro: "border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
};

export function Boton({
  variante = "secundario",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBoton }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${ESTILO_BOTON[variante]} ${className}`}
    />
  );
}

export const CAMPO =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

export function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
