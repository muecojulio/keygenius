"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icono, type NombreIcono } from "@/components/iconos";
import { Banner, Boton, CAMPO, Tarjeta } from "@/components/ui";
import { useAvisos } from "@/components/avisos";
import { pedirJson } from "@/lib/cliente";

export function LoginForm({ pista }: { pista?: string }) {
  const router = useRouter();
  const { mostrar } = useAvisos();
  const [clave, setClave] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const { ok, body } = await pedirJson<{ autenticado?: boolean }>("/api/admin/sesion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clave }),
      });
      if (!ok) {
        setError(body.error ?? "No se pudo iniciar sesión.");
        return;
      }
      setClave("");
      mostrar({ tipo: "ok", texto: "Sesión iniciada", detalle: "Dura 12 horas en este navegador." });
      router.refresh();
    } catch {
      setError("No hay conexión con el servidor. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main id="contenido" className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-400 text-slate-950 shadow-xl shadow-indigo-900/50">
            <Icono nombre="llave" className="size-7" trazo={2} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="texto-degradado">KeyGenius</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">Panel privado de licencias</p>
        </div>

        <Tarjeta className="p-7">
          <form onSubmit={entrar} className="space-y-5">
            <div>
              <label htmlFor="clave" className="mb-2 block text-sm font-medium text-slate-300">
                Clave de administrador
              </label>
              <div className="relative">
                <input
                  id="clave"
                  name="clave"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={12}
                  value={clave}
                  onChange={(evento) => setClave(evento.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby="clave-ayuda"
                  className={`${CAMPO} pr-14 ${error ? "sacudida" : ""}`}
                  placeholder="Tu ADMIN_SECRET_KEY"
                />
                <button
                  type="button"
                  onClick={() => setVisible((previo) => !previo)}
                  aria-pressed={visible}
                  aria-label={visible ? "Ocultar la clave" : "Mostrar la clave"}
                  className="tacto absolute top-1/2 right-1.5 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-white/10 hover:text-slate-100"
                >
                  <Icono nombre={visible ? "ojo-tachado" : "ojo"} className="size-4" />
                </button>
              </div>
              <p id="clave-ayuda" className="mt-1.5 text-xs text-slate-400">
                Es la única credencial: no hay cuentas ni registro público.
              </p>
            </div>

            {error && (
              <Banner tono="error" titulo="No se pudo entrar">
                {error}
              </Banner>
            )}

            <Boton
              type="submit"
              variante="primario"
              tamano="lg"
              icono="escudo"
              estado={enviando ? "cargando" : "inactivo"}
              disabled={clave.length < 12}
              className="w-full"
            >
              {enviando ? "Verificando…" : "Entrar al panel"}
            </Boton>
          </form>

          {pista && (
            <div className="mt-5">
              <Banner tono="aviso" titulo="Modo desarrollo">
                Clave local <code className="font-mono">{pista}</code>. En producción se usa tu propia
                <code className="font-mono"> ADMIN_SECRET_KEY</code>.
              </Banner>
            </div>
          )}
        </Tarjeta>

        <ul className="mt-8 grid gap-3 text-sm text-slate-400">
          <Rasgo icono="llave" titulo="Claves con formato APP-XXXX-YYYY-ZZZZ">
            Generadas con un generador criptográfico desde el propio panel.
          </Rasgo>
          <Rasgo icono="equipo" titulo="32 días atados al primer equipo">
            La clave se vincula al equipo que la activa y avisa antes de vencer.
          </Rasgo>
          <Rasgo icono="escudo" titulo="Sesión HttpOnly de 12 horas">
            Sin analítica de terceros ni rastreadores.
          </Rasgo>
        </ul>

        <p className="mt-8 text-center text-xs text-slate-500">
          <Link
            href="/privacidad"
            className="rounded-lg px-2 py-1 text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
          >
            Política de privacidad
          </Link>
        </p>
      </div>
    </main>
  );
}

function Rasgo({ icono, titulo, children }: { icono: NombreIcono; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-200">
        <Icono nombre={icono} className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-slate-200">{titulo}</span>
        <span className="block text-xs text-slate-400">{children}</span>
      </span>
    </li>
  );
}
