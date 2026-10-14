"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent as PuntoEvento, type ReactNode } from "react";
import { BotonIcono } from "@/components/ui";
import {
  actualizarGesto,
  decidirTarjeta,
  iniciarGesto,
  limitar,
  velocidadX,
  type RastroGesto,
} from "@/lib/gestos";

const ANCHO_POR_DEFECTO = 132;

/**
 * Tarjeta que revela acciones al deslizarla hacia la izquierda.
 *
 * Reglas que se respetan aquí:
 *  - El eje vertical es del navegador: con `touch-action: pan-y` el scroll de la
 *    página nunca se cancela, y el arrastre solo empieza cuando el gesto es
 *    claramente horizontal (proporción 1,2).
 *  - El desliz nunca es la única forma: hay un botón visible que abre y cierra
 *    las acciones, con `aria-expanded`.
 *  - Mientras están ocultas, las acciones quedan `inert`: no reciben foco ni se
 *    anuncian como disponibles.
 *  - Un arrastre no dispara el clic posterior.
 */
export function TarjetaDeslizable({
  titulo,
  acciones,
  children,
  etiquetaAcciones = "Acciones",
  className = "",
}: {
  /** Se usa para el nombre accesible del botón de acciones. */
  titulo: string;
  acciones: ReactNode;
  children: ReactNode;
  etiquetaAcciones?: string;
  className?: string;
}) {
  const idAcciones = `${useId()}-acciones`;
  const [abierta, setAbierta] = useState(false);
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);

  const panelAcciones = useRef<HTMLDivElement>(null);
  const ancho = useRef(ANCHO_POR_DEFECTO);
  const posicion = useRef(0);
  const rastro = useRef<RastroGesto | null>(null);
  const movido = useRef(false);

  useLayoutEffect(() => {
    const medido = panelAcciones.current?.offsetWidth ?? ANCHO_POR_DEFECTO;
    ancho.current = medido > 0 ? medido : ANCHO_POR_DEFECTO;
    const siguiente = abierta ? -ancho.current : 0;
    posicion.current = siguiente;
    setDesplazamiento(siguiente);
  }, [abierta, acciones]);

  useEffect(() => {
    const panel = panelAcciones.current;
    if (!panel) return;
    const observador = new ResizeObserver(() => {
      ancho.current = panel.offsetWidth || ANCHO_POR_DEFECTO;
      if (abierta) {
        posicion.current = -ancho.current;
        setDesplazamiento(posicion.current);
      }
    });
    observador.observe(panel);
    return () => observador.disconnect();
  }, [abierta]);

  function alternar() {
    setAbierta((previa) => {
      const siguiente = !previa;
      posicion.current = siguiente ? -ancho.current : 0;
      setDesplazamiento(posicion.current);
      return siguiente;
    });
  }

  function alBajar(evento: PuntoEvento<HTMLDivElement>) {
    if (evento.pointerType === "mouse" && evento.button !== 0) return;
    const objetivo = evento.target;
    if (objetivo instanceof Element && objetivo.closest("button,a,input,select,textarea,[data-sin-arrastrar]")) {
      return;
    }
    rastro.current = iniciarGesto(evento.clientX, evento.clientY, evento.timeStamp);
    movido.current = false;
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function alMover(evento: PuntoEvento<HTMLDivElement>) {
    const actual = rastro.current;
    if (!actual) return;
    const siguiente = actualizarGesto(actual, evento.clientX, evento.clientY, evento.timeStamp);
    rastro.current = siguiente;
    if (siguiente.eje === "vertical") {
      // El navegador se queda con el gesto: scroll de la página.
      rastro.current = null;
      return;
    }
    if (siguiente.eje !== "horizontal") return;

    const base = abierta ? -ancho.current : 0;
    const destino = limitar(base + (siguiente.x - siguiente.inicioX), -ancho.current, 0);
    posicion.current = destino;
    movido.current = true;
    if (!arrastrando) setArrastrando(true);
    setDesplazamiento(destino);
  }

  function alSoltar(evento: PuntoEvento<HTMLDivElement>) {
    const actual = rastro.current;
    rastro.current = null;
    if (!actual) {
      setArrastrando(false);
      return;
    }
    const final = actualizarGesto(actual, evento.clientX, evento.clientY, evento.timeStamp);
    if (final.eje !== "horizontal") {
      setArrastrando(false);
      return;
    }

    const decision = decidirTarjeta({
      desplazamiento: posicion.current,
      velocidad: velocidadX(final),
      ancho: ancho.current,
    });
    const destino = decision === "abrir" ? -ancho.current : 0;
    posicion.current = destino;
    setDesplazamiento(destino);
    setAbierta(destino !== 0);
    setArrastrando(false);
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 ${className}`}>
      <div
        ref={panelAcciones}
        id={idAcciones}
        inert={!abierta}
        aria-hidden={!abierta}
        className="absolute inset-y-0 right-0 flex items-center gap-1.5 bg-gradient-to-l from-slate-900 to-slate-900/85 px-2.5"
      >
        {acciones}
      </div>

      <div
        onClickCapture={(evento) => {
          if (movido.current) {
            evento.preventDefault();
            evento.stopPropagation();
            movido.current = false;
          }
        }}
        onClick={(evento) => {
          if (!abierta) return;
          const objetivo = evento.target;
          if (objetivo instanceof Element && objetivo.closest("button,a,input,select,textarea")) return;
          alternar();
        }}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={() => {
          rastro.current = null;
          setArrastrando(false);
          posicion.current = abierta ? -ancho.current : 0;
          setDesplazamiento(posicion.current);
        }}
        className="deslizable relative z-10 bg-white/[0.04] backdrop-blur-sm"
        style={{
          transform: `translate3d(${desplazamiento}px, 0, 0)`,
          transition: arrastrando ? "none" : "transform 220ms cubic-bezier(.22,1,.36,1)",
        }}
      >
        <div className="flex items-start gap-2 p-4">
          <div className="min-w-0 flex-1">{children}</div>
          <BotonIcono
            etiqueta={`${etiquetaAcciones} de ${titulo}`}
            icono={abierta ? "izquierda" : "ajustes"}
            variante="fantasma"
            aria-expanded={abierta}
            aria-controls={idAcciones}
            onClick={alternar}
            className="size-9"
          />
        </div>
      </div>
    </div>
  );
}
