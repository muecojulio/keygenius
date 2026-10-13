import { esAdmin } from "@/lib/admin";
import { bloquearLicencia } from "@/lib/licencias-db";
import { json, leerJson, respuestaError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Revoca una clave a mano. Cuerpo: { "id": 12 } */
export async function POST(request: Request) {
  try {
    if (!esAdmin(request)) return json({ error: "No autorizado." }, 401);
    const body = await leerJson(request);
    const id = typeof body.id === "number" ? body.id : Number(body.id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "Licencia no válida." }, 400);
    const licencia = await bloquearLicencia(id);
    if (!licencia) return json({ error: "No se encontró esa licencia." }, 404);
    return json({ licencia });
  } catch (err) {
    return respuestaError(err, "bloquear POST");
  }
}
