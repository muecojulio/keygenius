import type { ReactNode } from "react";

// Iconos en línea (trazo, 24×24, `currentColor`): sin dependencias, sin
// peticiones extra y escalables con utilidades de Tailwind.
//
// Son decorativos por defecto (`aria-hidden`): el texto o la etiqueta accesible
// del control transmite el significado.

export type NombreIcono =
  | "llave"
  | "copiar"
  | "check"
  | "alerta"
  | "error"
  | "info"
  | "bloquear"
  | "reloj"
  | "refrescar"
  | "salir"
  | "buscar"
  | "cerrar"
  | "abajo"
  | "derecha"
  | "izquierda"
  | "rayo"
  | "escudo"
  | "barras"
  | "documento"
  | "descargar"
  | "girar"
  | "chispa"
  | "ajustes"
  | "ojo"
  | "ojo-tachado"
  | "equipo"
  | "mas"
  | "menos";

const TRAZOS: Record<NombreIcono, ReactNode> = {
  llave: (
    <>
      <path d="M21 2.5 18.5 5" />
      <path d="M13.4 9.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8Z" />
      <path d="M13.4 9.6 16 7" />
      <path d="m16 7 2.5 2.5L21 7l-2.5-2.5" />
      <path d="m16 7 3.5-3.5" />
    </>
  ),
  copiar: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M6 15H5.5A2.5 2.5 0 0 1 3 12.5v-7A2.5 2.5 0 0 1 5.5 3h7A2.5 2.5 0 0 1 15 5.5V6" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  alerta: (
    <>
      <path d="M12 3.5 21 19.5H3L12 3.5Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2h.01" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6m0-6-6 6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.8h.01" />
    </>
  ),
  bloquear: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2.5" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  refrescar: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 6" />
      <path d="M20 5v6h-6" />
    </>
  ),
  salir: (
    <>
      <path d="M9.5 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.5" />
      <path d="m16 8 4 4-4 4" />
      <path d="M20 12H9" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </>
  ),
  cerrar: <path d="m6 6 12 12M18 6 6 18" />,
  abajo: <path d="m6 9.5 6 6 6-6" />,
  derecha: <path d="m9.5 6 6 6-6 6" />,
  izquierda: <path d="m14.5 6-6 6 6 6" />,
  rayo: <path d="M13.5 2.5 5 13.5h5l-1.5 8L18 10.5h-5l.5-8Z" />,
  escudo: (
    <>
      <path d="M12 3 5 6v5.5c0 4.5 3 7.6 7 9.5 4-1.9 7-5 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4.5" />
    </>
  ),
  barras: (
    <>
      <path d="M4.5 20V11" />
      <path d="M10.5 20V4.5" />
      <path d="M16.5 20v-6" />
      <path d="M21 20H3" />
    </>
  ),
  documento: (
    <>
      <path d="M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>
  ),
  descargar: (
    <>
      <path d="M12 3.5v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4.5 20.5h15" />
    </>
  ),
  girar: <path d="M20.5 12a8.5 8.5 0 1 1-3.2-6.6" />,
  chispa: (
    <>
      <path d="M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9 12 3.5Z" />
      <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </>
  ),
  ajustes: (
    <>
      <path d="M5 8h9" />
      <path d="M18 8h1.5" />
      <circle cx="16" cy="8" r="2" />
      <path d="M5 16h1.5" />
      <path d="M10.5 16H19" />
      <circle cx="8" cy="16" r="2" />
    </>
  ),
  ojo: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "ojo-tachado": (
    <>
      <path d="M10.6 6a8.9 8.9 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-2.9 3.8" />
      <path d="M6.3 7.8A17 17 0 0 0 2.5 12S6 18.1 12 18.1c1.3 0 2.4-.3 3.5-.7" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3.5 3.5 17 17" />
    </>
  ),
  equipo: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16.5V20" />
    </>
  ),
  mas: <path d="M12 5.5v13M5.5 12h13" />,
  menos: <path d="M5.5 12h13" />,
};

export function Icono({
  nombre,
  className = "size-4",
  trazo = 1.7,
}: {
  nombre: NombreIcono;
  className?: string;
  trazo?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={trazo}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}
