import { json, leerJson, respuestaError } from "@/lib/http";
import { CORS_VALIDAR } from "@/lib/cors";
import { validacionLimite, validacionSolicitudInvalida } from "@/lib/licencias";
import { validarLicencia } from "@/lib/licencias-db";
import { cuboDeSecreto, dentroDelCupo, ipCliente } from "@/lib/limite";
import { limpiarClave, limpiarDispositivo, limpiarNombreApp } from "@/lib/validaciones";

export const dynamic = "force-dynamic";

// Endpoint público pensado para que las aplicaciones de cliente lo consulten.
// Dos cupos por ventana: por cliente (abuso desde una IP) y por clave (frenar el
// sondeo de claves desde muchas IPs). La respuesta nunca se cachea.
const MAX_POR_CLIENTE = 60;
const MAX_POR_CLAVE = 20;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_VALIDAR });
}

/**
 * Cuerpo: { "clave": "APP-XXXX-YYYY-ZZZZ", "nombre_app": "Mi App", "dispositivo_id": "equipo-123" }
 * Respuesta: { acceso, estado, diasTranscurridos, diasRestantesPara30, diasParaBloqueoTotal, aviso }
 */
export async function POST(request: Request) {
  try {
    if (!dentroDelCupo(`validar:${ipCliente(request)}`, MAX_POR_CLIENTE, 60_000)) {
      return json(validacionLimite(), 429, CORS_VALIDAR);
    }

    const body = await leerJson(request);
    const clave = limpiarClave(body.clave);
    const nombre = limpiarNombreApp(body.nombre_app);
    const dispositivo = limpiarDispositivo(body.dispositivo_id);
    if (!clave || !nombre || !dispositivo) {
      return json(validacionSolicitudInvalida(), 400, CORS_VALIDAR);
    }

    if (!dentroDelCupo(cuboDeSecreto("validar-clave", clave), MAX_POR_CLAVE, 60_000)) {
      return json(validacionLimite(), 429, CORS_VALIDAR);
    }

    const { validacion } = await validarLicencia({
      clave,
      nombre_app: nombre,
      dispositivo_id: dispositivo,
    });
    return json(validacion, 200, CORS_VALIDAR);
  } catch (err) {
    return respuestaError(err, "validar POST", CORS_VALIDAR);
  }
}
