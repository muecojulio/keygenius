"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Acordeon } from "@/components/acordeon";
import { Carril } from "@/components/carril";
import { Icono } from "@/components/iconos";
import { Pestanas } from "@/components/pestanas";
import { BarraDias, Boton, CAMPO, Chip, Tarjeta } from "@/components/ui";
import { useAvisos } from "@/components/avisos";
import { copiarTexto, pedirJson } from "@/lib/cliente";
import { CASOS_PRUEBA } from "@/lib/demo";
import { pluralizar } from "@/lib/formato";

type Entrada = { clave: string; nombre_app: string; dispositivo_id: string };
type Resultado = { http: number; cuerpo: Record<string, unknown> };

const VACIA: Entrada = { clave: "", nombre_app: "", dispositivo_id: "" };

export function Probador() {
  const { mostrar } = useAvisos();
  const [entrada, setEntrada] = useState<Entrada>(VACIA);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [enviando, setEnviando] = useState(false);

  const casoActivo = useMemo(
    () =>
      CASOS_PRUEBA.find(
        (caso) =>
          caso.clave === entrada.clave &&
          caso.nombre_app === entrada.nombre_app &&
          caso.dispositivo_id === entrada.dispositivo_id,
      )?.etiqueta ?? null,
    [entrada],
  );

  async function validar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    try {
      const { status, cuerpo } = await enviar(entrada);
      setResultado({ http: status, cuerpo });
    } catch {
      setResultado({ http: 0, cuerpo: { error: "No se pudo conectar con el servidor." } });
    } finally {
      setEnviando(false);
    }
  }

  const acceso = resultado?.cuerpo.acceso === true;
  const dias = typeof resultado?.cuerpo.diasTranscurridos === "number" ? resultado.cuerpo.diasTranscurridos : null;

  return (
    <Tarjeta>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Probar validación</h2>
          <p className="mt-1 text-sm text-slate-400">
            Llama al mismo endpoint que usarían tus aplicaciones:{" "}
            <code className="font-mono text-indigo-200">POST /api/licencia/validar</code>
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400" id="etiqueta-casos">
          Casos rápidos
        </p>
        <Carril etiqueta="Casos rápidos de prueba" rejilla={false}>
          {CASOS_PRUEBA.map((caso) => (
            <Chip
              key={caso.etiqueta}
              activo={casoActivo === caso.etiqueta}
              onClick={() =>
                setEntrada({ clave: caso.clave, nombre_app: caso.nombre_app, dispositivo_id: caso.dispositivo_id })
              }
            >
              {caso.etiqueta}
            </Chip>
          ))}
        </Carril>
      </div>

      <form onSubmit={validar} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-clave" className="mb-2 block text-sm font-medium text-slate-300">
            Clave
          </label>
          <input
            id="p-clave"
            className={`${CAMPO} font-mono uppercase tracking-wider`}
            value={entrada.clave}
            onChange={(evento) => setEntrada({ ...entrada, clave: evento.target.value.toUpperCase() })}
            placeholder="APP-XXXX-YYYY-ZZZZ"
            autoComplete="off"
            spellCheck={false}
            pattern="APP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}"
            title="Formato APP-XXXX-YYYY-ZZZZ"
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
            onChange={(evento) => setEntrada({ ...entrada, nombre_app: evento.target.value })}
            placeholder="Ej. Demo Atlas"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="p-equipo" className="mb-2 block text-sm font-medium text-slate-300">
            Identificador del equipo
          </label>
          <input
            id="p-equipo"
            className={CAMPO}
            value={entrada.dispositivo_id}
            onChange={(evento) => setEntrada({ ...entrada, dispositivo_id: evento.target.value })}
            placeholder="Ej. equipo-nuevo-01"
            aria-describedby="p-equipo-ayuda"
            required
          />
          <p id="p-equipo-ayuda" className="mt-1.5 text-xs text-slate-400">
            Un identificador estable del equipo: la clave queda vinculada a él para siempre.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Boton
            type="submit"
            variante="primario"
            estado={enviando ? "cargando" : "inactivo"}
            icono="rayo"
            className="w-full sm:w-auto"
          >
            {enviando ? "Consultando…" : "Validar clave"}
          </Boton>
        </div>
      </form>

      {resultado && (
        <div className="mt-5 space-y-3">
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
              acceso ? "border-emerald-400/35 bg-emerald-500/10" : "border-rose-400/35 bg-rose-500/10"
            }`}
          >
            <span
              className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${
                acceso ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200"
              }`}
            >
              <Icono nombre={acceso ? "escudo" : "bloquear"} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-bold ${acceso ? "text-emerald-100" : "text-rose-100"}`}>
                {acceso ? "ACCESO PERMITIDO" : "ACCESO DENEGADO"}
                <span className="ml-2 font-mono text-xs font-normal opacity-80">
                  HTTP {resultado.http || "—"}
                </span>
              </p>
              <p className="mt-0.5 text-sm text-slate-200">
                {typeof resultado.cuerpo.aviso === "string" && resultado.cuerpo.aviso
                  ? resultado.cuerpo.aviso
                  : acceso
                    ? "La clave es válida para este equipo."
                    : "Revisa el detalle de la respuesta."}
              </p>
              {dias !== null && (
                <div className="mt-2 max-w-xs space-y-1.5">
                  <p className="text-xs text-slate-300">
                    {pluralizar(dias, "día")} consumidos ·{" "}
                    {typeof resultado.cuerpo.diasParaBloqueoTotal === "number"
                      ? `faltan ${pluralizar(resultado.cuerpo.diasParaBloqueoTotal, "día")} para el bloqueo`
                      : ""}
                  </p>
                  <BarraDias dias={dias} etiqueta={`${dias} de 32 días consumidos`} />
                </div>
              )}
            </div>
          </div>

          <Acordeon titulo="Respuesta completa" resumen="JSON devuelto por el endpoint" icono="documento">
            <RespuestaJson cuerpo={resultado.cuerpo} />
          </Acordeon>
        </div>
      )}

      <div className="mt-5">
        <Acordeon
          titulo="Cómo integrar la validación"
          resumen="Ejemplos listos para copiar (cURL, JavaScript y Python)"
          icono="rayo"
        >
          <EjemplosIntegracion entrada={entrada} onCopiado={(texto) => mostrar({ tipo: "ok", texto })} />
        </Acordeon>
      </div>
    </Tarjeta>
  );
}

function RespuestaJson({ cuerpo }: { cuerpo: Record<string, unknown> }) {
  const { mostrar } = useAvisos();
  const texto = JSON.stringify(cuerpo, null, 2);
  return (
    <div className="space-y-3">
      <pre className="barra-fina max-h-72 overflow-auto rounded-xl border border-white/10 bg-slate-950/70 p-4 font-mono text-xs leading-relaxed text-slate-300">
        {texto}
      </pre>
      <Boton
        tamano="sm"
        icono="copiar"
        onClick={async () => {
          const ok = await copiarTexto(texto);
          mostrar(
            ok
              ? { tipo: "ok", texto: "Respuesta copiada" }
              : { tipo: "error", texto: "No se pudo copiar la respuesta" },
          );
        }}
      >
        Copiar respuesta
      </Boton>
    </div>
  );
}

function EjemplosIntegracion({
  entrada,
  onCopiado,
}: {
  entrada: Entrada;
  onCopiado: (texto: string) => void;
}) {
  const [lenguaje, setLenguaje] = useState("curl");
  const clave = entrada.clave || "APP-XXXX-YYYY-ZZZZ";
  const app = entrada.nombre_app || "Mi Aplicación";
  const equipo = entrada.dispositivo_id || "equipo-123";
  const origen = typeof window !== "undefined" ? window.location.origin : "https://tu-panel.vercel.app";

  const ejemplos = useMemo(
    () => [
      {
        id: "curl",
        etiqueta: "cURL",
        codigo: `curl -s ${origen}/api/licencia/validar \\
  -H 'content-type: application/json' \\
  -d '{"clave":"${clave}","nombre_app":"${app}","dispositivo_id":"${equipo}"}'`,
      },
      {
        id: "javascript",
        etiqueta: "JavaScript",
        codigo: `const res = await fetch('${origen}/api/licencia/validar', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    clave: '${clave}',
    nombre_app: '${app}',
    dispositivo_id: '${equipo}',
  }),
});
const licencia = await res.json();
if (!licencia.acceso) mostrarError(licencia.aviso);`,
      },
      {
        id: "python",
        etiqueta: "Python",
        codigo: `import requests

