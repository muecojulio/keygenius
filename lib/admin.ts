import "server-only";
import { ConfigError } from "@/lib/errores";
import { peticionDelMismoSitio } from "@/lib/seguridad";
import { COOKIE_SESION, claveCoincide, tokenValido } from "@/lib/sesion";

export const LONGITUD_MINIMA_CLAVE = 12;

/**
 * Clave que usa `npm run dev` cuando no hay ADMIN_SECRET_KEY (ver scripts/dev.mjs).
 * Es pública a propósito: solo sirve en desarrollo local.
 */
export const CLAVE_DESARROLLO = "dev-admin-clave-local-2026";

/**
 * Pista que se muestra en el formulario de acceso en desarrollo.
 *
 * Solo aparece si el servidor está usando la clave de desarrollo: una clave
 * personalizada (aunque sea en local) nunca se imprime en pantalla.
 */
export function pistaDesarrollo(): string | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  if (process.env.KG_DEV_HINT !== "1") return undefined;
  return process.env.ADMIN_SECRET_KEY?.trim() === CLAVE_DESARROLLO ? CLAVE_DESARROLLO : undefined;
}

/** ADMIN_SECRET_KEY: única credencial del administrador. Lanza ConfigError si falta o es débil. */
export function claveAdmin(): string {
  const clave = process.env.ADMIN_SECRET_KEY?.trim() ?? "";
  if (clave.length < LONGITUD_MINIMA_CLAVE) throw new ConfigError("ADMIN_SECRET_KEY");
  return clave;
}

export function claveAdminConfigurada(): boolean {
  try {
    claveAdmin();
    return true;
  } catch {
    return false;
  }
}

export function leerCookie(request: Request, nombre: string): string | null {
  const cabecera = request.headers.get("cookie");
  if (!cabecera) return null;
  for (const parte of cabecera.split(";")) {
    const igual = parte.indexOf("=");
    if (igual < 0) continue;
    if (parte.slice(0, igual).trim() === nombre) return parte.slice(igual + 1).trim();
  }
  return null;
}

/** Acepta `x-admin-key: <ADMIN_SECRET_KEY>` (scripts) o la sesión del panel (cookie). */
export function esAdmin(request: Request): boolean {
  const clave = claveAdmin();
  const cabeceraClave = request.headers.get("x-admin-key")?.trim();
  if (cabeceraClave) return claveCoincide(cabeceraClave, clave);
  return tokenValido(leerCookie(request, COOKIE_SESION), clave);
}

/**
 * Autoriza mutaciones hechas con cookie. Quien firma con `x-admin-key` no usa
 * cookie, así que no puede sufrir CSRF; el resto tiene que venir del mismo sitio.
 */
export function mutacionAutorizada(request: Request): boolean {
  if (request.headers.get("x-admin-key")?.trim()) return true;
  return peticionDelMismoSitio(request);
}

export function sesionAdminValida(valorCookie: string | null | undefined): boolean {
  try {
    return tokenValido(valorCookie, claveAdmin());
  } catch {
    return false;
  }
}

export const COOKIE_ADMIN = COOKIE_SESION;

/** Cookie de sesión: HttpOnly, SameSite=Strict y Secure en producción. */
export function cookieAdmin(valor: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_ADMIN}=${valor}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}
