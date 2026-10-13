"use client";

import { useState, type FormEvent } from "react";
import { Boton, CAMPO, Tarjeta } from "@/components/ui";
import { CASOS_PRUEBA } from "@/lib/demo";

type Entrada = { clave: string; nombre_app: string; dispositivo_id: string };
type Resultado = { http: number; cuerpo: Record<string, unknown> };

const VACIA: Entrada = { clave: "", nombre_app: "", dispositivo_id: "" };

export function Probador() {
  const [entrada, setEntrada] = useState<Entrada>(VACIA);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function validar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch("/api/licencia/validar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(entrada),
        cache: "no-store",
      });
      const cuerpo = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      setResultado({ http: res.status, cuerpo });
    } catch {
      setResultado({ http: 0, cuerpo: { error: "No se pudo conectar con el servidor." } });
    } finally {
      setEnviando(false);
    }
  }

  const acceso = resultado?.cuerpo.acceso === true;

  return (
    <Tarjeta>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Probar validación</h2>
          <p className="mt-1 text-sm text-slate-400">
            Llama al mismo endpoint que usarían tus aplicaciones: <code className="font-mono">POST /api/licencia/validar</code>.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CASOS_PRUEBA.map((caso) => (
          <button
            key={caso.etiqueta}
            type="button"
            onClick={() =>
              setEntrada({ clave: caso.clave, nombre_app: caso.nombre_app, dispositivo_id: caso.dispositivo_id })
            }
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/10"
          >
            {caso.etiqueta}
          </button>
        ))}
      </div>

      <form onSubmit={validar} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-clave" className="mb-2 block text-sm font-medium text-slate-300">
            Clave
          </label>
          <input
            id="p-clave"
            className={`${CAMPO} font-mono uppercase`}
            value={entrada.clave}
            onChange={(e) => setEntrada({ ...entrada, clave: e.target.value })}
            placeholder="APP-XXXX-YYYY-ZZZZ"
            required
          />
        </div>
        <div>
          <label htmlFor="p-app" className="mb-2 block text-sm font-medium text-slate-300">
            Aplicación
          </label>
          <input
            id="p-app"
            className={CAMPO}
            value={entrada.nombre_app}
            onChange={(e) => setEntrada({ ...entrada, nombre_app: e.target.value })}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="p-equipo" className="mb-2 block text-sm font-medium text-slate-300">
            Identificador del equipo (dispositivo_id)
          </label>
          <input
            id="p-equipo"
            className={CAMPO}
            value={entrada.dispositivo_id}
            onChange={(e) => setEntrada({ ...entrada, dispositivo_id: e.target.value })}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Boton type="submit" variante="primario" disabled={enviando} className="w-full sm:w-auto">
            {enviando ? "Consultando…" : "Validar clave"}
          </Boton>
        </div>
      </form>

      {resultado && (
        <div className="mt-5 space-y-3">
          <div
            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wide ring-1 ring-inset ${
              acceso
                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                : "bg-rose-500/15 text-rose-300 ring-rose-400/30"
            }`}
          >
            {acceso ? "ACCESO PERMITIDO" : "ACCESO DENEGADO"} · HTTP {resultado.http || "—"}
          </div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/70 p-4 font-mono text-xs leading-relaxed text-slate-300">
            {JSON.stringify(resultado.cuerpo, null, 2)}
          </pre>
        </div>
      )}
    </Tarjeta>
  );
}