res = requests.post(
    "${origen}/api/licencia/validar",
    json={
        "clave": "${clave}",
        "nombre_app": "${app}",
        "dispositivo_id": "${equipo}",
    },
    timeout=10,
)
licencia = res.json()
if not licencia["acceso"]:
    raise SystemExit(licencia["aviso"])`,
      },
    ],
    [origen, clave, app, equipo],
  );

  return (
    <Pestanas
      etiqueta="Lenguajes de ejemplo"
      activa={lenguaje}
      items={ejemplos.map((ejemplo) => ({ id: ejemplo.id, etiqueta: ejemplo.etiqueta, icono: "documento" as const }))}
      onCambiar={setLenguaje}
    >
      {(id) => {
        const ejemplo = ejemplos.find((e) => e.id === id) ?? ejemplos[0];
        if (!ejemplo) return null;
        return (
          <div className="space-y-3">
            <pre className="barra-fina max-h-72 overflow-auto rounded-xl border border-white/10 bg-slate-950/70 p-4 font-mono text-xs leading-relaxed text-slate-300">
              {ejemplo.codigo}
            </pre>
            <Boton
              tamano="sm"
              icono="copiar"
              onClick={async () => {
                const ok = await copiarTexto(ejemplo.codigo);
                if (ok) onCopiado(`Ejemplo en ${ejemplo.etiqueta} copiado`);
              }}
            >
              Copiar {ejemplo.etiqueta}
            </Boton>
          </div>
        );
      }}
    </Pestanas>
  );
}

/** Envía la validación sin lanzar excepciones de red al componente. */
async function enviar(entrada: Entrada): Promise<{ status: number; cuerpo: Record<string, unknown> }> {
  try {
    const { status, body } = await pedirJson<Record<string, unknown>>("/api/licencia/validar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entrada),
    });
    return { status, cuerpo: body as Record<string, unknown> };
  } catch {
    return { status: 0, cuerpo: { error: "No se pudo conectar con el servidor." } };
  }
}
