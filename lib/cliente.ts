"use client";

// Utilidades de cliente compartidas por las vistas del panel.

export type RespuestaJson<T> = {
  ok: boolean;
  status: number;
  body: T & { error?: string };
};

/**
 * Petición JSON con revalidación.
 *
 * - `no-cache` deja que el navegador guarde la respuesta y la revalide con el
 *   `ETag` del servidor: los sondeos sin cambios se resuelven con un 304 sin
 *   cuerpo (la caché del panel hace el resto).
 * - Un 401 se propaga tal cual para que la vista pueda refrescar la sesión.
 */
export async function pedirJson<T>(url: string, init?: RequestInit): Promise<RespuestaJson<T>> {
  const res = await fetch(url, {
    cache: "no-cache",
    credentials: "same-origin",
    ...init,
    headers: { accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 304) return { ok: true, status: 304, body: {} as T & { error?: string } };
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, status: res.status, body };
}

/** Copia al portapapeles con degradación a `execCommand` (navegadores antiguos/webviews). */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Se intenta el plan B.
  }
  try {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Descarga un archivo generado en el navegador (sin tocar el servidor). */
export function descargarArchivo(nombre: string, contenido: string, tipo = "text/csv;charset=utf-8"): void {
  const blob = new Blob([`\uFEFF${contenido}`], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
