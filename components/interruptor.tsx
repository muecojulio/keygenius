"use client";

import { useId } from "react";

/**
 * Interruptor con semántica `role="switch"` y `aria-checked`.
 *
 * El estado se comunica con posición, color y texto; el movimiento del pulsador
 * es un refuerzo, no la única señal.
 */
export function Interruptor({
  activo,
  onCambiar,
  etiqueta,
  descripcion,
  className = "",
}: {
  activo: boolean;
  onCambiar: (valor: boolean) => void;
  etiqueta: string;
  descripcion?: string;
  className?: string;
}) {
  const id = useId();
  const idDescripcion = `${id}-desc`;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-describedby={descripcion ? idDescripcion : undefined}
      onClick={() => onCambiar(!activo)}
      className={`tacto group inline-flex min-h-11 items-center gap-3 rounded-xl px-2 text-left transition-colors duration-200 hover:bg-white/5 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 ${
          activo ? "border-emerald-400/50 bg-emerald-500/70" : "border-white/15 bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-md transition-transform duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${
            activo ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-200">{etiqueta}</span>
        {descripcion && (
          <span id={idDescripcion} className="block text-xs text-slate-400">
            {descripcion}
          </span>
        )}
      </span>
    </button>
  );
}
