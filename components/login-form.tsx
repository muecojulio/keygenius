"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Boton, CAMPO, Tarjeta } from "@/components/ui";

export function LoginForm({ pista }: { pista?: string }) {
  const router = useRouter();
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sesion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clave }),
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "No se pudo iniciar sesión.");
        return;
      }
      setClave("");
      router.refresh();
    } catch {
      setError("No hay conexión con el servidor. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-400 text-2xl shadow-xl shadow-indigo-900/50">
            🔑
          </div>
          <h1 className="text-3xl font-bold tracking-tight">KeyGenius</h1>
          <p className="mt-2 text-sm text-slate-400">Panel privado de licencias</p>
        </div>

        <Tarjeta className="p-7">
          <form onSubmit={entrar} className="space-y-5">
            <div>
              <label htmlFor="clave" className="mb-2 block text-sm font-medium text-slate-300">
                Clave de administrador
              </label>
              <input
                id="clave"
                name="clave"
                type="password"
                autoComplete="current-password"
                required
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className={CAMPO}
                placeholder="Tu ADMIN_SECRET_KEY"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200">
                {error}
              </p>
            )}

            <Boton type="submit" variante="primario" disabled={enviando || !clave} className="w-full py-3">
              {enviando ? "Verificando…" : "Entrar al panel"}
            </Boton>
          </form>

          {pista && (
            <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
              Modo desarrollo: clave local <code className="font-mono">{pista}</code>. En Vercel usa tu propia
              ADMIN_SECRET_KEY.
            </p>
          )}
        </Tarjeta>
      </div>
    </main>
  );
}
