// Aritmética de gestos táctiles. Nada de DOM aquí: así se prueba de forma
// determinista y se reutiliza en pestañas, carriles y tarjetas deslizables.
//
// Reglas de oro:
//  - El eje vertical pertenece al navegador (scroll de página), nunca al gesto.
//  - El gesto horizontal solo empieza cuando es claramente horizontal.
//  - Un tirón corto y rápido cuenta tanto como un arrastre largo.

/** Un gesto cuenta como horizontal si supera 1,2 veces el desplazamiento vertical. */
export const PROPORCION_EJE = 1.2;
/** Margen para distinguir un toque de un arrastre. */
export const DISTANCIA_MINIMA_EJE = 12;
/** Distancia mínima para cambiar de pestaña con un desliz. */
export const DISTANCIA_PESTANA = 56;
/** Velocidad mínima (px/ms) para cambiar de pestaña con un tirón. */
export const VELOCIDAD_PESTANA = 0.35;
/** Fracción del ancho de acciones que hay que arrastrar para abrir la tarjeta. */
export const UMBRAL_TARJETA = 0.45;
/** Velocidad mínima (px/ms) para abrir o cerrar la tarjeta con un tirón. */
export const VELOCIDAD_TARJETA = 0.4;

export type Eje = "horizontal" | "vertical" | null;

export type RastroGesto = {
  inicioX: number;
  inicioY: number;
  inicioMs: number;
  x: number;
  y: number;
  ms: number;
  eje: Eje;
};

export function iniciarGesto(x: number, y: number, ms: number): RastroGesto {
  return { inicioX: x, inicioY: y, inicioMs: ms, x, y, ms, eje: null };
}

/** Actualiza el rastro con la posición y el tiempo actuales (inmutable). */
export function actualizarGesto(rastro: RastroGesto, x: number, y: number, ms: number): RastroGesto {
  return { ...rastro, x, y, ms, eje: rastro.eje ?? clasificarEje(x - rastro.inicioX, y - rastro.inicioY) };
}

export function deltaX(rastro: RastroGesto): number {
  return rastro.x - rastro.inicioX;
}

export function deltaY(rastro: RastroGesto): number {
  return rastro.y - rastro.inicioY;
}

export function duracion(rastro: RastroGesto): number {
  return Math.max(1, rastro.ms - rastro.inicioMs);
}

/** Velocidad horizontal en px/ms (el signo indica la dirección). */
export function velocidadX(rastro: RastroGesto): number {
  return deltaX(rastro) / duracion(rastro);
}

/**
 * Decide el eje del gesto una sola vez. Devuelve `null` mientras el
 * desplazamiento no sea concluyente, para no robarle el gesto al navegador.
 */
export function clasificarEje(
  dx: number,
  dy: number,
  proporcion = PROPORCION_EJE,
  distanciaMinima = DISTANCIA_MINIMA_EJE,
): Eje {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < distanciaMinima && ay < distanciaMinima) return null;
  return ax >= ay * proporcion ? "horizontal" : "vertical";
}

/** ¿El gesto ya está comprometido con el eje horizontal? */
export function esHorizontal(rastro: RastroGesto): boolean {
  return rastro.eje === "horizontal" || (rastro.eje === null && clasificarEje(deltaX(rastro), deltaY(rastro)) === "horizontal");
}

/**
 * Cambio de pestaña por desliz. Devuelve `1` (pestaña anterior, se deslizó a la
 * derecha), `-1` (pestaña siguiente) o `0` (no hubo cambio).
 */
export function direccionPestana(
  rastro: RastroGesto,
  distancia = DISTANCIA_PESTANA,
  velocidad = VELOCIDAD_PESTANA,
): -1 | 0 | 1 {
  if (!esHorizontal(rastro)) return 0;
  const dx = deltaX(rastro);
  const rapido = Math.abs(velocidadX(rastro)) >= velocidad && Math.abs(dx) >= DISTANCIA_MINIMA_EJE;
  if (dx <= -distancia || (rapido && dx < 0)) return -1;
  if (dx >= distancia || (rapido && dx > 0)) return 1;
  return 0;
}

/**
 * Decide si la tarjeta queda abierta tras soltar el dedo: por distancia
 * recorrida o por un tirón rápido en la dirección de apertura.
 */
export function decidirTarjeta({
  desplazamiento,
  velocidad,
  ancho,
  umbral = UMBRAL_TARJETA,
  velocidadMinima = VELOCIDAD_TARJETA,
}: {
  /** Posición actual en px: negativa hacia la izquierda (abre). */
  desplazamiento: number;
  /** Velocidad horizontal en px/ms. */
  velocidad: number;
  /** Ancho disponible de acciones. */
  ancho: number;
  umbral?: number;
  velocidadMinima?: number;
}): "abrir" | "cerrar" {
  if (ancho <= 0) return "cerrar";
  // Un tirón claro gana sobre la distancia: es lo que el usuario acaba de pedir.
  if (velocidad <= -velocidadMinima) return "abrir";
  if (velocidad >= velocidadMinima) return "cerrar";
  return Math.abs(desplazamiento) >= ancho * umbral ? "abrir" : "cerrar";
}

/** Mantiene un valor dentro de un rango. */
export function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}
