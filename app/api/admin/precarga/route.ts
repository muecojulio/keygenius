import { esAdmin, mutacionAutorizada } from "@/lib/admin";
import { json, respuestaError } from "@/lib/http";
import { precargarEjemplos } from "@/lib/licencias-db";
import { dentroDelCupo, ipCliente } from "@/lib/limite";

export const dynamic = "force-dynamic";

const MAX_POR_MINUTO = 6;

/** Carga claves de ejemplo para ver el panel funcionando. Es seguro repetirla. */
export async function POST(request: Request) {
  try {
    if (!esAdmin(request)) return json({ error: "No autorizado." }, 401);
    if (!mutacionAutorizada(request)) return json({ error: "Origen no permitido." }, 403);
    if (!dentroDelCupo(`precarga:${ipCliente(request)}`, MAX_POR_MINUTO, 60_000)) {
      return json({ error: "Demasiadas solicitudes. Espera un momento." }, 429, { "retry-after": "60" });
    }
    const resultado = await precargarEjemplos();
    return json(resultado);
  } catch (err) {
    return respuestaError(err, "precarga POST");
  }
}
