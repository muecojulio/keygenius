"use client";

import { useRef, type ReactNode } from "react";
import { Icono } from "@/components/iconos";
import { useDesborde } from "@/lib/hooks";

/**
 * Carril horizontal con scroll nativo.
 *
 * - No intercepta gestos: es el navegador el que desplaza (momentum incluido).
 * - `scroll-snap` suave para que las tarjetas se detengan solas.
 * - Los degradados de los bordes solo aparecen cuando hay contenido fuera de
 *   vista, y se recalculan al desplazar, al redimensionar y al cambiar los hijos.
 * - A partir de `lg` puede convertirse en cuadrícula (`rejilla`), porque a ese
 *   ancho el carril deja de aportar.
 */
export function Carril({
  etiqueta,
  children,
  rejilla = true,
  className = "",
  claseCarril = "",
}: {
  /** Nombre accesible del conjunto ("Filtros", "Casos rápidos", "Resumen"…). */
  etiqueta: string;
  children: ReactNode;
  /** En pantallas grandes, ¿se convierte en cuadrícula? */
  rejilla?: boolean;
  className?: string;
  claseCarril?: string;
}) {
  const riel = useRef<HTMLDivElement>(null);
  const { izquierda, derecha } = useDesborde(riel);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={riel}
        role="group"
        aria-label={etiqueta}
        tabIndex={0}
        data-carril=""
        className={`carril sin-barra -mx-1 px-1 pb-1 outline-offset-4 ${rejilla ? "carril--rejilla lg:gap-4" : ""} ${claseCarril}`}
      >
        {children}
      </div>

      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-slate-950 to-transparent transition-opacity duration-200 ${
          izquierda ? "opacity-100" : "opacity-0"
        }`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-950 to-transparent transition-opacity duration-200 ${
          derecha ? "opacity-100" : "opacity-0"
        }`}
      />

      {rejilla && derecha && (
        <p className="mt-1.5 flex items-center justify-end gap-1 text-[0.7rem] font-medium text-slate-500 lg:hidden">
          Desliza
          <Icono nombre="derecha" className="size-3" />
        </p>
      )}
    </div>
  );
}
