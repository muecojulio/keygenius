import { esAdmin, mutacionAutorizada } from "@/lib/admin";
import { json, leerJson, respuestaError } from "@/lib/http";
import { generarLicencias } from "@/lib/licencias-db";
import { dentroDelCupo, ipCliente } from "@/lib/limite";
import { limpiarCantidad, limpiarNombreApp } from "@/lib/validaciones";

export const dynamic = "force-dynamic";

const MAX_POR_MINUTO = 30;

/**
 * Genera claves nuevas en estado DISPONIBLE.
 * Cuerpo: { "nombre_app": "Mi App", "cantidad": 1 }  (cantidad opcional, 1-10)
 * Autorización: encabezado `x-admin-key: <ADMIN_SECRET_KEY>` o sesión del panel.
 */
export async function POST(request: Request) {
  try {
    if (!esAdmin(request)) return json({ error: "No autorizado." }, 401);
    if (!mutacionAutorizada(request)) return json({ error: "Origen no permitido." }, 403);
    if (!dentroDelCupo(`generar:${ipCliente(request)}`, MAX_POR_MINUTO, 60_000)) {
      return json({ error: "Demasiadas solicitudes. Espera un momento." }, 429, { "retry-after": "60" });
    }

    const body = await leerJson(request);
    const nombre = limpiarNombreApp(body.nombre_app);
    if (!nombre) {
      return json({ error: "Escribe un nombre de aplicación de 2 a 80 caracteres." }, 400);
    }
    const cantidad = limpiarCantidad(body.cantidad);
    if (!cantidad) return json({ error: "La cantidad debe ser un número entre 1 y 10." }, 400);

    const creadas = await generarLicencias(nombre, cantidad);
    return json(
      {
        clave: creadas[0]?.clave ?? null,
        licencias: creadas.map((l) => ({
          id: l.id,
          nombre_app: l.nombre_app,
          clave: l.clave,
          estado: "DISPONIBLE",
        })),
      },
      201,
    );
  } catch (err) {
    return respuestaError(err, "generar POST");
  }
}
