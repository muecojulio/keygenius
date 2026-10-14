import "server-only";
import { Pool, type QueryResultRow } from "pg";
import { ConfigError } from "@/lib/errores";

// Esquema idempotente: se aplica en la primera consulta de cada instancia,
// protegido con un lock de Postgres para que varias instancias que arrancan a
// la vez no compitan al crear la tabla ni los índices.
//
// ── Índices: uno por consulta real, ni uno más ────────────────────────────────
// Cada índice cuesta espacio y escritura; aquí solo quedan los que responden a
// una consulta del código:
//
//   buscar clave        → `where clave = $1`              → licencias_clave_uidx (único)
//   insertar            → `on conflict (clave)`            → licencias_clave_uidx
//   listar el panel     → `order by fecha_creacion desc, id desc limit 1000`
//                                                          → licencias_creacion_idx
//   cierre por vencer   → `where estado = 'ACTIVA' and fecha_expiracion <= $1`
//                                                          → licencias_vencen_idx (parcial)
//
// Se descartan `estado` y `lower(nombre_app)` sueltos: ninguna consulta filtra
// por esas columnas en SQL (los filtros 1 y 2 de la vista se resuelven en el
// cliente sobre las 1000 filas más recientes). Si algún día la búsqueda pasa al
// servidor, lo correcto es un GIN con `pg_trgm` sobre `lower(nombre_app)`.
const ESQUEMA = `
create table if not exists licencias (
  id                bigserial primary key,
  nombre_app        text not null,
  clave             text not null,
  dispositivo_id    text,
  estado            text not null default 'DISPONIBLE',
  fecha_creacion    timestamptz not null default now(),
  fecha_activacion  timestamptz,
  fecha_expiracion  timestamptz,
  constraint licencias_estado_chk check (estado in ('DISPONIBLE', 'ACTIVA', 'BLOQUEADA')),
  constraint licencias_clave_chk check (clave ~ '^APP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  constraint licencias_nombre_chk check (char_length(nombre_app) between 2 and 80)
);
create unique index if not exists licencias_clave_uidx on licencias (clave);
create index if not exists licencias_creacion_idx on licencias (fecha_creacion desc, id desc);
create index if not exists licencias_vencen_idx on licencias (fecha_expiracion) where estado = 'ACTIVA';
drop index if exists licencias_estado_idx;
drop index if exists licencias_app_idx;
`;

const globalRef = globalThis as typeof globalThis & {
  __kgPool?: Pool;
  __kgEsquema?: Promise<void>;
};

function urlConexion(): string {
  const url = process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) throw new ConfigError("POSTGRES_URL");
  return url;
}

function pool(): Pool {
  if (!globalRef.__kgPool) {
    const nuevo = new Pool({
      connectionString: urlConexion(),
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
    // Sin este listener, un error en una conexión ociosa tumba el proceso.
    nuevo.on("error", (err) => {
      console.error("[keygenius] error en conexión ociosa:", err.message);
    });
    globalRef.__kgPool = nuevo;
  }
  return globalRef.__kgPool;
}

async function aplicarEsquema(): Promise<void> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(743120)");
    await client.query(ESQUEMA);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export function asegurarEsquema(): Promise<void> {
  if (!globalRef.__kgEsquema) {
    globalRef.__kgEsquema = aplicarEsquema().catch((err: unknown) => {
      globalRef.__kgEsquema = undefined; // permite reintentar en la siguiente petición
      throw err;
    });
  }
  return globalRef.__kgEsquema;
}

/** Consulta parametrizada ($1, $2…). Nunca concatenar valores en el texto SQL. */
export async function consulta<T extends QueryResultRow = Record<string, unknown>>(
  texto: string,
  params: unknown[] = [],
): Promise<T[]> {
  await asegurarEsquema();
  try {
    const res = await pool().query<T>(texto, params);
    return res.rows;
  } catch (err) {
    // 42P01 = tabla inexistente: la base se recreó con esta instancia viva. Se reaplica el esquema y se reintenta una vez.
    if (!esTablaInexistente(err)) throw err;
    globalRef.__kgEsquema = undefined;
    await asegurarEsquema();
    const res = await pool().query<T>(texto, params);
    return res.rows;
  }
}

function esTablaInexistente(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "42P01";
}
