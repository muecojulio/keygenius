import { cookies } from "next/headers";
import { LoginForm } from "@/components/login-form";
import { PanelAdmin } from "@/components/panel-admin";
import { Tarjeta } from "@/components/ui";
import { COOKIE_ADMIN, claveAdminConfigurada, pistaDesarrollo, sesionAdminValida } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!claveAdminConfigurada()) {
    return (
      <main id="contenido" className="flex min-h-dvh items-center justify-center px-4">
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
  if (!sesionAdminValida(jar.get(COOKIE_ADMIN)?.value)) {
    return <LoginForm pista={pistaDesarrollo()} />;
  }
  return <PanelAdmin />;
}
