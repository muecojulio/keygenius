// Reglas de seguridad de las peticiones HTTP. Funciones puras sobre `Request`:
// se prueban sin servidor y se aplican en todas las rutas que mutan datos.
//
// Motivo: la sesión del panel viaja en una cookie. `SameSite=Strict` ya frena el
// CSRF clásico, pero se añade una segunda barrera explícita (Fetch Metadata y
// comprobación de origen) para no depender de un único mecanismo.

/**
 * ¿La petición viene del mismo sitio?
 *
 * - `Sec-Fetch-Site` (Fetch Metadata) es la señal más fiable en navegadores
 *   modernos: se acepta `same-origin` y `none` (navegación directa).
 * - Si no está, se compara `Origin` con el anfitrión real de la petición.
 * - Si no hay ninguna de las dos cabeceras, quien llama no es un navegador
 *   (script, cURL, app de escritorio): no hay CSRF posible.
 */
export function peticionDelMismoSitio(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";

  const origen = request.headers.get("origin");
  if (!origen) return true;

  let anfitrionOrigen: string;
  try {
    anfitrionOrigen = new URL(origen).host;
  } catch {
    return false;
  }
  return anfitrionOrigen.toLowerCase() === anfitrionPeticion(request).toLowerCase();
}

/** Anfitrión real de la petición, respetando los proxies de Vercel. */
export function anfitrionPeticion(request: Request): string {
  const cabeceras = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const reenviado = (cabeceras.split(",")[0] ?? "").trim();
  if (reenviado) return reenviado;
  // Algunos clientes HTTP no envían `Host`: se usa el de la URL absoluta.
  try {
    return new URL(request.url).host;
  } catch {
    return "";
  }
}
