import { esAdmin, mutacionAutorizada } from "@/lib/admin";
import { json, leerJson, respuestaError } from "@/lib/http";
import { bloquearLicencia } from "@/lib/licencias-db";
import { dentroDelCupo, ipCliente } from "@/lib/limite";
import { limpiarIdLicencia } from "@/lib/validaciones";

export const dynamic = "force-dynamic";

const MAX_POR_MINUTO = 60;

/** Revoca una clave a mano. Cuerpo: { "id": 12 } */
export async function POST(request: Request) {
  try {
    if (!esAdmin(request)) return json({ error: "No autorizado." }, 401);
    if (!mutacionAutorizada(request)) return json({ error: "Origen no permitido." }, 403);
    if (!dentroDelCupo(`bloquear:${ipCliente(request)}`, MAX_POR_MINUTO, 60_000)) {
      return json({ error: "Demasiadas solicitudes. Espera un momento." }, 429, { "retry-after": "60" });
    }

    const body = await leerJson(request);
    const id = limpiarIdLicencia(body.id);
    if (id === null) return json({ error: "Licencia no válida." }, 400);

    const licencia = await bloquearLicencia(id);
    if (!licencia) return json({ error: "No se encontró esa licencia." }, 404);
    return json({ licencia });
  } catch (err) {
    return respuestaError(err, "bloquear POST");
  }
}
