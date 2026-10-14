// Sesión del administrador: token firmado con HMAC (sin estado en servidor,
// válido en serverless). El token depende de ADMIN_SECRET_KEY: si la clave
// cambia, todas las sesiones dejan de valer.
//
// Formato: `expiraEnMs.nonce.hmac`, donde `nonce` es aleatorio para que dos
// sesiones iniciadas en el mismo instante nunca compartan token. Se aceptan
// tokens antiguos (`expiraEnMs.hmac`) hasta que vencen, para no cerrar sesiones
// al desplegar esta versión.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const COOKIE_SESION = "kg_admin";
export const DURACION_SESION_MS = 12 * 60 * 60 * 1000;
/** `expiraEnMs.nonce` — ambas partes quedan firmadas. */
const PREFIJO = "kg-admin-session:";

function firmar(carga: string, secreto: string): string {
  return createHmac("sha256", secreto).update(`${PREFIJO}${carga}`).digest("base64url");
}

function iguales(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function crearToken(secreto: string, ahora: Date = new Date(), nonce = randomBytes(12).toString("base64url")): string {
  const carga = `${ahora.getTime() + DURACION_SESION_MS}.${nonce}`;
  return `${carga}.${firmar(carga, secreto)}`;
}

export function tokenValido(token: string | null | undefined, secreto: string, ahora: Date = new Date()): boolean {
  if (!token) return false;
  const corte = token.lastIndexOf(".");
  if (corte <= 0) return false;

  const carga = token.slice(0, corte);
  const firma = token.slice(corte + 1);
  if (!firma || !carga) return false;
  if (!iguales(firma, firmar(carga, secreto))) return false;

  const expira = Number(carga.split(".")[0]);
  return Number.isFinite(expira) && expira > ahora.getTime();
}

/** Compara dos claves sin filtrar su longitud ni su contenido por tiempo. */
export function claveCoincide(presentada: string, esperada: string): boolean {
  const a = createHash("sha256").update(presentada).digest();
  const b = createHash("sha256").update(esperada).digest();
  return timingSafeEqual(a, b) && presentada.length === esperada.length;
}

/** Huella estable de un valor secreto, para usarlo como clave de límites. */
export function huella(valor: string): string {
  return createHash("sha256").update(valor).digest("hex").slice(0, 32);
}
