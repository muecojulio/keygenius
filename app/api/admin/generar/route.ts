import { esAdmin } from "@/lib/admin";
import { generarLicencias } from "@/lib/licencias-db";
import { json, leerJson, respuestaError } from "@/lib/http";
import { limpiarCantidad, limpiarNombreApp } from "@/lib/validaciones";

export const dynamic = "force-dynamic";

/**
 * Genera claves nuevas en estado DISPONIBLE.
 * Cuerpo: { "nombre_app": "Mi App", "cantidad": 1 }  (cantidad opcional, 1-10)
 * Autorización: encabezado `x-admin-key: <ADMIN_SECRET_KEY>` o sesión del panel.
 */
export async function POST(request: Request) {
  try {
    if (!esAdmin(request)) return json({ error: "No autorizado." }, 401);
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
