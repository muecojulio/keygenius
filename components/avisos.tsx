"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icono } from "@/components/iconos";

// Avisos tipo "toast": confirman o explican una acción sin mover el layout.
// Anunciados a tecnologías de asistencia (`role="status"` para lo informativo,
// `role="alert"` para errores), con cierre manual y pausa al pasar el mouse o
// al enfocar dentro del aviso.

export type TipoAviso = "ok" | "error" | "info";

type Aviso = {
  id: number;
  tipo: TipoAviso;
  texto: string;
  detalle?: string;
  duracion: number;
  saliendo: boolean;
};

export type AvisoNuevo = { texto: string; tipo?: TipoAviso; detalle?: string; duracion?: number };

type ApiAvisos = {
  mostrar: (aviso: AvisoNuevo) => void;
  cerrar: (id: number) => void;
};

const MAX_VISIBLES = 3;
const DURACION_POR_DEFECTO = 5200;
const DURACION_SALIDA = 180;

const NO_DISPONIBLE: ApiAvisos = {
  mostrar: () => undefined,
  cerrar: () => undefined,
};

const Contexto = createContext<ApiAvisos | null>(null);

/** Acceso a los avisos. Fuera del proveedor no falla: simplemente no muestra nada. */
export function useAvisos(): ApiAvisos {
  return useContext(Contexto) ?? NO_DISPONIBLE;
}

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteId = useRef(1);
  const temporizadores = useRef(new Map<number, number>());

  const cancelarTemporizador = useCallback((id: number) => {
    const t = temporizadores.current.get(id);
    if (t !== undefined) {
      window.clearTimeout(t);
      temporizadores.current.delete(id);
    }
  }, []);

  const cerrar = useCallback(
    (id: number) => {
      cancelarTemporizador(id);
      setAvisos((previos) => previos.map((a) => (a.id === id ? { ...a, saliendo: true } : a)));
      const salida = window.setTimeout(() => {
        setAvisos((previos) => previos.filter((a) => a.id !== id));
      }, DURACION_SALIDA);
      temporizadores.current.set(id, salida);
    },
    [cancelarTemporizador],
  );

  const mostrar = useCallback(
    ({ texto, tipo = "info", detalle, duracion = DURACION_POR_DEFECTO }: AvisoNuevo) => {
      const id = siguienteId.current;
      siguienteId.current += 1;
      setAvisos((previos) => {
        const siguientes = [...previos, { id, tipo, texto, detalle, duracion, saliendo: false }];
        return siguientes.length > MAX_VISIBLES ? siguientes.slice(siguientes.length - MAX_VISIBLES) : siguientes;
      });
    },
    [],
  );

  // Programa (o reprograma) el cierre automático de cada aviso visible.
  useEffect(() => {
    for (const aviso of avisos) {
      if (aviso.saliendo || temporizadores.current.has(aviso.id)) continue;
      const t = window.setTimeout(() => cerrar(aviso.id), aviso.duracion);
      temporizadores.current.set(aviso.id, t);
    }
    const ids = new Set(avisos.map((a) => a.id));
    for (const [id, t] of temporizadores.current) {
      if (!ids.has(id)) {
        window.clearTimeout(t);
        temporizadores.current.delete(id);
      }
    }
  }, [avisos, cerrar]);

  useEffect(() => {
    const pendientes = temporizadores.current;
    return () => {
      for (const t of pendientes.values()) window.clearTimeout(t);
      pendientes.clear();
    };
  }, []);

  const api = useMemo<ApiAvisos>(() => ({ mostrar, cerrar }), [mostrar, cerrar]);

  return (
    <Contexto.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label="Notificaciones"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end"
      >
        {avisos.map((aviso) => (
          <TarjetaAviso
            key={aviso.id}
            aviso={aviso}
            onCerrar={() => cerrar(aviso.id)}
            onPausar={() => cancelarTemporizador(aviso.id)}
            onReanudar={() => {
              if (aviso.saliendo) return;
              cancelarTemporizador(aviso.id);
              const t = window.setTimeout(() => cerrar(aviso.id), aviso.duracion);
              temporizadores.current.set(aviso.id, t);
            }}
          />
        ))}
      </div>
    </Contexto.Provider>
  );
}

const ESTILO: Record<TipoAviso, { caja: string; icono: "check" | "alerta" | "info"; animo: string }> = {
  ok: { caja: "border-emerald-400/30 bg-emerald-950/90 text-emerald-100", icono: "check", animo: "bg-emerald-400" },
  error: { caja: "border-rose-400/30 bg-rose-950/90 text-rose-100", icono: "alerta", animo: "bg-rose-400" },
  info: { caja: "border-white/15 bg-slate-900/90 text-slate-100", icono: "info", animo: "bg-indigo-400" },
};

function TarjetaAviso({
  aviso,
  onCerrar,
  onPausar,
  onReanudar,
}: {
  aviso: Aviso;
  onCerrar: () => void;
  onPausar: () => void;
  onReanudar: () => void;
}) {
  const estilo = ESTILO[aviso.tipo];
  return (
    <div
      role={aviso.tipo === "error" ? "alert" : "status"}
      onPointerEnter={onPausar}
      onPointerLeave={onReanudar}
      onFocusCapture={onPausar}
      onBlurCapture={onReanudar}
      className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl shadow-black/50 backdrop-blur-md ${
        aviso.saliendo ? "aviso-sale" : "aviso-entra"
      } ${estilo.caja}`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <Icono nombre={estilo.icono} className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{aviso.texto}</p>
          {aviso.detalle && <p className="mt-0.5 text-xs opacity-80">{aviso.detalle}</p>}
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="tacto -mr-1 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-xl opacity-70 transition hover:bg-white/10 hover:opacity-100"
        >
          <Icono nombre="cerrar" className="size-4" />
        </button>
      </div>
      <div className="h-0.5 w-full bg-black/20">
        <div
          className={`aviso-progreso h-full ${estilo.animo}`}
          style={{ animationDuration: `${aviso.duracion}ms` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
