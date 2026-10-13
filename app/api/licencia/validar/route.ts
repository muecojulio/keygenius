import { validacionLimite, validacionSolicitudInvalida } from "@/lib/licencias";
import { validarLicencia } from "@/lib/licencias-db";
import { json, leerJson, respuestaError } from "@/lib/http";
import { dentroDelCupo, ipCliente } from "@/lib/limite";
import { limpiarClave, limpiarDispositivo, limpiarNombreApp } from "@/lib/validaciones";

export const dynamic = "force-dynamic";

// Endpoint público pensado para que las aplicaciones de cliente lo consulten.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "600",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * Cuerpo: { "clave": "APP-XXXX-YYYY-ZZZZ", "nombre_app": "Mi App", "dispositivo_id": "equipo-123" }
 * Respuesta: { acceso, estado, diasTranscurridos, diasRestantesPara30, diasParaBloqueoTotal, aviso }
 */
export async function POST(request: Request) {
  try {
    if (!dentroDelCupo(`validar:${ipCliente(request)}`, 60, 60_000)) {
      return json(validacionLimite(), 429, CORS);
    }
    const body = await leerJson(request);
    const clave = limpiarClave(body.clave);
    const nombre = limpiarNombreApp(body.nombre_app);
    const dispositivo = limpiarDispositivo(body.dispositivo_id);
    if (!clave || !nombre || !dispositivo) {
      return json(validacionSolicitudInvalida(), 400, CORS);
    }
    const { validacion } = await validarLicencia({
      clave,
      nombre_app: nombre,
      dispositivo_id: dispositivo,
    });
    return json(validacion, 200, CORS);
  } catch (err) {
    return respuestaError(err, "validar POST", CORS);
  }
}
