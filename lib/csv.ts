// Exportación a CSV. Función pura: se prueba sin navegador y se usa con
// `descargarArchivo` desde el panel.

export type ColumnaCsv<T> = {
  titulo: string;
  valor: (fila: T) => string | number | null | undefined;
};

/** Escapa un campo según RFC 4180: comillas dobles y saltos de línea. */
export function escaparCampoCsv(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return /[",;\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * Genera un CSV con encabezado. Se usa punto y coma como separador para que
 * Excel en español no parta las columnas por la coma decimal, y `\r\n` como fin
 * de línea (lo que espera Excel).
 */
export function aCsv<T>(filas: readonly T[], columnas: readonly ColumnaCsv<T>[]): string {
  const encabezado = columnas.map((c) => escaparCampoCsv(c.titulo)).join(";");
  const cuerpo = filas.map((fila) => columnas.map((c) => escaparCampoCsv(c.valor(fila))).join(";"));
  return [encabezado, ...cuerpo].join("\r\n");
}
