import { cookies } from "next/headers";
import { claveAdminConfigurada, COOKIE_ADMIN, sesionAdminValida } from "@/lib/admin";
import { LoginForm } from "@/components/login-form";
import { PanelAdmin } from "@/components/panel-admin";
import { Tarjeta } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!claveAdminConfigurada()) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <Tarjeta className="max-w-lg p-7">
          <h1 className="text-xl font-bold">Falta configurar el acceso</h1>
          <p className="mt-3 text-sm text-slate-300">
            Define la variable <code className="font-mono text-indigo-300">ADMIN_SECRET_KEY</code> (mínimo 12
            caracteres) en Vercel → Settings → Environment Variables y vuelve a desplegar.
          </p>
        </Tarjeta>
      </main>
    );
  }

  const jar = await cookies();
  const autenticado = sesionAdminValida(jar.get(COOKIE_ADMIN)?.value);
  if (!autenticado) {
    const pista =
      process.env.NODE_ENV !== "production" && process.env.KG_DEV_HINT === "1"
        ? process.env.ADMIN_SECRET_KEY
        : undefined;
    return <LoginForm pista={pista} />;
  }
  return <PanelAdmin />;
}
