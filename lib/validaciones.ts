// Limpieza y validación de entradas. Funciones puras.

import { CLAVE_REGEX } from "@/lib/licencias";

/** Nombre de aplicación: 2 a 80 caracteres, espacios colapsados, sin caracteres de control. */
export function limpiarNombreApp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const nombre = value.trim().replace(/\s+/g, " ");
  if (nombre.length < 2 || nombre.length > 80) return null;
  if (/[\u0000-\u001F\u007F]/.test(nombre)) return null;
  return nombre;
}

/** Clave con formato APP-XXXX-YYYY-ZZZZ (se normaliza a mayúsculas). */
export function limpiarClave(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clave = value.trim().toUpperCase();
  return CLAVE_REGEX.test(clave) ? clave : null;
}

/** Identificador del equipo: 4 a 128 caracteres, sin caracteres de control. */
export function limpiarDispositivo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (id.length < 4 || id.length > 128) return null;
  if (/[\u0000-\u001F\u007F]/.test(id)) return null;
  return id;
}

/** Cantidad de claves a generar: entero entre 1 y 10. */
export function limpiarCantidad(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return 1;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 10) return null;
  return n;
}
