"use client";

import { useId, useRef } from "react";
import { Icono } from "@/components/iconos";
import { Boton } from "@/components/ui";
import { useBloqueoScroll, useFocoTrampa } from "@/lib/hooks";

/**
 * Confirmación para acciones destructivas.
 *
 * Sustituye a `window.confirm`: es accesible (rol de diálogo, foco atrapado,
 * Escape cierra y el foco vuelve al botón que lo abrió), se puede estilizar y
 * no bloquea el hilo principal.
 */
export function DialogoConfirmar({
  abierto,
  titulo,
  descripcion,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  variante = "peligro",
  ocupado = false,
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: "peligro" | "primario";
  ocupado?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);

  useBloqueoScroll(abierto);
  useFocoTrampa(panel, abierto, onCancelar);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center"
      onPointerDown={(evento) => {
        if (evento.target === evento.currentTarget) onCancelar();
      }}
    >
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-desc`}
        className="aviso-entra w-full max-w-md rounded-2xl border border-white/12 bg-slate-900/95 p-5 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-200">
            <Icono nombre="alerta" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id={`${id}-titulo`} className="text-base font-semibold text-slate-50">
              {titulo}
            </h2>
            <p id={`${id}-desc`} className="mt-1 text-sm text-slate-300">
              {descripcion}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton onClick={onCancelar} disabled={ocupado}>
            {textoCancelar}
          </Boton>
          <Boton
            variante={variante}
            onClick={onConfirmar}
            estado={ocupado ? "cargando" : "inactivo"}
            className="sm:min-w-36"
          >
            {textoConfirmar}
          </Boton>
        </div>
      </div>
    </div>
  );
}
