import type { Metadata } from "next";
import Link from "next/link";
import { Icono, type NombreIcono } from "@/components/iconos";
import { Tarjeta } from "@/components/ui";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos trata KeyGenius, para qué se usan, cuánto tiempo se conservan y cómo ejercer tus derechos sobre las licencias y los equipos vinculados.",
};

const ACTUALIZADO = "14 de octubre de 2026";

export default function PrivacidadPage() {
  return (
    <main id="contenido" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-slate-300 transition-colors duration-150 hover:bg-white/5 hover:text-white"
      >
        <Icono nombre="izquierda" className="size-4" />
        Volver al panel
      </Link>

      <header className="mt-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
          <Icono nombre="escudo" className="size-3.5 text-emerald-300" />
          Privacidad
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="texto-degradado">Política de privacidad</span>
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          Última actualización: {ACTUALIZADO}. Aplica al panel KeyGenius y al endpoint público de validación de
          licencias.
        </p>
      </header>

      <div className="mt-8 space-y-5">
        <Tarjeta>
          <h2 className="text-lg font-semibold text-slate-50">1. Responsable y alcance</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            KeyGenius es una aplicación privada de gestión de licencias de software. El responsable del tratamiento es
            la persona o empresa que despliega esta instancia (el «Titular»). KeyGenius no es un servicio público: no
            hay registro de usuarios, ni perfiles, ni cuentas de terceros. El acceso al panel se protege con una única
            clave de administrador.
          </p>
        </Tarjeta>

        <Tarjeta>
          <h2 className="text-lg font-semibold text-slate-50">2. Qué datos se tratan</h2>
          <ul className="mt-4 space-y-3">
            <Dato icono="llave" titulo="Datos de licencia">
              Nombre de la aplicación, clave de licencia con formato <code className="font-mono">APP-XXXX-YYYY-ZZZZ</code>,
              estado, fechas de creación, activación y expiración, y días consumidos. Son datos necesarios para que la
              licencia funcione.
            </Dato>
            <Dato icono="equipo" titulo="Identificador del equipo">
              El <code className="font-mono">dispositivo_id</code> que envías al validar la clave (por ejemplo, el
              nombre del equipo o un identificador generado por tu aplicación). Se guarda para vincular la licencia a
              una sola computadora y detectar usos simultáneos. El Titular decide qué valor envía; se recomienda no
              incluir datos personales en él.
            </Dato>
            <Dato icono="reloj" titulo="Dirección IP y marcas de tiempo">
              La IP se usa únicamente para limitar intentos (límites de mejor esfuerzo) y se mantiene en la memoria del
              servidor, no en la base de datos. Se reinicia con cada ventana de tiempo (hasta 15 minutos).
            </Dato>
            <Dato icono="escudo" titulo="Cookie de sesión del panel">
              Una sola cookie técnica, <code className="font-mono">kg_admin</code>: HttpOnly, SameSite=Strict, Secure en
              producción y con 12 horas de vida. No hay cookies de publicidad, analítica ni seguimiento.
            </Dato>
            <Dato icono="documento" titulo="Registros del proveedor de hosting">
              El despliegue (por ejemplo en Vercel) genera registros técnicos de peticiones según la configuración del
              propio proveedor, ajenos a la aplicación.
            </Dato>
          </ul>
        </Tarjeta>

        <Tarjeta>
          <h2 className="text-lg font-semibold text-slate-50">3. Para qué se usan</h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-300">
            <li>• Emitir, activar, validar y revocar licencias de software.</li>
            <li>• Vincular cada licencia al primer equipo que la usa y aplicar el plazo de 32 días.</li>
            <li>• Enviar los avisos de los días 27 y 29 dentro de la respuesta de validación.</li>
            <li>• Proteger el servicio: límites de intentos de acceso y de validación, y detección de abuso.</li>
            <li>• Atender solicitudes de soporte del Titular.</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            No se usan los datos para perfilado, publicidad ni decisiones automatizadas con efectos jurídicos. Las
            respuestas de validación se calculan con reglas fijas y verificables.
          </p>
        </Tarjeta>

        <Tarjeta>
          <h2 className="text-lg font-semibold text-slate-50">4. Base legal y conservación</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">Dato</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Base legal</th>
                  <th scope="col" className="py-2 font-semibold">Conservación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr>
                  <td className="py-2.5 pr-4">Licencias y equipo vinculado</td>
                  <td className="py-2.5 pr-4">Ejecución del contrato de licencia</td>
                  <td className="py-2.5">Mientras la licencia siga contratada; el Titular puede revocarla en cualquier momento</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4">Dirección IP (límites)</td>
                  <td className="py-2.5 pr-4">Interés legítimo: seguridad del servicio</td>
                  <td className="py-2.5">En memoria del servidor, hasta que vence la ventana de tiempo</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4">Cookie <code className="font-mono">kg_admin</code></td>
                  <td className="py-2.5 pr-4">Necesaria para el funcionamiento</td>
                  <td className="py-2.5">12 horas o hasta cerrar sesión</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Tarjeta>

        <Tarjeta>
          <h2 className="text-lg font-semibold text-slate-50">5. Destinatarios y encargados</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            No se venden ni se ceden datos a terceros con fines comerciales. Solo intervienen los proveedores
            necesarios para operar el servicio, actuando como encargados:
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
            <li>• <strong className="font-semibold text-slate-200">Hosting</strong> (por ejemplo, Vercel) para servir la aplicación.</li>
            <li>• <strong className="font-semibold text-slate-200">Base de datos</strong> (por ejemplo, Vercel Postgres o Neon) para almacenar las licencias.</li>
            <li>• <strong className="font-semibold text-slate-200">Transporte seguro</strong>: todo el tráfico viaja por HTTPS y las cookies se marcan <code className="font-mono">Secure</code> en producción.</li>
          </ul>
        </Tarjeta>

        <Tarjeta>
          <h2 className="text-lg font-semibold text-slate-50">6. Seguridad</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
            <li>• Clave de administrador comparada en tiempo constante y sesión firmada con HMAC-SHA256.</li>
            <li>• Cookie <code className="font-mono">HttpOnly</code> + <code className="font-mono">SameSite=Strict</code> y validación de origen en las operaciones que cambian datos.</li>
            <li>• Consultas parametrizadas: nunca se concatena SQL con datos del usuario.</li>
            <li>• Límites de intentos por cliente y por clave en el acceso y en la validación.</li>
            <li>• Cabeceras de seguridad (CSP, <code className="font-mono">X-Content-Type-Options</code>, política de referencia y de permisos).</li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Ningún sistema es infalible. Si detectas un problema de seguridad, repórtalo de forma privada antes de
            hacerlo público (ver <code className="font-mono">SECURITY.md</code> en el repositorio).
          </p>
        </Tarjeta>

        <Tarjeta>
          <h2 className="text-lg font-semibold text-slate-50">7. Tus derechos</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Puedes solicitar el acceso, la rectificación, la cancelación (supresión) y la oposición al tratamiento de
            los datos vinculados a tus licencias (derechos ARCO), así como la portabilidad cuando aplique. Escribe al
            canal de soporte por el que adquiriste la licencia o abre una incidencia en el repositorio del proyecto
            indicando la clave o la aplicación afectada.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Al ser un panel privado, las solicitudes las atiende el Titular de la instancia, que es quien decide sobre
            los datos almacenados.
          </p>
          <a
            href="https://github.com/muecojulio/keygenius/issues"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-slate-100 transition-colors duration-150 hover:bg-white/10"
          >
            <Icono nombre="documento" className="size-4" />
            Abrir una solicitud en el repositorio
          </a>
        </Tarjeta>

        <Tarjeta>
          <h2 className="text-lg font-semibold text-slate-50">8. Menores, transferencias y cambios</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            El panel no está dirigido a menores de edad y no se recogen datos de menores de forma consciente. Si el
            proveedor de hosting aloja los datos fuera de tu país, se aplican las garantías contractuales de ese
            proveedor. Esta política puede actualizarse para reflejar cambios del servicio o de la normativa: la fecha
            de la cabecera indica la última revisión.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            ¿Dudas? Escríbenos a través del repositorio del proyecto o del canal de soporte habitual.
          </p>
        </Tarjeta>
      </div>

      <p className="mt-8 text-center text-xs text-slate-500">
        <Link href="/" className="text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
          Volver al panel de licencias
        </Link>
      </p>
    </main>
  );
}

function Dato({ icono, titulo, children }: { icono: NombreIcono; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-200">
        <Icono nombre={icono} className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-slate-100">{titulo}</span>
        <span className="block text-sm leading-relaxed text-slate-400">{children}</span>
      </span>
    </li>
  );
}
