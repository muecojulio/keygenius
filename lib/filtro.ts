// Búsqueda insensible a mayúsculas y acentos, y navegación por listas.
// Funciones puras: las usan el buscador de licencias y el combobox.

/**
 * Normaliza un texto para comparar: sin acentos, en minúsculas y sin espacios
 * sobrantes. `Aplicación Ágil` y `aplicacion agil` coinciden.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** ¿El texto contiene la consulta (ignorando acentos y mayúsculas)? */
export function coincide(texto: string, consulta: string): boolean {
  const q = normalizar(consulta);
  return q === "" || normalizar(texto).includes(q);
}

/**
 * Filtra `elementos` conservando el orden original. `campos` extrae los textos
 * que participan en la búsqueda (nombre, clave, equipo, estado…).
 */
export function filtrar<T>(elementos: readonly T[], consulta: string, campos: (elemento: T) => string[]): T[] {
  const q = normalizar(consulta);
  if (!q) return [...elementos];
  return elementos.filter((elemento) => campos(elemento).some((campo) => normalizar(campo).includes(q)));
}

/** Ordena de forma estable por texto normalizado (para listas de aplicaciones). */
export function ordenarPorTexto(textos: readonly string[]): string[] {
  return [...textos].sort((a, b) => normalizar(a).localeCompare(normalizar(b), "es"));
}

export type OpcionesNavegacion = {
  /** Número de opciones disponibles. */
  total: number;
  /** Índice activo actual (`-1` si no hay ninguno). */
  activo: number;
  /** Índice elegido o `null` si la tecla no mueve la selección. */
  indice: number | null;
};

/**
 * Traduce una tecla a un movimiento dentro de una lista de opciones.
 * Devuelve `null` cuando la tecla no cambia la opción activa (se deja al
 * navegador o al formulario).
 */
export function moverOpciones(tecla: string, { total, activo }: Omit<OpcionesNavegacion, "indice">): number | null {
  if (total <= 0) return null;
  switch (tecla) {
    case "ArrowDown":
      return activo < 0 ? 0 : (activo + 1) % total;
    case "ArrowUp":
      return activo < 0 ? total - 1 : (activo - 1 + total) % total;
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return null;
  }
}
