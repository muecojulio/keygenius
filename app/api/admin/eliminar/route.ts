import { esAdmin, mutacionAutorizada } from "@/lib/admin";
import { json, leerJson, respuestaError } from "@/lib/http";
import { eliminarLicencia } from "@/lib/licencias-db";
import { dentroDelCupo, ipCliente } from "@/lib/limite";
import { limpiarIdLicencia } from "@/lib/validaciones";

export const dynamic = "force-dynamic";

const MAX_POR_MINUTO = 60;

/**
 * Borra una clave de forma definitiva. Cuerpo: { "id": 12 }
 *
 * A diferencia del bloqueo —que conserva la licencia y su histórico—, esto
 * elimina la fila: la clave deja de existir y la validación responde
 * `NO_EXISTE`. Por eso pasa por los mismos controles que el resto de
 * mutaciones (sesión, mismo sitio y cupo por cliente).
 */
export async function POST(request: Request) {
  try {
    if (!esAdmin(request)) return json({ error: "No autorizado." }, 401);
    if (!mutacionAutorizada(request)) return json({ error: "Origen no permitido." }, 403);
    if (!dentroDelCupo(`eliminar:${ipCliente(request)}`, MAX_POR_MINUTO, 60_000)) {
      return json({ error: "Demasiadas solicitudes. Espera un momento." }, 429, { "retry-after": "60" });
    }

    const body = await leerJson(request);
    const id = limpiarIdLicencia(body.id);
    if (id === null) return json({ error: "Licencia no válida." }, 400);

    const licencia = await eliminarLicencia(id);
    if (!licencia) return json({ error: "No se encontró esa licencia." }, 404);
    return json({ licencia });
  } catch (err) {
    return respuestaError(err, "eliminar POST");
  }
}
