// ETag ligero para sondeos que se repiten (el panel revalida cada pocos
// segundos). Sin dependencias del servidor: se prueba con Vitest.

/**
 * Comprueba `If-None-Match` (una o varias etiquetas) contra la actual,
 * ignorando el prefijo débil `W/`.
 */
export function coincideEtag(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  if (ifNoneMatch.trim() === "*") return true;
  const esperado = quitarDebil(etag);
  return ifNoneMatch.split(",").some((candidato) => quitarDebil(candidato.trim()) === esperado);
}

/** ETag débil a partir del contenido: barato y suficiente para revalidar. */
export async function etagDe(valor: unknown): Promise<string> {
  const texto = JSON.stringify(valor);
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(texto));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `W/"${hex.slice(0, 20)}-${texto.length}"`;
}

/** Respuesta 304 sin cuerpo, para clientes que revalidan. */
export function sinCambios(etag: string): Response {
  return new Response(null, {
    status: 304,
    headers: { etag, "cache-control": "private, no-cache" },
  });
}

export function quitarDebil(etiqueta: string): string {
  return etiqueta.replace(/^W\//i, "");
}
