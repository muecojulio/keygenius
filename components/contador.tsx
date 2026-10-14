"use client";

import { useEffect, useRef, useState } from "react";
import { formatearNumero } from "@/lib/formato";
import { useMovimientoReducido } from "@/lib/hooks";

/**
 * Número que sube hasta su valor final (una sola vez, ~600 ms).
 *
 * El valor real va siempre en un texto aparte para lectores de pantalla: la
 * animación es decorativa y no debe provocar anuncios repetidos.
 */
export function Contador({ valor, duracion = 600, className = "" }: { valor: number; duracion?: number; className?: string }) {
  const reducido = useMovimientoReducido();
  const [mostrado, setMostrado] = useState(valor);
  const anterior = useRef(valor);

  useEffect(() => {
    const desde = anterior.current;
    anterior.current = valor;
    if (reducido || desde === valor) {
      setMostrado(valor);
      return;
    }

    let marco = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - inicio) / duracion);
      const suavizado = 1 - Math.pow(1 - avance, 3);
      setMostrado(Math.round(desde + (valor - desde) * suavizado));
      if (avance < 1) marco = requestAnimationFrame(paso);
    };
    marco = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(marco);
  }, [valor, duracion, reducido]);

  return (
    <span className={className}>
      <span aria-hidden="true">{formatearNumero(mostrado)}</span>
      <span className="sr-only">{formatearNumero(valor)}</span>
    </span>
  );
}
