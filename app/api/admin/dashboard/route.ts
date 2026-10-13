import { esAdmin } from "@/lib/admin";
import { DIA_AVISO_TEMPRANO } from "@/lib/licencias";
import { listarLicencias } from "@/lib/licencias-db";
import { json, respuestaError } from "@/lib/http";
import type { ResumenLicencias } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Todas las licencias con días consumidos y días restantes. */
export async function GET(request: Request) {
  try {
    if (!esAdmin(request)) return json({ error: "No autorizado." }, 401);
    const licencias = await listarLicencias();
    const resumen: ResumenLicencias = {
      total: licencias.length,
      disponibles: licencias.filter((l) => l.estado === "DISPONIBLE").length,
      activas: licencias.filter((l) => l.estado === "ACTIVA").length,
      bloqueadas: licencias.filter((l) => l.estado === "BLOQUEADA").length,
      porVencer: licencias.filter(
        (l) => l.estado === "ACTIVA" && l.diasActiva !== null && l.diasActiva >= DIA_AVISO_TEMPRANO,
      ).length,
    };
    return json({ licencias, resumen, generadoEn: new Date().toISOString() });
  } catch (err) {
    return respuestaError(err, "dashboard GET");
  }
}
