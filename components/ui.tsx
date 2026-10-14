import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from "react";
import { Icono, type NombreIcono } from "@/components/iconos";
import type { Estado } from "@/lib/tipos";

/*
  Primitivas compartidas (sin estado ni hooks: sirven igual en el servidor y en
  el cliente). Las microinteracciones viven en clases CSS y estados ARIA, no en
  JavaScript, para que la interfaz responda aunque el hilo esté ocupado.
*/

/* ── Superficies ─────────────────────────────────────────────────────── */

export function Tarjeta({
  children,
  className = "",
  interactiva = false,
  activa = false,
  retardo = 0,
  onClick,
  ...resto
}: {
  children: ReactNode;
  className?: string;
  /** Se eleva y brilla al pasar el mouse (solo donde hay mouse). */
  interactiva?: boolean;
  /** Tratamiento de selección, no solo por color. */
  activa?: boolean;
  /** Retardo de la entrada escalonada, en milisegundos. */
  retardo?: number;
  /** Si se pasa, la tarjeta entera es un botón (se usa para los contadores). */
  onClick?: () => void;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "onClick">) {
  const clases = `tarjeta-viva entrada rounded-2xl border bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur-sm ${
    activa ? "tarjeta-activa border-indigo-300/40" : "border-white/10"
  } ${interactiva ? "tarjeta-viva--interactiva" : ""} ${className}`;
  const estilo = { ...resto.style, "--retardo": `${retardo}ms` } as CSSProperties;

  if (onClick) {
    return (
      <button
        {...resto}
        type="button"
        onClick={onClick}
        data-activa={activa ? "si" : undefined}
        style={estilo}
        className={`tacto text-left transition-transform duration-150 active:scale-[.985] motion-reduce:transform-none ${clases}`}
      >
        {children}
      </button>
    );
  }

  return (
    <section {...resto} data-activa={activa ? "si" : undefined} style={estilo} className={clases}>
      {children}
    </section>
  );
}

export function Esqueleto({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`esqueleto block rounded-lg ${className}`} />;
}

/* ── Botones ─────────────────────────────────────────────────────────── */

export type VarianteBoton = "primario" | "secundario" | "peligro" | "fantasma" | "exito";
export type EstadoBoton = "inactivo" | "cargando" | "exito" | "error";
export type TamanoBoton = "sm" | "md" | "lg";

const ESTILO_BOTON: Record<VarianteBoton, string> = {
  primario:
    "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-900/40 hover:from-indigo-400 hover:to-violet-400 hover:shadow-indigo-800/50",
  secundario: "border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:border-white/25",
  peligro: "border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 hover:border-rose-400/50",
  fantasma: "text-slate-300 hover:bg-white/10 hover:text-slate-100",
  exito: "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
};

const ESTILO_TAMANO: Record<TamanoBoton, string> = {
  // 44 px en pantallas táctiles; se compacta solo donde hay mouse (lg).
  sm: "min-h-11 gap-1.5 px-3 text-xs lg:min-h-9",
  md: "min-h-11 gap-2 px-4 text-sm",
  lg: "min-h-12 gap-2.5 px-5 text-[0.95rem]",
};

export function Boton({
  variante = "secundario",
  estado = "inactivo",
  tamano = "md",
  icono,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton;
  /** Estado visual + `aria-busy`. Evita envíos duplicados mientras carga. */
  estado?: EstadoBoton;
  tamano?: TamanoBoton;
  icono?: NombreIcono;
}) {
  const ocupado = estado === "cargando";
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      data-estado={estado}
      aria-busy={ocupado ? true : undefined}
      disabled={props.disabled || ocupado}
      className={`tacto inline-flex select-none items-center justify-center rounded-xl font-semibold transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-150 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-[.97] active:duration-75 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transform-none ${ESTILO_BOTON[variante]} ${ESTILO_TAMANO[tamano]} ${estado === "error" ? "sacudida" : ""} ${className}`}
    >
      <IconoEstado estado={estado} icono={icono} />
      <span className="truncate">{children}</span>
      {ocupado && <span className="sr-only">En curso</span>}
    </button>
  );
}

function IconoEstado({ estado, icono }: { estado: EstadoBoton; icono?: NombreIcono }) {
  if (estado === "cargando") {
    return (
      <span className="shrink-0 motion-safe:animate-spin" data-prueba="girando">
        <Icono nombre="girar" className="size-4" trazo={2.2} />
      </span>
    );
  }
  if (estado === "exito") {
    return (
      <span className="latido shrink-0" data-prueba="exito">
        <Icono nombre="check" className="size-4" trazo={2.4} />
      </span>
    );
  }
  if (estado === "error") {
    return (
      <span className="shrink-0" data-prueba="error">
        <Icono nombre="alerta" className="size-4" />
      </span>
    );
  }
  if (!icono) return null;
  return (
    <span className="shrink-0">
      <Icono nombre={icono} className="size-4" />
    </span>
  );
}

