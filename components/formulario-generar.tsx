"use client";

import { useState, type FormEvent } from "react";
import { Boton, CAMPO, Tarjeta } from "@/components/ui";

type Generada = { id: number; clave: string; nombre_app: string; estado: string };

export function FormularioGenerar({ apps, onGenerado }: { apps: string[]; onGenerado: () => void }) {
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generadas, setGeneradas] = useState<Generada[]>([]);
  const [copiada, setCopiada] = useState<string | null>(null);

  async function generar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/generar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre_app: nombre.trim(), cantidad }),
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as { licencias?: Generada[]; error?: string };
      if (!res.ok || !body.licencias) {
        setError(body.error ?? "No se pudieron generar las claves.");
        return;
      }
      setGeneradas(body.licencias);
      onGenerado();
    } catch {
      setError("No hay conexión con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiar(clave: string) {
    try {
      await navigator.clipboard.writeText(clave);
      setCopiada(clave);
      setTimeout(() => setCopiada((actual) => (actual === clave ? null : actual)), 1500);
    } catch {
      setError("No se pudo copiar. Selecciona la clave y cópiala manualmente.");
    }
  }

  return (
    <Tarjeta>
      <h2 className="text-lg font-semibold">Generar claves</h2>
      <p className="mt-1 text-sm text-slate-400">Elige una aplicación existente o escribe una nueva.</p>

      <form onSubmit={generar} className="mt-5 space-y-4">
        <div>
          <label htmlFor="nombre-app" className="mb-2 block text-sm font-medium text-slate-300">
            Aplicación
          </label>
          <input
            id="nombre-app"
            list="apps-existentes"
            className={CAMPO}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Atlas Escritorio"
            maxLength={80}
            required
          />
          <datalist id="apps-existentes">
            {apps.map((app) => (
              <option key={app} value={app} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="cantidad" className="mb-2 block text-sm font-medium text-slate-300">
            Cantidad
          </label>
          <select
            id="cantidad"
            className={CAMPO}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "clave" : "claves"}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200">
            {error}
          </p>
        )}

        <Boton type="submit" variante="primario" className="w-full" disabled={enviando || nombre.trim().length < 2}>
          {enviando ? "Generando…" : "Generar"}
        </Boton>
      </form>

      {generadas.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Nuevas claves (DISPONIBLE)</p>
          {generadas.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-3 py-2"
            >
              <code className="font-mono text-sm tracking-wider text-emerald-200">{l.clave}</code>
              <button
                type="button"
                onClick={() => void copiar(l.clave)}
                className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-100 hover:bg-white/20"
              >
                {copiada === l.clave ? "¡Copiada!" : "Copiar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </Tarjeta>
  );
}
