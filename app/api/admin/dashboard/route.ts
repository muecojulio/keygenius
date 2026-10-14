import { esAdmin } from "@/lib/admin";
import { coincideEtag, etagDe, sinCambios } from "@/lib/etag";
import { json, respuestaError } from "@/lib/http";
import { DIA_AVISO_TEMPRANO } from "@/lib/licencias";
import { listarLicencias } from "@/lib/licencias-db";
import type { ResumenLicencias } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/**
 * Todas las licencias con días consumidos y días restantes.
 *
 * El panel revalida cada pocos segundos: se devuelve `ETag` calculado sobre los
 * datos (no sobre la hora) para que un sondeo sin cambios responda `304` con
 * cero cuerpo, y `x-kg-cache` para poder observar si sirvió la caché en memoria.
 */
export async function GET(request: Request) {
  try {
    if (!esAdmin(request)) return json({ error: "No autorizado." }, 401);

    const { licencias, generadoEn, deCache } = await listarLicencias();
    const resumen: ResumenLicencias = {
      total: licencias.length,
      disponibles: licencias.filter((l) => l.estado === "DISPONIBLE").length,
      activas: licencias.filter((l) => l.estado === "ACTIVA").length,
      bloqueadas: licencias.filter((l) => l.estado === "BLOQUEADA").length,
      porVencer: licencias.filter(
        (l) => l.estado === "ACTIVA" && l.diasActiva !== null && l.diasActiva >= DIA_AVISO_TEMPRANO,
      ).length,
    };

    const etag = await etagDe({ licencias, resumen });
    if (coincideEtag(request.headers.get("if-none-match"), etag)) return sinCambios(etag);

    return json({ licencias, resumen, generadoEn }, 200, {
      etag,
      "cache-control": "private, no-cache",
      "x-kg-cache": deCache ? "hit" : "miss",
    });
  } catch (err) {
    return respuestaError(err, "dashboard GET");
  }
}
