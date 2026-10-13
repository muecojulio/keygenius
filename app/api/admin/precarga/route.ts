import { esAdmin } from "@/lib/admin";
import { precargarEjemplos } from "@/lib/licencias-db";
import { json, respuestaError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Carga claves de ejemplo para ver el panel funcionando. Es seguro repetirla. */
export async function POST(request: Request) {
  try {
    if (!esAdmin(request)) return json({ error: "No autorizado." }, 401);
    const resultado = await precargarEjemplos();
    return json(resultado);
  } catch (err) {
    return respuestaError(err, "precarga POST");
  }
}
