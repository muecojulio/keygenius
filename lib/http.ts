import "server-only";
import { ConfigError, HttpError } from "@/lib/errores";

export const LIMITE_CUERPO = 12_000;

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store, max-age=0", ...headers },
  });
}

/**
 * Lee un cuerpo JSON como objeto.
 *
 * Endurecido: límite de tamaño (cabecera declarada y contenido real), tipo de
 * contenido obligatorio cuando hay cuerpo (un formulario HTML no puede enviar
 * `application/json`) y nada de arrays o escalares sueltos.
 */
export async function leerJson(request: Request): Promise<Record<string, unknown>> {
  const declarado = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declarado) && declarado > LIMITE_CUERPO) {
    throw new HttpError(413, "La solicitud es demasiado grande.");
  }

  const texto = await request.text();
  if (!texto.trim()) return {};
  if (texto.length > LIMITE_CUERPO) throw new HttpError(413, "La solicitud es demasiado grande.");

  const tipo = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!tipo.includes("application/json")) {
    throw new HttpError(415, "El cuerpo debe enviarse como application/json.");
  }

  let valor: unknown;
  try {
    valor = JSON.parse(texto);
  } catch {
    throw new HttpError(400, "JSON no válido.");
  }
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    throw new HttpError(400, "El cuerpo debe ser un objeto JSON.");
  }
  return valor as Record<string, unknown>;
}

/**
 * Convierte cualquier error en respuesta. Nunca devuelve detalles internos ni
 * valores de variables de entorno; solo registra en el servidor lo necesario
 * para depurar.
 */
export function respuestaError(err: unknown, contexto: string, cabeceras?: Record<string, string>): Response {
  if (err instanceof HttpError) return json({ error: err.message }, err.status, cabeceras);
  if (err instanceof ConfigError) {
    console.error(`[keygenius] ${contexto}: ${err.message}`);
    return json(
      { error: "Configuración incompleta del servidor. Revisa ADMIN_SECRET_KEY y POSTGRES_URL en Vercel." },
      500,
      cabeceras,
    );
  }
  const detalle = err instanceof Error ? err.message : "error desconocido";
  const codigo = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
  console.error(`[keygenius] ${contexto}: ${detalle}${codigo ? ` (código ${codigo})` : ""}`);
  return json({ error: "No se pudo completar la operación." }, 500, cabeceras);
}
