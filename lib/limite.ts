// Límites de intentos en memoria. Son un freno de mejor esfuerzo: en serverless
// cada instancia cuenta por separado. La seguridad real depende de claves largas
// y aleatorias, de que el vencimiento se calcule en el servidor y de que las
// consultas estén parametrizadas.

import { huella } from "@/lib/sesion";

type Cubo = { n: number; reinicio: number };
const cubos = new Map<string, Cubo>();
const MAX_CUBOS = 5_000;

function cuboVigente(clave: string, ventanaMs: number, ahora: number): Cubo {
  let cubo = cubos.get(clave);
  if (!cubo || ahora >= cubo.reinicio) {
    if (cubos.size >= MAX_CUBOS) purgar(ahora);
    cubo = { n: 0, reinicio: ahora + ventanaMs };
    cubos.set(clave, cubo);
  }
  return cubo;
}

/** Tira los cubos vencidos; si aun así no cabe nada, vacía la tabla. */
function purgar(ahora: number): void {
  for (const [clave, cubo] of cubos) {
    if (ahora >= cubo.reinicio) cubos.delete(clave);
  }
  if (cubos.size >= MAX_CUBOS) cubos.clear();
}

/** Cuenta cada petición. Devuelve true si entra en el cupo (max por ventana). */
export function dentroDelCupo(clave: string, max: number, ventanaMs: number, ahora = Date.now()): boolean {
  const cubo = cuboVigente(clave, ventanaMs, ahora);
  cubo.n += 1;
  return cubo.n <= max;
}

/** ¿Ya agotó los intentos permitidos? No cuenta nada. */
export function fallosAgotados(clave: string, max: number, ahora = Date.now()): boolean {
  const cubo = cubos.get(clave);
  return !!cubo && ahora < cubo.reinicio && cubo.n >= max;
}

/** Anota un fallo (p. ej. clave incorrecta). */
export function registrarFallo(clave: string, ventanaMs: number, ahora = Date.now()): void {
  cuboVigente(clave, ventanaMs, ahora).n += 1;
}

/** Olvida los fallos de una clave tras un acceso correcto. */
export function olvidar(clave: string): void {
  cubos.delete(clave);
}

/**
 * Identificador del cliente que hizo la petición.
 *
 * `x-real-ip` lo fija Vercel y no se puede falsificar desde el navegador; si no
 * está, se usa la primera IP de `x-forwarded-for` (falsificable fuera de Vercel,
 * de ahí que el límite sea "mejor esfuerzo" y no una garantía).
 */
export function ipCliente(request: Request): string {
  const real = (request.headers.get("x-real-ip") ?? "").trim();
  const reenviada = request.headers.get("x-forwarded-for") ?? "";
  const primera = reenviada.split(",")[0]?.trim() ?? "";
  const ip = real || primera || "desconocida";
  return ip.replace(/^\[|\]$/g, "").slice(0, 64);
}

/** Clave de cubo derivada de un secreto, sin guardarlo en memoria en claro. */
export function cuboDeSecreto(prefijo: string, secreto: string): string {
  return `${prefijo}:${huella(secreto)}`;
}

/** Vuelve a empezar la ventana de una clave (útil al cambiar de configuración). */
export function reiniciarLimites(): void {
  cubos.clear();
}
