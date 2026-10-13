// Reglas de negocio de las licencias. Funciones puras: sin base de datos ni reloj propio
// (el "ahora" siempre se pasa por parámetro), así se prueban de forma determinista.

import type { Estado, Validacion } from "@/lib/tipos";

export const DIA_MS = 86_400_000;
/** Duración de la licencia desde la activación (días naturales). */
export const DIAS_LICENCIA = 32;
/** Hito de referencia para los avisos. */
export const DIA_META = 30;
/** Día 27: faltan 3 días para llegar a 30. */
export const DIA_AVISO_TEMPRANO = 27;
/** Día 29: falta 1 día para llegar a 30. */
export const DIA_AVISO_FINAL = 29;

export const CLAVE_REGEX = /^APP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export const MSG_OTRO_EQUIPO = "Esta clave ya está vinculada a otra computadora";
export const MSG_REVOCADA = "Esta clave fue bloqueada por el administrador.";
export const MSG_VENCIDA = "Pasaron más de 32 días desde la activación. La licencia quedó bloqueada.";
export const MSG_NO_EXISTE = "Clave no encontrada para esta aplicación.";

/** Campos mínimos que necesitan las reglas (la fila completa de la base de datos la contiene). */
export type LicenciaRegla = {
  estado: Estado;
  dispositivo_id: string | null;
  fecha_activacion: Date | null;
  fecha_expiracion: Date | null;
};

export type Medicion = {
  activada: boolean;
  /** Días completos transcurridos desde la activación (0 si no está activada). */
  dias: number;
  /** Fecha de vencimiento efectiva (la guardada o activación + 32 días). */
  expiracion: Date | null;
  /** true cuando el ahora alcanzó la fecha de vencimiento. */
  vencida: boolean;
  diasRestantesPara30: number;
  diasParaBloqueoTotal: number;
};

/** Fechas que se guardan en el primer uso: activación = ahora, vencimiento = +32 días naturales. */
export function fechasActivacion(ahora: Date): { activacion: Date; expiracion: Date } {
  return {
    activacion: new Date(ahora.getTime()),
    expiracion: new Date(ahora.getTime() + DIAS_LICENCIA * DIA_MS),
  };
}

export function diasEntre(desde: Date, hasta: Date): number {
  return Math.max(0, Math.floor((hasta.getTime() - desde.getTime()) / DIA_MS));
}

export function medirLicencia(lic: LicenciaRegla, ahora: Date): Medicion {
  const activada = lic.fecha_activacion !== null;
  if (!lic.fecha_activacion) {
    return {
      activada: false,
      dias: 0,
      expiracion: null,
      vencida: false,
      diasRestantesPara30: DIA_META,
      diasParaBloqueoTotal: DIAS_LICENCIA,
    };
  }
  const expiracion = lic.fecha_expiracion ?? fechasActivacion(lic.fecha_activacion).expiracion;
  const dias = diasEntre(lic.fecha_activacion, ahora);
  const vencida = ahora.getTime() >= expiracion.getTime();
  // Una licencia bloqueada (a mano o por vencimiento) ya no tiene días por delante.
  const bloqueada = lic.estado === "BLOQUEADA" || vencida;
  return {
    activada,
    dias,
    expiracion,
    vencida,
    diasRestantesPara30: bloqueada ? 0 : Math.max(0, DIA_META - dias),
    diasParaBloqueoTotal: bloqueada ? 0 : Math.max(0, DIAS_LICENCIA - dias),
  };
}

/** Aviso según el día de uso, o null si no toca avisar. */
export function avisoPorDia(dias: number): string | null {
  if (dias === DIA_AVISO_TEMPRANO) return "Día 27: faltan 3 días para llegar a 30.";
  if (dias === DIA_AVISO_FINAL) return "Día 29: falta 1 día para llegar a 30.";
  return null;
}

/**
 * Decide el acceso de un equipo a una licencia YA evaluada por la base de datos
 * (el primer uso y el vencimiento se aplican antes, en `lib/licencias-db.ts`).
 */
export function evaluarAcceso(lic: LicenciaRegla, dispositivo: string, ahora: Date): Validacion {
  const m = medirLicencia(lic, ahora);
  const base = {
    diasTranscurridos: m.dias,
    diasRestantesPara30: m.diasRestantesPara30,
    diasParaBloqueoTotal: m.diasParaBloqueoTotal,
  };

  if (lic.estado === "DISPONIBLE") {
    return { acceso: false, estado: "DISPONIBLE", ...base, aviso: "La clave aún no se ha activado." };
  }
  if (m.vencida) {
    return { acceso: false, estado: "BLOQUEADA", ...base, aviso: MSG_VENCIDA };
  }
  if (lic.estado === "BLOQUEADA") {
    return { acceso: false, estado: "BLOQUEADA", ...base, aviso: MSG_REVOCADA };
  }
  if (lic.dispositivo_id !== dispositivo) {
    return { acceso: false, estado: "ACTIVA", ...base, aviso: MSG_OTRO_EQUIPO };
  }
  return { acceso: true, estado: "ACTIVA", ...base, aviso: avisoPorDia(m.dias) };
}

/** Aviso para la vista de administración (sin depender de un equipo concreto). */
export function avisoVista(lic: LicenciaRegla, ahora: Date): string | null {
  if (lic.estado === "DISPONIBLE") return null;
  const m = medirLicencia(lic, ahora);
  if (m.vencida) return MSG_VENCIDA;
  if (lic.estado === "BLOQUEADA") return MSG_REVOCADA;
  return avisoPorDia(m.dias);
}

/** Respuesta cuando el mismo cliente supera el límite de consultas (429). */
export function validacionLimite(): Validacion {
  return {
    acceso: false,
    estado: "SOLICITUD_INVALIDA",
    diasTranscurridos: 0,
    diasRestantesPara30: 0,
    diasParaBloqueoTotal: 0,
    aviso: "Demasiadas consultas. Espera un momento y vuelve a intentar.",
  };
}

/** Respuesta cuando la petición no trae datos válidos (400). */
export function validacionSolicitudInvalida(): Validacion {
  return {
    acceso: false,
    estado: "SOLICITUD_INVALIDA",
    diasTranscurridos: 0,
    diasRestantesPara30: 0,
    diasParaBloqueoTotal: 0,
    aviso: "Indica clave, nombre_app y dispositivo_id válidos.",
  };
}

/** Respuesta cuando la clave no existe para esa aplicación. */
export function validacionNoExiste(aviso: string = MSG_NO_EXISTE): Validacion {
  return {
    acceso: false,
    estado: "NO_EXISTE",
    diasTranscurridos: 0,
    diasRestantesPara30: 0,
    diasParaBloqueoTotal: 0,
    aviso,
  };
}
