import {
  claveAdmin,
  claveAdminConfigurada,
  cookieAdmin,
  leerCookie,
  COOKIE_ADMIN,
  sesionAdminValida,
} from "@/lib/admin";
import { DURACION_SESION_MS, claveCoincide, crearToken } from "@/lib/sesion";
import { json, leerJson, respuestaError } from "@/lib/http";
import { fallosAgotados, ipCliente, olvidar, registrarFallo } from "@/lib/limite";

export const dynamic = "force-dynamic";

const MAX_FALLOS = 10;
const VENTANA_FALLOS_MS = 15 * 60 * 1000;

/** Estado de la sesión del panel. */
export async function GET(request: Request) {
  try {
    const configurada = claveAdminConfigurada();
    const autenticado = configurada && sesionAdminValida(leerCookie(request, COOKIE_ADMIN));
    return json({ configurada, autenticado });
  } catch (err) {
    return respuestaError(err, "sesion GET");
  }
}

/** Inicia sesión con ADMIN_SECRET_KEY y deja una cookie HttpOnly de 12 horas. */
export async function POST(request: Request) {
  try {
    const clienteLogin = `login:${ipCliente(request)}`;
    if (fallosAgotados(clienteLogin, MAX_FALLOS)) {
      return json({ error: "Demasiados intentos fallidos. Espera 15 minutos." }, 429);
    }
    const clave = claveAdmin();
    const body = await leerJson(request);
    const presentada = typeof body.clave === "string" ? body.clave.trim() : "";
    if (!presentada || !claveCoincide(presentada, clave)) {
      registrarFallo(clienteLogin, VENTANA_FALLOS_MS);
      return json({ error: "Clave incorrecta." }, 401);
    }
    olvidar(clienteLogin);
    const token = crearToken(clave);
    return json({ autenticado: true }, 200, {
      "set-cookie": cookieAdmin(token, Math.floor(DURACION_SESION_MS / 1000)),
    });
  } catch (err) {
    return respuestaError(err, "sesion POST");
  }
}

/** Cierra la sesión borrando la cookie. */
export async function DELETE() {
  return json({ autenticado: false }, 200, { "set-cookie": cookieAdmin("", 0) });
}
