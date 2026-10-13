# KeyGenius

Panel privado para generar, validar y controlar licencias de tus aplicaciones.
Construido con **Next.js (App Router)**, **Tailwind CSS** y **Vercel Postgres**.

## Reglas de licencia

- Las claves tienen formato `APP-XXXX-YYYY-ZZZZ` y nacen en estado `DISPONIBLE`.
- **Primer uso:** se vincula el equipo, se guarda la fecha de activación y el vencimiento queda a **exactamente 32 días naturales**. Estado → `ACTIVA`.
- **Otro equipo:** el acceso se niega con «Esta clave ya está vinculada a otra computadora».
- **Vencimiento:** al cumplir 32 días la clave pasa a `BLOQUEADA` y se niega el acceso.
- **Avisos:** en el **día 27** («faltan 3 días para llegar a 30») y en el **día 29** («falta 1 día para llegar a 30»).
- **Bloqueo manual:** desde el panel se puede revocar cualquier clave.

## Despliegue en Vercel

1. **Importa el repositorio** en Vercel (New Project). Framework: Next.js (detectado solo).
2. **Crea la base de datos:** Storage → Create → Postgres (Neon). Al conectarla al proyecto, Vercel añade `POSTGRES_URL`.
3. **Define la clave de administrador:** Settings → Environment Variables → `ADMIN_SECRET_KEY` (mínimo 12 caracteres, aleatoria).
4. **Despliega.** El esquema de la tabla `licencias` se crea solo en la primera petición.
5. Entra al sitio, inicia sesión con `ADMIN_SECRET_KEY` y pulsa **Cargar ejemplos** para ver el panel con datos.

> Si falta `ADMIN_SECRET_KEY` o `POSTGRES_URL`, el panel lo indica sin mostrar valores.

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:8080
```

Sin `POSTGRES_URL`, `npm run dev` levanta un PostgreSQL local (datos en `.pgdata/`) y usa la clave de desarrollo `dev-admin-clave-local-2026`. Vercel nunca usa esa clave.

Otros comandos:

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # pruebas de las reglas de negocio
npm run build       # build de producción (lo que ejecuta Vercel)
```

## API

Todas las respuestas son JSON. Las rutas de administración aceptan el encabezado `x-admin-key: <ADMIN_SECRET_KEY>` o la sesión del panel.

### `POST /api/admin/generar` (admin)

```json
{ "nombre_app": "Atlas Escritorio", "cantidad": 1 }
```

Respuesta `201`: `{ "clave": "APP-…", "licencias": [{ "id", "clave", "nombre_app", "estado": "DISPONIBLE" }] }`

### `POST /api/licencia/validar` (público)

```json
{ "clave": "APP-XXXX-YYYY-ZZZZ", "nombre_app": "Atlas Escritorio", "dispositivo_id": "equipo-123" }
```

Respuesta `200`:

```json
{
  "acceso": true,
  "estado": "ACTIVA",
  "diasTranscurridos": 0,
  "diasRestantesPara30": 30,
  "diasParaBloqueoTotal": 32,
  "aviso": null
}
```

`400` si faltan datos válidos; `200` con `estado: "NO_EXISTE"` si la clave no corresponde a esa app.

### `GET /api/admin/dashboard` (admin)

Lista todas las licencias con `diasActiva` (días consumidos), `diasRestantes` (faltan para 32), `diasRestantesPara30` y `aviso`, más un `resumen`.

### `POST /api/admin/bloquear` (admin)

```json
{ "id": 12 }
```

### `POST /api/admin/precarga` (admin)

Carga claves de ejemplo (`Demo …`). Es idempotente.

### Sesión del panel

- `POST /api/admin/sesion` — `{ "clave": "…" }` → cookie `kg_admin` (HttpOnly, 12 h).
- `GET /api/admin/sesion` — estado de la sesión.
- `DELETE /api/admin/sesion` — cierra sesión.

## Estructura

```
app/                 Páginas (App Router) y rutas de API
components/          Interfaz del panel (cliente)
lib/licencias.ts     Reglas de negocio puras (días, avisos, vencimiento)
lib/licencias-db.ts  Consultas y transiciones de estado en Postgres
lib/db.ts            Conexión y esquema (idempotente)
lib/sesion.ts        Sesión firmada del administrador
tests/               Pruebas unitarias (Vitest)
```

## Notas de seguridad

- `ADMIN_SECRET_KEY` es la única credencial de administración. No hay cuentas ni registro público.
- Las sesiones son tokens firmados con HMAC; cambiar la clave invalida todas las sesiones.
- Los límites de intentos (login y validación) están en memoria: son un freno de mejor esfuerzo en serverless.
