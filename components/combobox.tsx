"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Icono } from "@/components/iconos";
import { CAMPO } from "@/components/ui";
import { filtrar, moverOpciones, normalizar } from "@/lib/filtro";
import { useToqueFuera } from "@/lib/hooks";

/**
 * Selector con búsqueda (combobox editable).
 *
 * Cumple el patrón de WAI-ARIA: `role="combobox"` con `aria-expanded`,
 * `aria-controls` y `aria-activedescendant`; la lista es `role="listbox"` y cada
 * opción `role="option"`. Se maneja con teclado (flechas, Inicio/Fin, Enter,
 * Escape), con mouse y con toque, y filtra ignorando mayúsculas y acentos.
 *
 * El campo admite texto libre: la lista son sugerencias, no una jaula.
 */
export function Combobox({
  etiqueta,
  valor,
  onCambiar,
  opciones,
  ayuda,
  placeholder,
  requerido = false,
  maxLength = 80,
  id,
  className = "",
}: {
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
  opciones: readonly string[];
  ayuda?: string;
  placeholder?: string;
  requerido?: boolean;
  maxLength?: number;
  id?: string;
  className?: string;
}) {
  const generado = useId();
  const idEntrada = id ?? `${generado}-entrada`;
  const idLista = `${idEntrada}-lista`;
  const idAyuda = `${idEntrada}-ayuda`;

  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);
  const opcionesRef = useRef<(HTMLLIElement | null)[]>([]);

  const sugiereTodo = useMemo(
    () => opciones.some((opcion) => normalizar(opcion) === normalizar(valor)),
    [opciones, valor],
  );

  const sugerencias = useMemo(
    () => (sugiereTodo ? [...opciones] : filtrar(opciones, valor, (opcion) => [opcion]).slice(0, 50)),
    [opciones, valor, sugiereTodo],
  );

  useToqueFuera(contenedor, abierto, () => setAbierto(false));

  // Índice siempre dentro de la lista (se recorta al pintar, sin efectos).
  const indiceActivo = sugerencias.length === 0 ? -1 : Math.min(Math.max(activo, 0), sugerencias.length - 1);

  useEffect(() => {
    if (!abierto || indiceActivo < 0) return;
    opcionesRef.current[indiceActivo]?.scrollIntoView({ block: "nearest" });
  }, [abierto, indiceActivo]);

  function seleccionar(opcion: string) {
    onCambiar(opcion);
    setAbierto(false);
  }

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    const movimiento = moverOpciones(evento.key, { total: sugerencias.length, activo: abierto ? indiceActivo : -1 });

    if (movimiento !== null && (abierto || evento.key === "ArrowDown" || evento.key === "ArrowUp")) {
      evento.preventDefault();
      setAbierto(true);
      setActivo(Math.max(0, movimiento));
      return;
    }

    if (evento.key === "Enter" && abierto && indiceActivo >= 0) {
      const elegida = sugerencias[indiceActivo];
      if (elegida) {
        evento.preventDefault();
        seleccionar(elegida);
      }
      return;
    }

    if (evento.key === "Escape" && abierto) {
      evento.preventDefault();
      setAbierto(false);
      return;
    }

    if (evento.key === "Tab") setAbierto(false);
  }

  const activaId = abierto && indiceActivo >= 0 ? `${idLista}-${indiceActivo}` : undefined;

  return (
    <div ref={contenedor} className={`relative ${className}`}>
      <label htmlFor={idEntrada} className="mb-2 block text-sm font-medium text-slate-300">
        {etiqueta}
      </label>

      <div className="relative">
        <input
          id={idEntrada}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-activedescendant={activaId}
          aria-autocomplete="list"
          aria-describedby={ayuda ? idAyuda : undefined}
          autoComplete="off"
          spellCheck={false}
          required={requerido}
          maxLength={maxLength}
          placeholder={placeholder}
          value={valor}
          onChange={(evento) => {
            onCambiar(evento.target.value);
            setAbierto(true);
            setActivo(0);
          }}
          onKeyDown={alTeclear}
          onFocus={() => {
            if (!valor) setAbierto(opciones.length > 0);
          }}
          className={`${CAMPO} pr-12`}
        />
        <button
          type="button"
          aria-label={abierto ? `Ocultar ${etiqueta.toLowerCase()}` : `Mostrar ${etiqueta.toLowerCase()}`}
          onClick={() => setAbierto((previo) => !previo)}
          className="tacto absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-white/10 hover:text-slate-100"
        >
          <Icono
            nombre="abajo"
            className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${abierto ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {ayuda && (
        <p id={idAyuda} className="mt-1.5 text-xs text-slate-400">
          {ayuda}
        </p>
      )}

      <span aria-live="polite" className="sr-only">
        {abierto
          ? sugerencias.length === 0
            ? "Sin sugerencias"
            : `${sugerencias.length} sugerencias disponibles`
          : ""}
      </span>

      {abierto && (
        <ul
          id={idLista}
          role="listbox"
          aria-label={`${etiqueta}: sugerencias`}
          className="absolute z-40 mt-2 max-h-64 w-full list-none overflow-y-auto overscroll-contain rounded-xl border border-white/12 bg-slate-900/98 p-1 shadow-2xl shadow-black/60 backdrop-blur-md"
        >
          {sugerencias.length === 0 && (
            <li role="presentation" className="px-3 py-2 text-sm text-slate-400">
              Sin coincidencias. Se usará «{valor.trim() || "…"}».
            </li>
          )}
          {sugerencias.map((opcion, indice) => {
            const esActiva = indice === indiceActivo;
            const esElegida = normalizar(opcion) === normalizar(valor);
            return (
              <li
                key={opcion}
                ref={(nodo) => {
                  opcionesRef.current[indice] = nodo;
                }}
                id={`${idLista}-${indice}`}
                role="option"
                aria-selected={esElegida}
                onPointerDown={(evento) => {
                  evento.preventDefault();
                  seleccionar(opcion);
                }}
                onPointerMove={() => setActivo(indice)}
                data-activa={esActiva ? "si" : "no"}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  esActiva ? "bg-indigo-500/25 text-white" : "text-slate-200"
                }`}
              >
                <Icono
                  nombre={esElegida ? "check" : "llave"}
                  className={`size-3.5 shrink-0 ${esElegida ? "text-emerald-300" : "text-slate-500"}`}
                />
                <span className="truncate">{opcion}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
