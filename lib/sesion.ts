// Sesión del administrador: token firmado con HMAC (sin estado en servidor, válido en serverless).
// El token depende de ADMIN_SECRET_KEY: si la clave cambia, todas las sesiones dejan de valer.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_SESION = "kg_admin";
export const DURACION_SESION_MS = 12 * 60 * 60 * 1000;

function firmar(expiraMs: string, secreto: string): string {
  return createHmac("sha256", secreto).update(`kg-admin-session:${expiraMs}`).digest("base64url");
}

function iguales(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function crearToken(secreto: string, ahora: Date = new Date()): string {
  const expira = String(ahora.getTime() + DURACION_SESION_MS);
  return `${expira}.${firmar(expira, secreto)}`;
}

export function tokenValido(token: string | null | undefined, secreto: string, ahora: Date = new Date()): boolean {
  if (!token) return false;
  const punto = token.indexOf(".");
  if (punto <= 0) return false;
  const expira = token.slice(0, punto);
  const firma = token.slice(punto + 1);
  if (!iguales(firma, firmar(expira, secreto))) return false;
  const ms = Number(expira);
  return Number.isFinite(ms) && ms > ahora.getTime();
}

/** Compara dos claves sin filtrar su longitud ni su contenido por tiempo. */
export function claveCoincide(presentada: string, esperada: string): boolean {
  const a = createHash("sha256").update(presentada).digest();
  const b = createHash("sha256").update(esperada).digest();
  return timingSafeEqual(a, b) && presentada.length === esperada.length;
}