/** Botón solo-icono: cuadrado, 44 px y con nombre accesible obligatorio. */
export function BotonIcono({
  etiqueta,
  icono,
  variante = "secundario",
  className = "",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  etiqueta: string;
  icono: NombreIcono;
  variante?: VarianteBoton;
}) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      aria-label={etiqueta}
      title={etiqueta}
      className={`tacto inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none ${ESTILO_BOTON[variante]} ${className}`}
    >
      <Icono nombre={icono} className="size-5" />
    </button>
  );
}

/* ── Chips y filtros ─────────────────────────────────────────────────── */

export function Chip({
  activo = false,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { activo?: boolean }) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      aria-pressed={activo}
      data-activo={activo ? "si" : "no"}
      className={`tacto inline-flex min-h-11 shrink-0 select-none items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-[.97] motion-reduce:transform-none lg:min-h-9 ${
        activo
          ? "border-indigo-300/60 bg-indigo-500/25 text-white shadow-md shadow-indigo-950/40"
          : "border-white/12 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-slate-100"
      } ${className}`}
    >
      {activo && <Icono nombre="check" className="size-3.5" trazo={2.6} />}
      {children}
    </button>
  );
}

/* ── Campos ──────────────────────────────────────────────────────────── */

export const CAMPO =
  "tacto min-h-11 w-full rounded-xl border border-white/12 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-[border-color,background-color,box-shadow] duration-200 hover:border-white/25 focus:border-indigo-400/70 focus:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/35 aria-invalid:border-rose-400/60 aria-invalid:ring-2 aria-invalid:ring-rose-500/25 disabled:opacity-60";

/* ── Avisos en línea ─────────────────────────────────────────────────── */

export function Banner({
  tono = "info",
  titulo,
  children,
  className = "",
  role,
}: {
  tono?: "info" | "ok" | "error" | "aviso";
  titulo?: string;
  children?: ReactNode;
  className?: string;
  role?: string;
}) {
  const estilos = {
    info: { caja: "border-sky-400/30 bg-sky-500/10 text-sky-100", icono: "info" as NombreIcono },
    ok: { caja: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100", icono: "check" as NombreIcono },
    error: { caja: "border-rose-400/30 bg-rose-500/10 text-rose-100", icono: "alerta" as NombreIcono },
    aviso: { caja: "border-amber-400/30 bg-amber-500/10 text-amber-100", icono: "alerta" as NombreIcono },
  }[tono];

  return (
    <div
      role={role ?? (tono === "error" ? "alert" : "status")}
      className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm ${estilos.caja} ${className}`}
    >
      <Icono nombre={estilos.icono} className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={titulo ? "mt-0.5 opacity-90" : ""}>{children}</div>}
      </div>
    </div>
  );
}

/* ── Estado de licencia ──────────────────────────────────────────────── */

const ETIQUETA_ESTADO: Record<Estado, string> = {
  DISPONIBLE: "Disponible",
  ACTIVA: "Activa",
  BLOQUEADA: "Bloqueada",
};

const ESTILO_ESTADO: Record<Estado, string> = {
  DISPONIBLE: "bg-sky-500/15 text-sky-200 ring-sky-400/30",
  ACTIVA: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
  BLOQUEADA: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
};

const ICONO_ESTADO: Record<Estado, NombreIcono> = {
  DISPONIBLE: "llave",
  ACTIVA: "check",
  BLOQUEADA: "bloquear",
};

/** Estado con icono + texto: nunca depende solo del color. */
export function EtiquetaEstado({ estado, conPulso = false }: { estado: Estado; conPulso?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${ESTILO_ESTADO[estado]}`}
    >
      {conPulso && estado === "ACTIVA" ? (
        <span className="punto-vivo" aria-hidden="true" />
      ) : (
        <Icono nombre={ICONO_ESTADO[estado]} className="size-3.5" />
      )}
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

/** Barra de días consumidos sobre 32: verde, ámbar desde el día 27, rojo desde el 30. */
export function BarraDias({ dias, total = 32, etiqueta }: { dias: number; total?: number; etiqueta?: string }) {
  const pct = Math.min(100, Math.max(0, Math.round((dias / total) * 100)));
  const color = dias >= 30 ? "bg-rose-500" : dias >= 27 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(dias, total)}
      aria-valuetext={etiqueta ?? `${dias} de ${total} días`}
      className="h-1.5 w-full max-w-32 overflow-hidden rounded-full bg-white/10"
    >
      <div
        className={`h-full rounded-full ${color} transition-[width] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
