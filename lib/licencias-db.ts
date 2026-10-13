import "server-only";
import { consulta } from "@/lib/db";
import { EJEMPLOS_LICENCIAS } from "@/lib/demo";
import {
  DIA_MS,
  avisoVista,
  evaluarAcceso,
  fechasActivacion,
  medirLicencia,
  validacionNoExiste,
} from "@/lib/licencias";
import { generarSerial } from "@/lib/serial";
import type { Estado, LicenciaVista, Validacion } from "@/lib/tipos";

export type Licencia = {
  id: number;
  nombre_app: string;
  clave: string;
  dispositivo_id: string | null;
  estado: Estado;
  fecha_creacion: Date;
  fecha_activacion: Date | null;
  fecha_expiracion: Date | null;
};

const COLUMNAS =
  "id, nombre_app, clave, dispositivo_id, estado, fecha_creacion, fecha_activacion, fecha_expiracion";

function aFila(raw: Record<string, unknown>): Licencia {
  const estado = raw.estado;
  if (estado !== "DISPONIBLE" && estado !== "ACTIVA" && estado !== "BLOQUEADA") {
    throw new Error("Estado de licencia desconocido.");
  }
  return {
    id: Number(raw.id),
    nombre_app: String(raw.nombre_app),
    clave: String(raw.clave),
    dispositivo_id: raw.dispositivo_id == null ? null : String(raw.dispositivo_id),
    estado,
    fecha_creacion: new Date(raw.fecha_creacion as string | Date),
    fecha_activacion: raw.fecha_activacion ? new Date(raw.fecha_activacion as string | Date) : null,
    fecha_expiracion: raw.fecha_expiracion ? new Date(raw.fecha_expiracion as string | Date) : null,
  };
}

function aVista(f: Licencia, ahora: Date): LicenciaVista {
  const activada = f.fecha_activacion !== null;
  const m = medirLicencia(f, ahora);
  const estado: Estado = f.estado === "BLOQUEADA" || m.vencida ? "BLOQUEADA" : f.estado;
  return {
    id: f.id,
    nombre_app: f.nombre_app,
    clave: f.clave,
    dispositivo_id: f.dispositivo_id,
    estado,
    fecha_creacion: f.fecha_creacion.toISOString(),
    fecha_activacion: f.fecha_activacion?.toISOString() ?? null,
    fecha_expiracion: f.fecha_expiracion?.toISOString() ?? null,
    diasActiva: activada ? m.dias : null,
    diasRestantes: activada ? m.diasParaBloqueoTotal : null,
    diasRestantesPara30: activada ? m.diasRestantesPara30 : null,
    aviso: avisoVista({ ...f, estado }, ahora),
  };
}

function esColision(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "23505";
}

/** Bloquea las claves activas cuyo vencimiento ya pasó y devuelve el listado completo. */
export async function listarLicencias(ahora: Date = new Date()): Promise<LicenciaVista[]> {
  await consulta(
    "update licencias set estado = 'BLOQUEADA' where estado = 'ACTIVA' and fecha_expiracion <= $1",
    [ahora],
  );
  const filas = await consulta(
    `select ${COLUMNAS} from licencias order by fecha_creacion desc, id desc limit 1000`,
  );
  return filas.map((raw) => aVista(aFila(raw), ahora));
}

/** Crea claves nuevas en estado DISPONIBLE. Reintenta si un serial choca (muy improbable). */
export async function generarLicencias(nombreApp: string, cantidad: number): Promise<Licencia[]> {
  const creadas: Licencia[] = [];
  for (let i = 0; i < cantidad; i += 1) {
    let fila: Licencia | null = null;
    for (let intento = 0; intento < 5 && !fila; intento += 1) {
      try {
        const filas = await consulta(
          `insert into licencias (nombre_app, clave, estado)
           values ($1, $2, 'DISPONIBLE')
           returning ${COLUMNAS}`,
          [nombreApp, generarSerial()],
        );
        fila = filas[0] ? aFila(filas[0]) : null;
      } catch (err) {
        if (!esColision(err)) throw err;
      }
    }
    if (!fila) throw new Error("No se pudo generar una clave única.");
    creadas.push(fila);
  }
  return creadas;
}

