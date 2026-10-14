#!/usr/bin/env node
// Analiza si los índices de la tabla `licencias` sirven para algo.
//
//   node scripts/analizar-indices.mjs        (o `npm run indices`)
//
// Es de solo lectura: los tres SELECT se miden con `EXPLAIN ANALYZE`, y el
// UPDATE se planifica sin ejecutarlo (`EXPLAIN` a secas) para no tocar datos.
// Usa la misma conexión que la app: POSTGRES_URL o DATABASE_URL.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

/** Carga .env.local si existe (mismo orden que Next.js). */
function cargarEnvLocal() {
  for (const archivo of [".env.local", ".env"]) {
    try {
      const texto = readFileSync(resolve(process.cwd(), archivo), "utf8");
      for (const linea of texto.split("\n")) {
        const limpia = linea.trim();
        if (!limpia || limpia.startsWith("#")) continue;
        const igual = limpia.indexOf("=");
        if (igual < 0) continue;
        const clave = limpia.slice(0, igual).trim();
        if (!process.env[clave]) process.env[clave] = limpia.slice(igual + 1).trim().replace(/^["']|["']$/g, "");
      }
    } catch {
      // Sin archivo: se usan las variables del entorno.
    }
  }
}

const CONSULTAS = {
  "listado del panel (order by fecha_creacion desc, id desc limit 1000)": {
    sql: "select id, nombre_app, clave, dispositivo_id, estado, fecha_creacion, fecha_activacion, fecha_expiracion from licencias order by fecha_creacion desc, id desc limit 1000",
    medir: true,
  },
  "buscar clave (validación pública)": {
    sql: "select id, nombre_app, clave, estado, fecha_activacion, fecha_expiracion from licencias where clave = 'APP-XXXX-YYYY-ZZZZ' and lower(nombre_app) = lower('Mi App') limit 1",
    medir: true,
  },
  "cierre por vencimiento (update masivo del listado)": {
    sql: "update licencias set estado = 'BLOQUEADA' where estado = 'ACTIVA' and fecha_expiracion <= now()",
    medir: false,
  },
  "resumen por estado (referencia: la app lo calcula en memoria)": {
    sql: "select estado, count(*) from licencias group by estado",
    medir: true,
  },
};

cargarEnvLocal();
const conexion = process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!conexion) {
  console.error("Falta POSTGRES_URL (o DATABASE_URL). En local lo levanta `npm run dev`.");
  process.exit(1);
}

const cliente = new Client({ connectionString: conexion, connectionTimeoutMillis: 8000 });
await cliente.connect();

const existe = await cliente.query("select to_regclass('public.licencias') as tabla");
if (!existe.rows[0]?.tabla) {
  console.error("La tabla `licencias` aún no existe: abre el panel una vez y vuelve a intentarlo.");
  await cliente.end();
  process.exit(1);
}

const total = await cliente.query("select count(*)::int as n from licencias");
console.log(`\nTabla licencias: ${total.rows[0].n} filas\n`);

function recorrer(nodo, niveles = 0) {
  const sangria = "  ".repeat(niveles);
  const indice = nodo["Index Name"] ? ` usando ${nodo["Index Name"]}` : "";
  const filas = nodo["Actual Rows"] ?? nodo["Plan Rows"] ?? "?";
  console.log(`${sangria}- ${nodo["Node Type"]}${indice} (${filas} filas)`);
  for (const hijo of nodo.Plans ?? []) recorrer(hijo, niveles + 1);
}

for (const [titulo, { sql, medir }] of Object.entries(CONSULTAS)) {
  const comando = `explain (${medir ? "analyze, buffers, " : ""}format json) ${sql}`;
  const plan = await cliente.query(comando);
  const envoltura = plan.rows[0]["QUERY PLAN"][0];
  console.log(`### ${titulo}`);
  recorrer(envoltura.Plan);
  if (medir) {
    console.log(
      `  planificación ${envoltura["Planning Time"].toFixed(2)} ms · ejecución ${envoltura["Execution Time"].toFixed(2)} ms\n`,
    );
  } else {
    console.log("  (planificado sin ejecutar: solo lectura)\n");
  }
}

const indices = await cliente.query(`
  select i.relname as nombre,
         pg_size_pretty(pg_relation_size(i.oid)) as tamano,
         coalesce(s.idx_scan, 0) as escaneos,
         coalesce(pg_get_expr(ix.indpred, ix.indrelid), '') as condicion
  from pg_class i
  join pg_index ix on ix.indexrelid = i.oid
  join pg_class t on t.oid = ix.indrelid
  left join pg_stat_user_indexes s on s.indexrelid = i.oid
  where t.relname = 'licencias'
  order by i.relname
`);
console.log("### Índices de la tabla");
for (const fila of indices.rows) {
  console.log(`- ${fila.nombre} · ${fila.tamano} · ${fila.escaneos} escaneos${fila.condicion ? ` · where ${fila.condicion}` : ""}`);
}

const tamano = await cliente.query(
  "select pg_size_pretty(pg_relation_size('licencias')) as tabla, pg_size_pretty(pg_indexes_size('licencias')) as indices",
);
console.log(`\nTamaño: tabla ${tamano.rows[0].tabla} · índices ${tamano.rows[0].indices}`);
console.log(
  "\nLectura: cada índice debe aparecer en el plan de alguna consulta. Si un índice nunca se usa,\ncuesta escritura y espacio sin aportar nada: mejor quitarlo (ver lib/db.ts).\n",
);

await cliente.end().catch(() => undefined);
