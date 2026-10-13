"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormularioGenerar } from "@/components/formulario-generar";
import { Probador } from "@/components/probador";
import { TablaLicencias } from "@/components/tabla-licencias";
import { Boton, Tarjeta } from "@/components/ui";
import type { LicenciaVista, ResumenLicencias } from "@/lib/tipos";

type Datos = {
  licencias: LicenciaVista[];
  resumen: ResumenLicencias;
  generadoEn: string;
};

type Mensaje = { tipo: "ok" | "error"; texto: string };

const INTERVALO_MS = 5000;

const RESUMEN_VACIO: ResumenLicencias = { total: 0, disponibles: 0, activas: 0, bloqueadas: 0, porVencer: 0 };

async function pedirJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: T & { error?: string } }> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, status: res.status, body };
}

export function PanelAdmin() {
  const router = useRouter();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [cargandoEjemplos, setCargandoEjemplos] = useState(false);

  const refrescar = useCallback(async () => {
    try {
      const { ok, status, body } = await pedirJson<Datos>("/api/admin/dashboard");
      if (status === 401) {
        router.refresh(); // la sesión venció: el servidor mostrará el acceso
        return;
      }
      if (!ok) throw new Error(body.error ?? "No se pudo cargar el panel.");
      setDatos(body);
      setError(null);
      setUltimaActualizacion(new Date().toLocaleTimeString("es-MX"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    }
  }, [router]);

  useEffect(() => {
    const primera = setTimeout(() => void refrescar(), 0);
    const intervalo = setInterval(() => {
      if (!document.hidden) void refrescar();
    }, INTERVALO_MS);
    return () => {
      clearTimeout(primera);
      clearInterval(intervalo);
    };
  }, [refrescar]);

  const nombresApps = useMemo(
    () => Array.from(new Set((datos?.licencias ?? []).map((l) => l.nombre_app))).sort(),
    [datos],
  );

  async function bloquear(licencia: LicenciaVista) {
    if (!window.confirm(`¿Bloquear la clave ${licencia.clave}? El equipo perderá el acceso de inmediato.`)) return;
    const { ok, status, body } = await pedirJson<{ licencia?: LicenciaVista }>("/api/admin/bloquear", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: licencia.id }),
    });
    if (status === 401) return router.refresh();
    if (!ok) return setMensaje({ tipo: "error", texto: body.error ?? "No se pudo bloquear la clave." });
    setMensaje({ tipo: "ok", texto: `Clave ${licencia.clave} bloqueada.` });
    await refrescar();
  }

  async function cargarEjemplos() {
    setCargandoEjemplos(true);
    try {
      const { ok, status, body } = await pedirJson<{ insertadas?: number; existentes?: number }>(
        "/api/admin/precarga",
        { method: "POST" },
      );
      if (status === 401) return router.refresh();
      if (!ok) return setMensaje({ tipo: "error", texto: body.error ?? "No se pudo cargar la precarga." });
      setMensaje({
        tipo: "ok",
        texto: `Precarga lista: ${body.insertadas ?? 0} claves nuevas (${body.existentes ?? 0} ya existían).`,
      });
      await refrescar();
    } finally {
      setCargandoEjemplos(false);
    }
  }

  async function cerrarSesion() {
    await fetch("/api/admin/sesion", { method: "DELETE" });
    router.refresh();
  }

  const resumen = datos?.resumen ?? RESUMEN_VACIO;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-400 text-xl shadow-lg shadow-indigo-900/50">
            🔑
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">KeyGenius</h1>
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              En vivo{ultimaActualizacion ? ` · actualizado ${ultimaActualizacion}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton variante="primario" onClick={cargarEjemplos} disabled={cargandoEjemplos}>
            {cargandoEjemplos ? "Cargando…" : "Cargar ejemplos"}
          </Boton>
          <Boton onClick={() => void refrescar()}>Actualizar</Boton>
          <Boton onClick={cerrarSesion}>Cerrar sesión</Boton>
        </div>
      </header>

      {mensaje && (
        <p
          role="status"
          className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
            mensaje.tipo === "ok"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {mensaje.texto}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Estadistica etiqueta="Total" valor={resumen.total} color="text-slate-100" />
        <Estadistica etiqueta="Disponibles" valor={resumen.disponibles} color="text-sky-300" />
        <Estadistica etiqueta="Activas" valor={resumen.activas} color="text-emerald-300" />
        <Estadistica etiqueta="En aviso (día 27+)" valor={resumen.porVencer} color="text-amber-300" />
        <Estadistica etiqueta="Bloqueadas" valor={resumen.bloqueadas} color="text-rose-300" />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <FormularioGenerar apps={nombresApps} onGenerado={() => void refrescar()} />
        <div className="lg:col-span-2">
          <Probador />
        </div>
      </section>

      <section className="mt-6">
        <TablaLicencias
          licencias={datos?.licencias ?? []}
          cargando={datos === null && !error}
          onBloquear={bloquear}
        />
      </section>

      <footer className="mt-10 text-center text-xs text-slate-500">
        Los días se calculan desde la activación: 32 días de licencia, aviso en el día 27 y el 29 (hito 30).
      </footer>
    </main>
  );
}

function Estadistica({ etiqueta, valor, color }: { etiqueta: string; valor: number; color: string }) {
  return (
    <Tarjeta className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{etiqueta}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${color}`}>{valor}</p>
    </Tarjeta>
  );
}
