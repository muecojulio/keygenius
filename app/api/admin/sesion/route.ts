import {
  claveAdmin,
  claveAdminConfigurada,
  cookieAdmin,
  leerCookie,
  mutacionAutorizada,
  COOKIE_ADMIN,
  sesionAdminValida,
} from "@/lib/admin";
import { json, leerJson, respuestaError } from "@/lib/http";
import { DURACION_SESION_MS, claveCoincide, crearToken } from "@/lib/sesion";
import { cuboDeSecreto, fallosAgotados, ipCliente, olvidar, registrarFallo } from "@/lib/limite";

export const dynamic = "force-dynamic";

const MAX_FALLOS = 8;
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

/**
 * Inicia sesión con ADMIN_SECRET_KEY y deja una cookie HttpOnly de 12 horas.
 *
 * Dos cupos de intentos fallidos independientes: por cliente (frena el sondeo
 * desde una IP) y por clave presentada (frena el ataque distribuido, sin
 * guardar jamás la clave en claro: solo su huella).
 */
export async function POST(request: Request) {
  try {
    if (!mutacionAutorizada(request)) return json({ error: "Origen no permitido." }, 403);

    const porCliente = `login-ip:${ipCliente(request)}`;
    if (fallosAgotados(porCliente, MAX_FALLOS)) return demasiadosIntentos();

    const body = await leerJson(request);
    const presentada = typeof body.clave === "string" ? body.clave.trim() : "";

    const porClave = presentada ? cuboDeSecreto("login-clave", presentada) : "";
    if (porClave && fallosAgotados(porClave, MAX_FALLOS)) return demasiadosIntentos();

    const clave = claveAdmin();
    if (!presentada || !claveCoincide(presentada, clave)) {
      registrarFallo(porCliente, VENTANA_FALLOS_MS);
      if (porClave) registrarFallo(porClave, VENTANA_FALLOS_MS);
      return json({ error: "Clave incorrecta." }, 401);
    }

    olvidar(porCliente);
    if (porClave) olvidar(porClave);
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

function demasiadosIntentos(): Response {
  return json({ error: "Demasiados intentos fallidos. Espera 15 minutos." }, 429, { "retry-after": "900" });
}
