import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { dbSource, getSql } from "@/lib/db";

const DAY_MS = 86_400_000;
const PREVIEW_KEY = "vista-previa";
const COOKIE = "kg_session";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type Estado = "DISPONIBLE" | "ACTIVA" | "BLOQUEADA";

type LicenseRow = {
  id: number;
  nombre_app: string;
  clave: string;
  dispositivo_id: string | null;
  estado: Estado;
  fecha_creacion: string | Date;
  fecha_activacion: string | Date | null;
  fecha_expiracion: string | Date | null;
};

export type Validacion = {
  acceso: boolean;
  estado: string;
  diasTranscurridos: number;
  diasRestantesPara30: number;
  diasParaBloqueoTotal: number;
  aviso: string | null;
};

type Gate =
  | { kind: "env"; secret: string }
  | { kind: "preview"; secret: string }
  | { kind: "db"; hash: string }
  | { kind: "setup" };

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const hits = new Map<string, { n: number; reset: number }>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]!.trim() : "local";
  return ip.slice(0, 64) || "local";
}

function tooMany(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = hits.get(key);
  if (!bucket || now > bucket.reset) return false;
  return bucket.n >= limit;
}

function noteFailure(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = hits.get(key);
  if (!bucket || now > bucket.reset) {
    if (hits.size > 4000) hits.clear();
    hits.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  bucket.n += 1;
  return bucket.n > limit;
}

export function json(data: unknown, status = 200, extra?: Record<string, string>): Response {
  const headers = new Headers(extra);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  return new Response(JSON.stringify(data), { status, headers });
}

export function jsonError(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.message }, err.status);
  console.error("[keygenius] fallo interno");
  return json({ error: "No se pudo completar la operación." }, 500);
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyScrypt(password: string, stored: string): boolean {
  const [alg, saltHex, hashHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (salt.length < 8 || expected.length !== 32) return false;
  const actual = scryptSync(password, salt, 32);
  return timingSafeEqual(actual, expected);
}

function isPreviewRuntime(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL?.trim();
}

async function gate(): Promise<Gate> {
  const env = process.env.ADMIN_SECRET_KEY?.trim() ?? "";
  if (env.length >= 8) return { kind: "env", secret: env };
  if (isPreviewRuntime()) return { kind: "preview", secret: PREVIEW_KEY };
  const sql = await getSql();
  const rows = await sql<{ clave_hash: string }>`
    select clave_hash from admin_config where id = 1
  `;
  if (!rows[0]) return { kind: "setup" };
  return { kind: "db", hash: rows[0].clave_hash };
}

function signingSecret(g: Exclude<Gate, { kind: "setup" }>): string {
  return g.kind === "db" ? g.hash : g.secret;
}

async function keyMatches(g: Exclude<Gate, { kind: "setup" }>, presented: string): Promise<boolean> {
  if (g.kind === "db") return verifyScrypt(presented, g.hash);
  return safeEqual(presented, g.secret);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function makeToken(secret: string): string {
  const payload = String(Date.now() + 12 * 60 * 60 * 1000);
  return `${payload}.${sign(payload, secret)}`;
}

function checkToken(token: string, secret: string): boolean {
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload, secret);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function cookieSecure(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "";
  let https = proto.split(",")[0]?.trim() === "https";
  if (!https) {
    try {
      https = new URL(request.url).protocol === "https:";
    } catch {
      https = false;
    }
  }
  return https ? "; Secure" : "";
}

function sessionCookie(token: string, request: Request): string {
  return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=43200${cookieSecure(request)}`;
}

function clearCookie(request: Request): string {
  return `${COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${cookieSecure(request)}`;
}

function presentedKey(request: Request): string | null {
  const header = request.headers.get("x-admin-key")?.trim();
  if (header) return header;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (/^bearer\s+/i.test(auth)) return auth.replace(/^bearer\s+/i, "").trim();
  return null;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 12_000) throw new HttpError(413, "La solicitud es demasiado grande.");
  if (!text.trim()) return {};
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new HttpError(400, "El cuerpo debe ser un objeto JSON.");
    }
    return value as Record<string, unknown>;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(400, "JSON no válido.");
  }
}

function cleanApp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return null;
  if (/[\u0000-\u001F\u007F]/.test(name)) return null;
  return name;
}

function cleanClave(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clave = value.trim().toUpperCase();
  if (!/^APP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(clave)) return null;
  return clave;
}

function cleanDevice(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const device = value.trim();
  if (device.length < 4 || device.length > 128) return null;
  if (/[\u0000-\u001F\u007F]/.test(device)) return null;
  return device;
}

function chunk(length: number): string {
  const out: string[] = [];
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  while (out.length < length) {
    const bytes = randomBytes(16);
    for (const byte of bytes) {
      if (out.length === length) break;
      if (byte < limit) out.push(ALPHABET[byte % ALPHABET.length]!);
    }
  }
  return out.join("");
}

function newSerial(): string {
  return `APP-${chunk(4)}-${chunk(4)}-${chunk(4)}`;
}

function toIso(value: string | Date | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function stamp(value: string | Date | null): number | null {
  const iso = toIso(value);
  if (!iso) return null;
  return new Date(iso).getTime();
}

function asRow(raw: Record<string, unknown>): LicenseRow {
  const estado = raw.estado;
  if (estado !== "DISPONIBLE" && estado !== "ACTIVA" && estado !== "BLOQUEADA") {
    throw new HttpError(500, "No se pudo leer la licencia.");
  }
  return {
    id: Number(raw.id),
    nombre_app: String(raw.nombre_app),
    clave: String(raw.clave),
    dispositivo_id: raw.dispositivo_id == null ? null : String(raw.dispositivo_id),
    estado,
    fecha_creacion: raw.fecha_creacion as string | Date,
    fecha_activacion: (raw.fecha_activacion ?? null) as string | Date | null,
    fecha_expiracion: (raw.fecha_expiracion ?? null) as string | Date | null,
  };
}

export function medir(row: LicenseRow, now = Date.now()): Validacion {
  const activacion = stamp(row.fecha_activacion);
  const expira = stamp(row.fecha_expiracion);
  if (activacion == null || row.estado === "DISPONIBLE") {
    return {
      acceso: false,
      estado: row.estado,
      diasTranscurridos: 0,
      diasRestantesPara30: 30,
      diasParaBloqueoTotal: 32,
      aviso:
        row.estado === "BLOQUEADA" ? "Esta clave fue revocada por el administrador." : null,
    };
  }
  const dias = Math.max(0, Math.floor((now - activacion) / DAY_MS));
  const diasRestantesPara30 = Math.max(0, 30 - dias);
  const diasParaBloqueoTotal = Math.max(0, 32 - dias);
  const vencida = (expira != null && now >= expira) || dias > 32;
  let aviso: string | null = null;
  if (dias === 27) aviso = "Faltan 3 días para llegar a 30.";
  else if (dias === 29) aviso = "Falta 1 día para llegar a 30.";
  if (row.estado === "BLOQUEADA" || vencida) {
    const revocada = row.estado === "BLOQUEADA" && !vencida;
    return {
      acceso: false,
      estado: "BLOQUEADA",
      diasTranscurridos: dias,
      diasRestantesPara30,
      diasParaBloqueoTotal: vencida ? 0 : diasParaBloqueoTotal,
      aviso: revocada
        ? "Esta clave fue revocada por el administrador."
        : "La licencia superó los 32 días y quedó bloqueada.",
    };
  }
  return {
    acceso: true,
    estado: "ACTIVA",
    diasTranscurridos: dias,
    diasRestantesPara30,
    diasParaBloqueoTotal,
    aviso,
  };
}

function denegada(
  estado: string,
  aviso: string,
  extra?: Partial<Validacion>,
): Validacion {
  return {
    acceso: false,
    estado,
    diasTranscurridos: extra?.diasTranscurridos ?? 0,
    diasRestantesPara30: extra?.diasRestantesPara30 ?? 0,
    diasParaBloqueoTotal: extra?.diasParaBloqueoTotal ?? 0,
    aviso,
  };
}

const seedFlag = globalThis as typeof globalThis & { __kgSeeded?: boolean };

async function ensureDemo(): Promise<void> {
  if (!isPreviewRuntime() || seedFlag.__kgSeeded) return;
  const sql = await getSql();
  const count = await sql<{ n: number }>`select count(*)::int as n from licencias`;
  if ((count[0]?.n ?? 0) > 0) {
    seedFlag.__kgSeeded = true;
    return;
  }
  const now = Date.now();
  const samples: Array<{
    app: string;
    clave: string;
    estado: Estado;
    daysAgo: number | null;
    device: string | null;
  }> = [
    { app: "Atlas Escritorio", clave: "APP-DEMO-ATLS-0001", estado: "DISPONIBLE", daysAgo: null, device: null },
    { app: "Norte Móvil", clave: "APP-DEMO-NRTE-0002", estado: "DISPONIBLE", daysAgo: null, device: null },
    { app: "Atlas Escritorio", clave: "APP-DEMO-ATLS-0004", estado: "ACTIVA", daysAgo: 4, device: "equipo-demo-04" },
    { app: "Taller Pro", clave: "APP-DEMO-TALL-0027", estado: "ACTIVA", daysAgo: 27, device: "equipo-demo-27" },
    { app: "Taller Pro", clave: "APP-DEMO-TALL-0029", estado: "ACTIVA", daysAgo: 29, device: "equipo-demo-29" },
    { app: "Norte Móvil", clave: "APP-DEMO-NRTE-0033", estado: "BLOQUEADA", daysAgo: 33, device: "equipo-demo-33" },
  ];
  for (const sample of samples) {
    const activacion =
      sample.daysAgo == null ? null : new Date(now - sample.daysAgo * DAY_MS).toISOString();
    const expiracion =
      sample.daysAgo == null
        ? null
        : new Date(now + (32 - sample.daysAgo) * DAY_MS).toISOString();
    await sql`
      insert into licencias (
        nombre_app, clave, dispositivo_id, estado, fecha_activacion, fecha_expiracion
      ) values (
        ${sample.app},
        ${sample.clave},
        ${sample.device},
        ${sample.estado},
        ${activacion}::timestamptz,
        ${expiracion}::timestamptz
      )
      on conflict (clave) do nothing
    `;
  }
  seedFlag.__kgSeeded = true;
}

function fila(row: LicenseRow) {
  const metrics = medir(row);
  const sinActivar = row.fecha_activacion == null;
  return {
    id: row.id,
    nombre_app: row.nombre_app,
    clave: row.clave,
    dispositivo_id: row.dispositivo_id,
    estado: row.estado === "BLOQUEADA" || metrics.estado === "BLOQUEADA" ? "BLOQUEADA" : row.estado,
    fecha_creacion: toIso(row.fecha_creacion),
    fecha_activacion: toIso(row.fecha_activacion),
    fecha_expiracion: toIso(row.fecha_expiracion),
    diasTranscurridos: sinActivar ? null : metrics.diasTranscurridos,
    diasRestantesPara30: sinActivar ? null : metrics.diasRestantesPara30,
    diasParaBloqueoTotal: sinActivar ? null : metrics.diasParaBloqueoTotal,
    aviso: metrics.aviso,
  };
}

async function requireAdmin(request: Request): Promise<Response | null> {
  const g = await gate();
  if (g.kind === "setup") {
    return json(
      { error: "Primero crea la clave de administrador.", necesitaConfiguracion: true },
      401,
    );
  }
  const header = presentedKey(request);
  if (header) {
    const ip = clientIp(request);
    if (tooMany(`authfail:${ip}`, 10, 10 * 60 * 1000)) {
      return json({ error: "Demasiados intentos. Espera unos minutos." }, 429);
    }
    if (!(await keyMatches(g, header))) {
      noteFailure(`authfail:${ip}`, 10, 10 * 60 * 1000);
      return json({ error: "No autorizado." }, 401);
    }
    return null;
  }
  const secret = signingSecret(g);
  const sessionHeader = request.headers.get("x-kg-session")?.trim() ?? "";
  const cookieToken = readCookie(request, COOKIE) ?? "";
  const ok =
    (sessionHeader.length > 0 && checkToken(sessionHeader, secret)) ||
    (cookieToken.length > 0 && checkToken(cookieToken, secret));
  if (!ok) return json({ error: "No autorizado." }, 401);
  return null;
}

export async function estadoSesion(request: Request): Promise<Response> {
  const g = await gate();
  const modo = g.kind === "preview" ? "previa" : "produccion";
  const necesitaConfiguracion = g.kind === "setup";
  if (g.kind === "setup") {
    return json({ autenticado: false, modo, necesitaConfiguracion, demoClave: null });
  }
  const secret = signingSecret(g);
  const sessionHeader = request.headers.get("x-kg-session")?.trim() ?? "";
  const cookieToken = readCookie(request, COOKIE) ?? "";
  const autenticado =
    (sessionHeader.length > 0 && checkToken(sessionHeader, secret)) ||
    (cookieToken.length > 0 && checkToken(cookieToken, secret));
  return json({
    autenticado,
    modo,
    necesitaConfiguracion,
    demoClave: g.kind === "preview" && !autenticado ? PREVIEW_KEY : null,
  });
}

export async function iniciarSesion(request: Request): Promise<Response> {
  const g = await gate();
  if (g.kind === "setup") {
    return json({ error: "Primero crea tu clave.", necesitaConfiguracion: true }, 409);
  }
  const ip = clientIp(request);
  if (tooMany(`authfail:${ip}`, 10, 10 * 60 * 1000)) {
    return json({ error: "Demasiados intentos. Espera unos minutos." }, 429);
  }
  const body = await readJson(request);
  const clave = typeof body.clave === "string" ? body.clave : "";
  if (!(await keyMatches(g, clave))) {
    noteFailure(`authfail:${ip}`, 10, 10 * 60 * 1000);
    return json({ error: "Clave incorrecta." }, 401);
  }
  const token = makeToken(signingSecret(g));
  return json({ autenticado: true, sesion: token }, 200, {
    "set-cookie": sessionCookie(token, request),
  });
}

export async function cerrarSesion(request: Request): Promise<Response> {
  return json({ autenticado: false }, 200, { "set-cookie": clearCookie(request) });
}

export async function configurarAdmin(request: Request): Promise<Response> {
  const g = await gate();
  if (g.kind !== "setup") {
    return json({ error: "La clave de administrador ya está definida." }, 409);
  }
  const ip = clientIp(request);
  if (tooMany(`setup:${ip}`, 8, 10 * 60 * 1000)) {
    return json({ error: "Demasiados intentos. Espera unos minutos." }, 429);
  }
  noteFailure(`setup:${ip}`, 8, 10 * 60 * 1000);
  const body = await readJson(request);
  const clave = typeof body.clave === "string" ? body.clave : "";
  const confirmar = typeof body.confirmar === "string" ? body.confirmar : "";
  if (clave.length < 10 || clave.length > 128) {
    return json({ error: "Usa al menos 10 caracteres." }, 400);
  }
  if (clave !== confirmar) return json({ error: "Las dos claves no coinciden." }, 400);
  const hash = hashPassword(clave);
  const sql = await getSql();
  const inserted = await sql<{ id: number }>`
    insert into admin_config (id, clave_hash)
    values (1, ${hash})
    on conflict (id) do nothing
    returning id
  `;
  if (!inserted.length) {
    return json({ error: "La clave de administrador ya está definida." }, 409);
  }
  const token = makeToken(hash);
  return json({ autenticado: true, sesion: token }, 200, {
    "set-cookie": sessionCookie(token, request),
  });
}

export async function panelAdmin(request: Request): Promise<Response> {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  await ensureDemo();
  const sql = await getSql();
  await sql`
    update licencias
    set estado = 'BLOQUEADA'
    where estado = 'ACTIVA'
      and fecha_expiracion is not null
      and fecha_expiracion <= now()
  `;
  const rows = await sql<Record<string, unknown>>`
    select id, nombre_app, clave, dispositivo_id, estado,
           fecha_creacion, fecha_activacion, fecha_expiracion
    from licencias
    order by fecha_creacion desc
    limit 1000
  `;
  const licencias = rows.map((row) => fila(asRow(row)));
  const resumen = {
    total: licencias.length,
    disponibles: licencias.filter((item) => item.estado === "DISPONIBLE").length,
    activas: licencias.filter((item) => item.estado === "ACTIVA").length,
    bloqueadas: licencias.filter((item) => item.estado === "BLOQUEADA").length,
  };
  return json({ licencias, resumen });
}

export async function generarClaves(request: Request): Promise<Response> {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const body = await readJson(request);
  const nombre = cleanApp(body.nombre_app);
  if (!nombre) return json({ error: "Escribe el nombre de la aplicación." }, 400);
  const cantidad = body.cantidad == null ? 1 : Number(body.cantidad);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10) {
    return json({ error: "Puedes generar entre 1 y 10 claves." }, 400);
  }
  const sql = await getSql();
  const claves: Array<{ id: number; clave: string; nombre_app: string; estado: Estado }> = [];
  for (let i = 0; i < cantidad; i += 1) {
    let created = false;
    for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
      const clave = newSerial();
      try {
        const rows = await sql<Record<string, unknown>>`
          insert into licencias (nombre_app, clave, estado)
          values (${nombre}, ${clave}, 'DISPONIBLE')
          returning id, clave, nombre_app, estado
        `;
        const row = rows[0];
        if (!row) continue;
        claves.push({
          id: Number(row.id),
          clave: String(row.clave),
          nombre_app: String(row.nombre_app),
          estado: "DISPONIBLE",
        });
        created = true;
      } catch (err) {
        const code = typeof err === "object" && err && "code" in err ? String(err.code) : "";
        const message = err instanceof Error ? err.message : "";
        if (code === "23505" || /unique|duplicate/i.test(message)) continue;
        throw err;
      }
    }
    if (!created) throw new HttpError(500, "No se pudo generar una clave única.");
  }
  return json({ claves });
}

export async function bloquearClave(request: Request): Promise<Response> {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const body = await readJson(request);
  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) return json({ error: "Licencia no válida." }, 400);
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    update licencias
    set estado = 'BLOQUEADA'
    where id = ${id}
    returning id, nombre_app, clave, dispositivo_id, estado,
              fecha_creacion, fecha_activacion, fecha_expiracion
  `;
  if (!rows[0]) return json({ error: "No se encontró esa licencia." }, 404);
  return json({ licencia: fila(asRow(rows[0])) });
}

const cors: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "600",
};

export function validarOptions(): Response {
  return new Response(null, { status: 204, headers: cors });
}

export async function validarLicencia(request: Request): Promise<Response> {
  const ip = clientIp(request);
  if (tooMany(`validar:${ip}`, 40, 60 * 1000)) {
    return json(
      denegada("LIMITE", "Demasiados intentos. Espera un momento."),
      429,
      cors,
    );
  }
  noteFailure(`validar:${ip}`, 40, 60 * 1000);
  await ensureDemo();
  const body = await readJson(request);
  const clave = cleanClave(body.clave);
  const nombre = cleanApp(body.nombre_app);
  const device = cleanDevice(body.dispositivo_id);
  if (!clave || !nombre || !device) {
    return json(
      denegada("SOLICITUD", "Indica clave, nombre_app y dispositivo_id."),
      400,
      cors,
    );
  }
  const sql = await getSql();
  const found = await sql<Record<string, unknown>>`
    select id, nombre_app, clave, dispositivo_id, estado,
           fecha_creacion, fecha_activacion, fecha_expiracion
    from licencias
    where clave = ${clave} and lower(nombre_app) = lower(${nombre})
    limit 1
  `;
  if (!found[0]) {
    return json(
      denegada("NO_EXISTE", "Clave no encontrada para esta aplicación."),
      200,
      cors,
    );
  }
  let row = asRow(found[0]);
  if (row.estado === "BLOQUEADA") return json(medir(row), 200, cors);

  const expired = await sql<Record<string, unknown>>`
    update licencias
    set estado = 'BLOQUEADA'
    where id = ${row.id}
      and estado = 'ACTIVA'
      and fecha_expiracion is not null
      and fecha_expiracion <= now()
    returning id, nombre_app, clave, dispositivo_id, estado,
              fecha_creacion, fecha_activacion, fecha_expiracion
  `;
  if (expired[0]) return json(medir(asRow(expired[0])), 200, cors);

  if (row.estado === "DISPONIBLE") {
    const activated = await sql<Record<string, unknown>>`
      update licencias
      set dispositivo_id = ${device},
          estado = 'ACTIVA',
          fecha_activacion = now(),
          fecha_expiracion = now() + interval '32 days'
      where id = ${row.id} and estado = 'DISPONIBLE'
      returning id, nombre_app, clave, dispositivo_id, estado,
                fecha_creacion, fecha_activacion, fecha_expiracion
    `;
    if (activated[0]) return json(medir(asRow(activated[0])), 200, cors);
    const again = await sql<Record<string, unknown>>`
      select id, nombre_app, clave, dispositivo_id, estado,
             fecha_creacion, fecha_activacion, fecha_expiracion
      from licencias
      where id = ${row.id}
    `;
    if (!again[0]) {
      return json(denegada("NO_EXISTE", "Clave no encontrada para esta aplicación."), 200, cors);
    }
    row = asRow(again[0]);
  }

  if (row.estado === "BLOQUEADA") return json(medir(row), 200, cors);
  if (row.dispositivo_id !== device) {
    const metrics = medir(row);
    return json(
      {
        ...metrics,
        acceso: false,
        aviso: "Esta clave ya está vinculada a otra computadora",
      },
      200,
      cors,
    );
  }
  return json(medir(row), 200, cors);
}

export async function ejemplosLicencia(): Promise<Response> {
  if (!isPreviewRuntime()) return json({ ejemplos: [] });
  await ensureDemo();
  return json({
    ejemplos: [
      {
        clave: "APP-DEMO-ATLS-0001",
        nombre_app: "Atlas Escritorio",
        dispositivo_id: "equipo-demo-nuevo",
        nota: "Primer uso. Se activa 32 días en este equipo.",
      },
      {
        clave: "APP-DEMO-TALL-0027",
        nombre_app: "Taller Pro",
        dispositivo_id: "equipo-demo-27",
        nota: "Día 27. Aviso: faltan 3 días para llegar a 30.",
      },
      {
        clave: "APP-DEMO-TALL-0029",
        nombre_app: "Taller Pro",
        dispositivo_id: "equipo-demo-29",
        nota: "Día 29. Aviso: falta 1 día para llegar a 30.",
      },
      {
        clave: "APP-DEMO-TALL-0027",
        nombre_app: "Taller Pro",
        dispositivo_id: "otra-computadora",
        nota: "La misma clave en otro equipo. Debe negarse.",
      },
      {
        clave: "APP-DEMO-NRTE-0033",
        nombre_app: "Norte Móvil",
        dispositivo_id: "equipo-demo-33",
        nota: "Ya pasaron más de 32 días. Queda bloqueada.",
      },
      {
        clave: "APP-DEMO-ATLS-0004",
        nombre_app: "Atlas Escritorio",
        dispositivo_id: "equipo-demo-04",
        nota: "Activa desde hace 4 días, mismo equipo.",
      },
    ],
  });
}
