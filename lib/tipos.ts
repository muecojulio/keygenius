// Tipos compartidos entre servidor y cliente. No importar nada del servidor aquí.

export const ESTADOS = ["DISPONIBLE", "ACTIVA", "BLOQUEADA"] as const;
export type Estado = (typeof ESTADOS)[number];

/** Respuesta de `POST /api/licencia/validar`. */
export type Validacion = {
  acceso: boolean;
  estado: Estado | "NO_EXISTE" | "SOLICITUD_INVALIDA";
  diasTranscurridos: number;
  diasRestantesPara30: number;
  diasParaBloqueoTotal: number;
  aviso: string | null;
};

/** Fila de licencia tal como la ve el panel de administración. */
export type LicenciaVista = {
  id: number;
  nombre_app: string;
  clave: string;
  dispositivo_id: string | null;
  estado: Estado;
  fecha_creacion: string;
  fecha_activacion: string | null;
  fecha_expiracion: string | null;
  /** Días completos desde la activación. `null` si aún no se ha activado. */
  diasActiva: number | null;
  /** Días que faltan para el bloqueo total (32). `null` si aún no se ha activado. */
  diasRestantes: number | null;
  /** Días que faltan para llegar a 30 (hito de aviso). `null` si aún no se ha activado. */
  diasRestantesPara30: number | null;
  aviso: string | null;
};

export type ResumenLicencias = {
  total: number;
  disponibles: number;
  activas: number;
  bloqueadas: number;
  porVencer: number;
};
