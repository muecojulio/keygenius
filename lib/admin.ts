import "server-only";
import { ConfigError } from "@/lib/errores";
import { COOKIE_SESION, claveCoincide, tokenValido } from "@/lib/sesion";

export const LONGITUD_MINIMA_CLAVE = 12;

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
