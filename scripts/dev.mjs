#!/usr/bin/env node
// Arranque local: `npm run dev`.
// - Si no hay POSTGRES_URL, levanta un PostgreSQL local (datos en .pgdata/, ignorado por Git).
// - Si no hay ADMIN_SECRET_KEY, usa una clave de DESARROLLO. Vercel nunca usa este valor:
//   allí la clave viene de las variables de entorno del proyecto.
// - Sirve la app en 0.0.0.0:8080 para la vista previa.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const PUERTO_PG = 5433;
const CLAVE_DEV = "dev-admin-clave-local-2026";
const env = { ...process.env };

let postgres = null;

async function arrancarPostgresLocal() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const dataDir = join(raiz, ".pgdata");
  postgres = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port: PUERTO_PG,
    persistent: true,
    onLog: () => {},
    onError: () => {},
  });
  if (!existsSync(join(dataDir, "PG_VERSION"))) await postgres.initialise();
  await postgres.start();
  try {
    await postgres.createDatabase("keygenius");
  } catch {
    // La base ya existe.
  }
  env.POSTGRES_URL = `postgres://postgres:postgres@127.0.0.1:${PUERTO_PG}/keygenius`;
  console.log(`[dev] PostgreSQL local en el puerto ${PUERTO_PG} (datos en .pgdata/).`);
}

if (!env.POSTGRES_URL?.trim() && !env.DATABASE_URL?.trim()) {
  await arrancarPostgresLocal();
}
if (!env.ADMIN_SECRET_KEY?.trim()) {
  env.ADMIN_SECRET_KEY = CLAVE_DEV;
  env.KG_DEV_HINT = "1";
  console.log(`[dev] ADMIN_SECRET_KEY no definida: usando la clave de desarrollo "${CLAVE_DEV}".`);
}

const next = spawn(
  process.execPath,
  [join(raiz, "node_modules", "next", "dist", "bin", "next"), "dev", "-H", "0.0.0.0", "-p", "8080"],
  { cwd: raiz, env, stdio: "inherit" },
);

async function salir(codigo) {
  next.kill("SIGTERM");
  if (postgres) await postgres.stop().catch(() => undefined);
  process.exit(codigo);
}

process.on("SIGINT", () => void salir(0));
process.on("SIGTERM", () => void salir(0));
next.on("exit", (codigo) => void salir(codigo ?? 0));
