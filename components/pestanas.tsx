"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type TouchEvent } from "react";
import { Icono, type NombreIcono } from "@/components/iconos";
import {
  actualizarGesto,
  direccionPestana,
  iniciarGesto,
  type RastroGesto,
} from "@/lib/gestos";
import { useDesborde, useMovimientoReducido } from "@/lib/hooks";

/**
 * Pestañas con semántica accesible y relación pestaña ↔ panel.
 *
 * - Indicador que se desliza hacia la pestaña activa (sin saltos).
 * - Teclado: flechas izquierda/derecha, Inicio y Fin (activación automática).
 * - Si no caben, se desplazan horizontalmente y avisan con un degradado; la
 *   pestaña activa se centra al cambiar.
 * - En pantallas táctiles, el panel también responde a un desliz horizontal,
 *   siempre que el gesto no empiece sobre un control ni dentro de un carril.
 */

export type PestanaItem = {
  id: string;
  etiqueta: string;
  icono?: NombreIcono;
  contador?: number;
};

export function Pestanas({
  items,
  activa,
  onCambiar,
  etiqueta,
  children,
  className = "",
}: {
  items: readonly PestanaItem[];
  activa: string;
  onCambiar: (id: string) => void;
  /** Nombre accesible del conjunto de pestañas. */
  etiqueta: string;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const base = useId();
  const listaRef = useRef<HTMLDivElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botones = useRef(new Map<string, HTMLButtonElement>());
  const [indicador, setIndicador] = useState<{ izquierda: number; ancho: number } | null>(null);
  const [direccion, setDireccion] = useState<"siguiente" | "anterior">("siguiente");
  const reducido = useMovimientoReducido();
  const desborde = useDesborde(contenedorRef);

  const medir = useCallback(() => {
    const boton = botones.current.get(activa);
    if (!boton) return;
    setIndicador({ izquierda: boton.offsetLeft, ancho: boton.offsetWidth });
  }, [activa]);

  useEffect(() => {
    medir();
    const lista = listaRef.current;
    if (!lista) return;
    const observador = new ResizeObserver(medir);
    observador.observe(lista);
    return () => observador.disconnect();
  }, [medir]);

  // La pestaña activa se queda a la vista (y centrada cuando se puede).
  useEffect(() => {
    const boton = botones.current.get(activa);
    const contenedor = contenedorRef.current;
    if (!boton || !contenedor) return;
    const destino = boton.offsetLeft - (contenedor.clientWidth - boton.offsetWidth) / 2;
    contenedor.scrollTo({ left: Math.max(0, destino), behavior: reducido ? "auto" : "smooth" });
  }, [activa, reducido]);

  const cambiar = useCallback(
    (id: string) => {
      if (id === activa) return;
      const desde = items.findIndex((item) => item.id === activa);
      const hasta = items.findIndex((item) => item.id === id);
      setDireccion(hasta >= desde ? "siguiente" : "anterior");
      onCambiar(id);
    },
    [activa, items, onCambiar],
  );

  function alTeclear(evento: KeyboardEvent<HTMLDivElement>) {
    const indice = items.findIndex((item) => item.id === activa);
    let destino: number | null = null;
    if (evento.key === "ArrowRight") destino = (indice + 1) % items.length;
    else if (evento.key === "ArrowLeft") destino = (indice - 1 + items.length) % items.length;
    else if (evento.key === "Home") destino = 0;
    else if (evento.key === "End") destino = items.length - 1;
    if (destino === null) return;

    const siguiente = items[destino];
    if (!siguiente) return;
    evento.preventDefault();
    cambiar(siguiente.id);
    botones.current.get(siguiente.id)?.focus();
  }

  // ── Desliz horizontal sobre el panel ─────────────────────────────────────
  const rastro = useRef<RastroGesto | null>(null);

  function alTocar(evento: TouchEvent<HTMLDivElement>) {
    const toque = evento.touches[0];
    if (evento.touches.length !== 1 || !toque) {
      rastro.current = null;
      return;
    }
    const objetivo = evento.target instanceof Element ? evento.target : null;
    if (objetivo && gestoReservado(objetivo)) {
      rastro.current = null;
      return;
    }
    rastro.current = iniciarGesto(toque.clientX, toque.clientY, evento.timeStamp);
  }

  function alMover(evento: TouchEvent<HTMLDivElement>) {
    const actual = rastro.current;
    const toque = evento.touches[0];
    if (!actual || !toque) return;
    rastro.current = actualizarGesto(actual, toque.clientX, toque.clientY, evento.timeStamp);
  }

  function alSoltar(evento: TouchEvent<HTMLDivElement>) {
    const actual = rastro.current;
    rastro.current = null;
    if (!actual) return;
    const toque = evento.changedTouches[0];
    const final = toque ? actualizarGesto(actual, toque.clientX, toque.clientY, evento.timeStamp) : actual;

    const lado = direccionPestana(final);
    if (lado === 0) return;
    const indice = items.findIndex((item) => item.id === activa);
    const siguiente = items[lado === -1 ? indice + 1 : indice - 1];
    if (siguiente) cambiar(siguiente.id);
  }

  return (
    <div className={className}>
      <div className="relative">
        <div
          ref={contenedorRef}
          className="sin-barra overflow-x-auto overscroll-x-contain"
          data-carril=""
        >
          <div
            ref={listaRef}
            role="tablist"
            aria-label={etiqueta}
            aria-orientation="horizontal"
            onKeyDown={alTeclear}
            className="relative flex w-max min-w-full gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm"
          >
            {indicador && (
              <span
                aria-hidden="true"
                className="indicador-pestana absolute top-1 bottom-1 rounded-xl bg-gradient-to-r from-indigo-500/80 to-violet-500/80 shadow-lg shadow-indigo-950/50"
                style={{ transform: `translateX(${indicador.izquierda}px)`, width: `${indicador.ancho}px` }}
              />
            )}
            {items.map((item) => {
              const esActiva = item.id === activa;
              return (
                <button
                  key={item.id}
                  id={`${base}-tab-${item.id}`}
                  ref={(nodo) => {
                    if (nodo) botones.current.set(item.id, nodo);
                    else botones.current.delete(item.id);
                  }}
                  role="tab"
                  type="button"
                  aria-selected={esActiva}
                  aria-controls={`${base}-panel-${item.id}`}
                  tabIndex={esActiva ? 0 : -1}
                  onClick={() => cambiar(item.id)}
                  className={`tacto relative z-10 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors duration-200 ${
                    esActiva ? "text-white" : "text-slate-300 hover:text-white"
                  }`}
                >
                  {item.icono && <Icono nombre={item.icono} className="size-4" />}
                  <span>{item.etiqueta}</span>
                  {typeof item.contador === "number" && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[0.68rem] font-bold tabular-nums ${
                        esActiva ? "bg-white/20 text-white" : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {item.contador}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-950 to-transparent transition-opacity duration-200 lg:hidden ${
            desborde.izquierda ? "opacity-100" : "opacity-0"
          }`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-slate-950 to-transparent transition-opacity duration-200 lg:hidden ${
            desborde.derecha ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      <div
        key={activa}
        id={`${base}-panel-${activa}`}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${activa}`}
        tabIndex={-1}
        data-direccion={direccion}
        className="panel-entra mt-4 outline-none"
        onTouchStart={alTocar}
        onTouchMove={alMover}
        onTouchEnd={alSoltar}
        onTouchCancel={() => {
          rastro.current = null;
        }}
      >
        {children(activa)}
      </div>
    </div>
  );
}

/** El gesto no arranca sobre controles ni dentro de carriles desplazables. */
function gestoReservado(objetivo: Element): boolean {
  if (objetivo.closest('a,button,input,select,textarea,label,[role="tab"],[role="switch"],[role="option"],[role="listbox"]')) {
    return true;
  }
  return Boolean(objetivo.closest('[data-carril], [data-sin-desliz], [contenteditable="true"]'));
}
