"use client";

import { useState, type FormEvent } from "react";
import { Carril } from "@/components/carril";
import { Combobox } from "@/components/combobox";
import { Icono } from "@/components/iconos";
import { Banner, Boton, BotonIcono, Chip, Tarjeta } from "@/components/ui";
import { useAvisos } from "@/components/avisos";
import { copiarTexto, pedirJson } from "@/lib/cliente";
import { pluralizar } from "@/lib/formato";

type Generada = { id: number; clave: string; nombre_app: string; estado: string };

const CANTIDADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function FormularioGenerar({
  apps,
  onGenerado,
}: {
  apps: string[];
  onGenerado: () => void | Promise<void>;
}) {
  const { mostrar } = useAvisos();
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generadas, setGeneradas] = useState<Generada[]>([]);
  const [copiada, setCopiada] = useState<string | null>(null);

  async function generar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const { ok, body } = await pedirJson<{ licencias?: Generada[] }>("/api/admin/generar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre_app: nombre.trim(), cantidad }),
      });
      if (!ok || !body.licencias) {
        const mensaje = body.error ?? "No se pudieron generar las claves.";
        setError(mensaje);
        mostrar({ tipo: "error", texto: "No se generaron las claves", detalle: mensaje });
        return;
      }
      setGeneradas(body.licencias);
      setExito(true);
      window.setTimeout(() => setExito(false), 2200);
      mostrar({
        tipo: "ok",
        texto: `${pluralizar(body.licencias.length, "clave")} generada${body.licencias.length === 1 ? "" : "s"}`,
        detalle: `Aplicación: ${nombre.trim()} · estado inicial DISPONIBLE`,
      });
      await onGenerado();
    } catch {
      setError("No hay conexión con el servidor.");
      mostrar({ tipo: "error", texto: "Sin conexión con el servidor" });
    } finally {
      setEnviando(false);
    }
  }

  async function copiar(clave: string) {
    const ok = await copiarTexto(clave);
    if (!ok) {
      setError("No se pudo copiar. Selecciona la clave y cópiala manualmente.");
      return;
    }
    setCopiada(clave);
    mostrar({ tipo: "ok", texto: `Clave ${clave} copiada` });
    window.setTimeout(() => setCopiada((actual) => (actual === clave ? null : actual)), 2000);
  }

  async function copiarTodas() {
    const ok = await copiarTexto(generadas.map((l) => l.clave).join("\n"));
    if (!ok) {
      setError("No se pudieron copiar las claves. Selecciónalas manualmente.");
      return;
    }
    mostrar({ tipo: "ok", texto: `${pluralizar(generadas.length, "clave")} copiada${generadas.length === 1 ? "" : "s"}` });
  }

  return (
    <Tarjeta>
      <h2 className="text-lg font-semibold text-slate-50">Generar claves</h2>
      <p className="mt-1 text-sm text-slate-400">
        Nacen en estado <span className="font-semibold text-sky-300">DISPONIBLE</span> y se vinculan al primer equipo
        que las use.
      </p>

      <form onSubmit={generar} className="mt-5 space-y-5">
        <Combobox
          id="nombre-app"
          etiqueta="Aplicación"
          valor={nombre}
          onCambiar={setNombre}
          opciones={apps}
          placeholder="Ej. Atlas Escritorio"
          ayuda="Elige una aplicación existente o escribe una nueva (2 a 80 caracteres)."
          requerido
        />

        <div>
          <p className="mb-2 block text-sm font-medium text-slate-300" id="etiqueta-cantidad">
            Cantidad <span className="text-slate-500">(1 a 10)</span>
          </p>
          <Carril etiqueta="Cantidad de claves" rejilla={false} className="lg:max-w-md">
            {CANTIDADES.map((n) => (
              <Chip key={n} activo={cantidad === n} onClick={() => setCantidad(n)} className="min-w-11 justify-center">
                {n}
              </Chip>
            ))}
          </Carril>
        </div>

        {error && <Banner tono="error">{error}</Banner>}

        <Boton
          type="submit"
          variante={exito ? "exito" : "primario"}
          estado={enviando ? "cargando" : exito ? "exito" : error ? "error" : "inactivo"}
          className="w-full"
          disabled={nombre.trim().length < 2}
        >
          {enviando ? "Generando…" : exito ? "Claves generadas" : `Generar ${pluralizar(cantidad, "clave")}`}
        </Boton>
      </form>

      {generadas.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Icono nombre="check" className="size-4" />
              Nuevas claves
            </p>
            <Boton tamano="sm" icono="copiar" onClick={() => void copiarTodas()}>
              Copiar todas
            </Boton>
          </div>

          <ul className="space-y-2">
            {generadas.map((l, indice) => (
              <li
                key={l.id}
                className="entrada flex items-center justify-between gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] px-3 py-2"
                style={{ ["--retardo" as string]: `${indice * 45}ms` }}
              >
                <code className="truncate font-mono text-sm tracking-wider text-emerald-100">{l.clave}</code>
                <BotonIcono
                  etiqueta={copiada === l.clave ? `Clave ${l.clave} copiada` : `Copiar clave ${l.clave}`}
                  icono={copiada === l.clave ? "check" : "copiar"}
                  variante="fantasma"
                  onClick={() => void copiar(l.clave)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Tarjeta>
  );
}
