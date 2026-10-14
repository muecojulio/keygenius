// Formato de presentación. Funciones puras: se usan en servidor y en cliente.

const FECHA_CORTA = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const HORA = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const NUMERO = new Intl.NumberFormat("es-MX");

/** Fecha larga corta: `14 oct 2026`. Devuelve `—` si no hay fecha válida. */
export function formatearFecha(iso: string | null | undefined): string {
  const fecha = aFecha(iso);
  return fecha ? FECHA_CORTA.format(fecha) : "—";
}

/** Hora local con segundos: `14:07:23`. */
export function formatearHora(fecha: Date | number = new Date()): string {
  return HORA.format(fecha);
}

/** Número con separadores de miles según la configuración local. */
export function formatearNumero(valor: number): string {
  return NUMERO.format(valor);
}

/** `1 día` / `3 días`, sin duplicar la lógica de plurales en cada vista. */
export function pluralizar(cantidad: number, singular: string, plural = `${singular}s`): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

function aFecha(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}
