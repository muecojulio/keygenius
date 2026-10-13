// Datos de ejemplo ("precarga") para ver el panel funcionando. Son claves de prueba
// marcadas con "Demo" en el nombre; el administrador puede bloquearlas en cualquier momento.

export type EjemploLicencia = {
  nombre_app: string;
  clave: string;
  estado: "DISPONIBLE" | "ACTIVA";
  /** Días de uso ya consumidos al cargar la precarga (solo para ACTIVA). */
  diasActiva: number | null;
  dispositivo_id: string | null;
};

export const EJEMPLOS_LICENCIAS: EjemploLicencia[] = [
  { nombre_app: "Demo Atlas", clave: "APP-DEMO-ATLS-0001", estado: "DISPONIBLE", diasActiva: null, dispositivo_id: null },
  { nombre_app: "Demo Atlas", clave: "APP-DEMO-ATLS-0004", estado: "ACTIVA", diasActiva: 4, dispositivo_id: "demo-pc-04" },
  { nombre_app: "Demo Taller", clave: "APP-DEMO-TALL-0027", estado: "ACTIVA", diasActiva: 27, dispositivo_id: "demo-pc-27" },
  { nombre_app: "Demo Taller", clave: "APP-DEMO-TALL-0029", estado: "ACTIVA", diasActiva: 29, dispositivo_id: "demo-pc-29" },
  { nombre_app: "Demo Norte", clave: "APP-DEMO-NRTE-0010", estado: "ACTIVA", diasActiva: 10, dispositivo_id: "demo-pc-10" },
  // Ya pasaron 33 días: al consultar el panel (o validarla) pasa sola a BLOQUEADA.
  { nombre_app: "Demo Norte", clave: "APP-DEMO-NRTE-0033", estado: "ACTIVA", diasActiva: 33, dispositivo_id: "demo-pc-33" },
];

/** Casos rápidos para el probador del panel. */
export const CASOS_PRUEBA = [
  { etiqueta: "Primer uso", clave: "APP-DEMO-ATLS-0001", nombre_app: "Demo Atlas", dispositivo_id: "equipo-nuevo-01" },
  { etiqueta: "Día 27 (aviso)", clave: "APP-DEMO-TALL-0027", nombre_app: "Demo Taller", dispositivo_id: "demo-pc-27" },
  { etiqueta: "Otro equipo", clave: "APP-DEMO-TALL-0027", nombre_app: "Demo Taller", dispositivo_id: "otra-computadora" },
  { etiqueta: "Vencida (33 días)", clave: "APP-DEMO-NRTE-0033", nombre_app: "Demo Norte", dispositivo_id: "demo-pc-33" },
] as const;