/** Bloqueo manual (revocación). Devuelve null si la licencia no existe. */
export async function bloquearLicencia(id: number, ahora: Date = new Date()): Promise<LicenciaVista | null> {
  const filas = await consulta(
    `update licencias set estado = 'BLOQUEADA' where id = $1 returning ${COLUMNAS}`,
    [id],
  );
  return filas[0] ? aVista(aFila(filas[0]), ahora) : null;
}

async function recargar(id: number): Promise<Licencia | null> {
  const filas = await consulta(`select ${COLUMNAS} from licencias where id = $1`, [id]);
  return filas[0] ? aFila(filas[0]) : null;
}

/**
 * Flujo completo de `POST /api/licencia/validar`:
 *  1. Busca la clave para esa aplicación.
 *  2. Primer uso: la activa de forma atómica (solo si sigue DISPONIBLE).
 *  3. Si ya venció (32 días): la pasa a BLOQUEADA.
 *  4. Decide el acceso según el equipo y el estado.
 */
export async function validarLicencia(
  entrada: { clave: string; nombre_app: string; dispositivo_id: string },
  ahora: Date = new Date(),
): Promise<{ encontrada: boolean; validacion: Validacion }> {
  const encontradas = await consulta(
    `select ${COLUMNAS} from licencias
     where clave = $1 and lower(nombre_app) = lower($2)
     limit 1`,
    [entrada.clave, entrada.nombre_app],
  );
  if (!encontradas[0]) return { encontrada: false, validacion: validacionNoExiste() };
  let lic = aFila(encontradas[0]);

  if (lic.estado === "DISPONIBLE") {
    const { activacion, expiracion } = fechasActivacion(ahora);
    const activadas = await consulta(
      `update licencias
       set dispositivo_id = $2, estado = 'ACTIVA', fecha_activacion = $3, fecha_expiracion = $4
       where id = $1 and estado = 'DISPONIBLE'
       returning ${COLUMNAS}`,
      [lic.id, entrada.dispositivo_id, activacion, expiracion],
    );
    const recargada = activadas[0] ? aFila(activadas[0]) : await recargar(lic.id);
    if (!recargada) return { encontrada: false, validacion: validacionNoExiste() };
    lic = recargada;
  }

  if (lic.estado === "ACTIVA" && medirLicencia(lic, ahora).vencida) {
    await consulta("update licencias set estado = 'BLOQUEADA' where id = $1 and estado = 'ACTIVA'", [
      lic.id,
    ]);
    lic = { ...lic, estado: "BLOQUEADA" };
  }

  return { encontrada: true, validacion: evaluarAcceso(lic, entrada.dispositivo_id, ahora) };
}

/** Carga los ejemplos. Es idempotente: las claves que ya existen no se duplican. */
export async function precargarEjemplos(ahora: Date = new Date()): Promise<{ insertadas: number; existentes: number }> {
  let insertadas = 0;
  for (const ejemplo of EJEMPLOS_LICENCIAS) {
    const activacion =
      ejemplo.diasActiva === null ? null : new Date(ahora.getTime() - ejemplo.diasActiva * DIA_MS);
    const expiracion = activacion ? fechasActivacion(activacion).expiracion : null;
    const filas = await consulta(
      `insert into licencias (nombre_app, clave, dispositivo_id, estado, fecha_activacion, fecha_expiracion)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (clave) do nothing
       returning id`,
      [ejemplo.nombre_app, ejemplo.clave, ejemplo.dispositivo_id, ejemplo.estado, activacion, expiracion],
    );
    if (filas[0]) insertadas += 1;
  }
  return { insertadas, existentes: EJEMPLOS_LICENCIAS.length - insertadas };
}
