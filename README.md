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
4. **Despliega.** El esquema de la tabla `licencias` (tabla e índices) se crea solo en la primera petición y es idempotente.
5. Entra al sitio, inicia sesión con `ADMIN_SECRET_KEY` y pulsa **Precargar** para ver el panel con datos. El mismo botón pasa a **Quitar precarga** mientras los ejemplos están cargados.

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
npm test            # pruebas de las reglas de negocio y de las utilidades nuevas
npm run build       # build de producción (lo que ejecuta Vercel)
npm run check       # typecheck + lint + test + build
npm run indices     # analiza los planes de consulta y el uso real de los índices
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

`400` si faltan datos válidos o el cuerpo no es `application/json`; `429` si se agota el cupo de consultas; `200` con `estado: "NO_EXISTE"` si la clave no corresponde a esa app.

### `GET /api/admin/dashboard` (admin)

Lista todas las licencias con `diasActiva` (días consumidos), `diasRestantes` (faltan para 32), `diasRestantesPara30` y `aviso`, más un `resumen`.

Responde además:

- `ETag` calculado sobre los datos (no sobre la hora) y `304 Not Modified` cuando nada cambió.
- `x-kg-cache: hit|miss` para saber si la respuesta vino de la caché en memoria.

### `POST /api/admin/bloquear` (admin)

```json
{ "id": 12 }
```

### `POST /api/admin/precarga` (admin)

Carga claves de ejemplo (`Demo …`). Es idempotente.

### `DELETE /api/admin/precarga` (admin)

Quita las claves de ejemplo cargadas con la precarga. Solo borra las claves exactas de ejemplo (`APP-DEMO-…`), nunca claves reales. Es idempotente y responde `{ "eliminadas": n }`. Es lo que usa el botón **Precargar** del panel cuando la precarga ya está puesta (pasa a **Quitar precarga**).

### Sesión del panel

- `POST /api/admin/sesion` — `{ "clave": "…" }` → cookie `kg_admin` (HttpOnly, SameSite=Strict, 12 h).
- `GET /api/admin/sesion` — estado de la sesión.
- `DELETE /api/admin/sesion` — cierra sesión.

## Base de datos: ¿convienen los índices?

Sí, y solo tres. Cada índice cuesta espacio y escritura en cada `insert`/`update`, así que
se justifica **uno por consulta real** y ninguno más:

| Consulta del código | Índice |
| --- | --- |
| `where clave = $1` (validación) y `on conflict (clave)` (precarga) | `licencias_clave_uidx` (único) |
| `order by fecha_creacion desc, id desc limit 1000` (listado del panel) | `licencias_creacion_idx` |
| `where estado = 'ACTIVA' and fecha_expiracion <= $1` (cierre por vencimiento) | `licencias_vencen_idx` (parcial) |

Se eliminaron dos índices que no servía ninguna consulta: `estado` suelto y
`lower(nombre_app)`. El resumen por estado y la búsqueda por texto se calculan en
memoria sobre las 1000 filas más recientes, así que esos índices solo añadían
escritura. (Si algún día la búsqueda pasa al servidor, lo correcto es un GIN con
`pg_trgm` sobre `lower(nombre_app)`; queda anotado en `lib/db.ts`.)

**Medición real** (`scripts/analizar-indices.mjs`, tabla de 20 000 filas, PostgreSQL 17):

| Consulta | Sin índices | Con los índices finales |
| --- | --- | --- |
| Listado del panel (1000 filas) | 3,72 ms · *Seq Scan + Sort* | 0,27 ms · *Index Scan* `licencias_creacion_idx` |
| Cierre por vencimiento | 7,23 ms · *Seq Scan* | 0,02 ms · *Bitmap Index Scan* `licencias_vencen_idx` |
| Buscar una clave | 0,08 ms · *Seq Scan* | 0,02 ms · *Index Scan* `licencias_clave_uidx` |
| Agregado por estado (referencia) | 6,13 ms | 6,13 ms (lo calcula la app en memoria) |

Con tablas pequeñas el planificador prefiere el escaneo secuencial, y hace bien: los
índices empiezan a notarse al crecer. Reproduce el análisis con `npm run indices`
(solo lectura: mide los `SELECT` con `EXPLAIN ANALYZE` y planifica el `UPDATE` sin ejecutarlo).

Los índices se aplican solos: `lib/db.ts` ejecuta el esquema completo (idempotente,
bajo un lock de aviso de Postgres) en la primera consulta de cada instancia.

## Caché

Tres capas, cada una con su motivo:

1. **Memoria del servidor (2,5 s)** — `lib/cache.ts` + `lib/licencias-db.ts`. El panel
   se refresca solo cada 5 s y puede haber varias sesiones abiertas: las peticiones
   simultáneas comparten una única consulta a Postgres. Cualquier escritura
   (`generar`, `bloquear`, `precarga` y las activaciones/cierres de la validación)
   invalida la entrada, así que nunca se muestra algo anterior a un cambio propio.
2. **HTTP con `ETag` + `304`** — el sondeo revalida y, si nada cambió, la respuesta
   viaja sin cuerpo (`x-kg-cache` permite observarlo).
3. **Sesión del navegador** — el último panel visto se guarda en `sessionStorage` (5 min) y
   se pinta al instante al recargar mientras se revalida contra el servidor.

Nada de esto cachea secretos ni respuestas de administración en cachés compartidas:
todas las respuestas de administración llevan `Cache-Control: private, no-cache` o `no-store`.

## Seguridad

- **Sesión**: token `expira.nonce.hmac`, firmado con `HMAC-SHA256` sobre `ADMIN_SECRET_KEY`;
  el nonce aleatorio evita tokens repetidos. El nonce se añade siendo compatible con los
  tokens antiguos hasta que vencen.
- **Cookie**: `HttpOnly`, `SameSite=Strict`, `Secure` en producción, 12 h.
- **CSRF**: doble barrera. `SameSite=Strict` + comprobación explícita de `Sec-Fetch-Site`/`Origin`
  en toda ruta que muta datos (solo se salta cuando la autorización viene por `x-admin-key`,
  que no usa cookie).
- **Cuerpo de las peticiones**: límite de tamaño (cabecera y contenido), `content-type`
  obligatorio cuando hay cuerpo (un formulario HTML no puede enviar `application/json`)
  y rechazo de arrays o escalares.
- **Límites de intentos**: por cliente y por clave presentada en el login (huella
  SHA-256, nunca la clave en claro), por cliente y por clave en la validación pública.
  Son un mejor esfuerzo: en serverless cada instancia cuenta por separado.
- **SQL**: consultas parametrizadas en todo `lib/`; nunca se concatena SQL con datos del usuario.
- **Cabeceras** (`next.config.ts`): CSP sin terceros, `X-Content-Type-Options`,
  `Referrer-Policy: no-referrer`, `Permissions-Policy`, `X-Robots-Tag: noindex` y, en
  producción, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy` y HSTS.
- **Comparaciones de secretos**: en tiempo constante (`timingSafeEqual` sobre SHA-256).
- **Sin `unsafe-eval` ni conexiones externas** en producción; nada de analítica de terceros.

Revisión de vulnerabilidades: `npm audit --omit=dev` → **0**. Las 5 alertas restantes son
solo de herramientas de desarrollo (cadena `eslint-config-next → fast-glob → micromatch → braces`,
advisory sin versión corregida publicada todavía) y no se despliegan: Vercel no instala
`devDependencies`. **No ejecutes `npm audit fix --force`**: rebajaría `eslint-config-next` a 14.x.
Detalles y cómo reportar en [SECURITY.md](./SECURITY.md).

## Privacidad

`/privacidad` publica la política aplicable: qué datos trata el panel (licencias,
identificador del equipo, IP para límites, la cookie técnica de sesión), con qué base
legal, cuánto tiempo se conservan, quién es el encargado (hosting y base de datos) y
cómo ejercer los derechos ARCO.

## Interfaz e interacciones

Sistema coherente, reutilizable y accesible en `components/`:

| Pieza | Archivo | Qué aporta |
| --- | --- | --- |
| Botones | `components/ui.tsx` (`Boton`, `BotonIcono`, `Chip`) | 44 px en táctil, hundimiento al pulsar, estados inactivo/cargando/éxito/error con `aria-busy`, iconos y `sr-only` |
| Pestañas | `components/pestanas.tsx` | `role="tablist"`, indicador que se desliza, flechas/Inicio/Fin, desplazamiento horizontal con degradados, swipe con bloqueo de eje |
| Carriles | `components/carril.tsx` | Scroll nativo con momentum, `scroll-snap`, indicadores de desbordamiento solo cuando hacen falta y cuadrícula en escritorio |
| Tarjetas con acciones | `components/tarjeta-acciones.tsx` | Swipe para revelar acciones **más** botón visible, `inert` cuando están ocultas, sin robar el scroll vertical |
| Combobox | `components/combobox.tsx` | `role="combobox"`/`listbox`/`option`, búsqueda sin acentos, flechas/Inicio/Fin/Enter/Escape, cierre al pulsar fuera |
| Interruptor | `components/interruptor.tsx` | `role="switch"` + `aria-checked`, estado con posición y texto |
| Plegables | `components/acordeon.tsx` | Altura animada sin saltos, `aria-expanded`/`aria-controls`, `inert` cerrado |
| Avisos | `components/avisos.tsx` | Toasts con `role="status"`/`alert`, pausa al enfocar o pasar el mouse, cierre manual |
| Diálogo | `components/dialogo.tsx` | Sustituye a `window.confirm`: foco atrapado, Escape, foco devuelto al origen |
| Gestos | `lib/gestos.ts` | Aritmética pura: proporción 1,2 entre ejes, umbrales y velocidad. Probada en `tests/gestos.test.ts` |
| Movimiento reducido | `app/globals.css` + `lib/hooks.ts` | `prefers-reduced-motion` desactiva animaciones decorativas y el scroll suave |

Los datos, la lógica de negocio y las rutas no cambiaron: el trabajo de interfaz se apoya
en las mismas respuestas de la API. Todo el panel se maneja con teclado, con toque y con
mouse, y el estado nunca depende solo del color: cada estado lleva icono o texto.

## Estructura

```
app/                 Páginas (App Router) y rutas de API
  privacidad/        Política de privacidad
components/          Interfaz del panel (cliente) y primitivas compartidas
lib/cache.ts         Caché en memoria con TTL y deduplicación
lib/etag.ts          ETag débil y respuestas 304
lib/gestos.ts        Aritmética de gestos táctiles (pura)
lib/filtro.ts        Búsqueda sin acentos y navegación por listas
lib/seguridad.ts     Mismo sitio / CSRF
lib/licencias.ts     Reglas de negocio puras (días, avisos, vencimiento)
lib/licencias-db.ts  Consultas y transiciones de estado en Postgres (+ caché)
lib/db.ts            Conexión, esquema e índices (idempotente)
lib/sesion.ts        Sesión firmada del administrador
scripts/analizar-indices.mjs  Análisis de planes y uso de índices
tests/               Pruebas unitarias (Vitest)
```

## Créditos e inspiración

Este proyecto no copia código de terceros: adoptó **ideas y patrones** de proyectos
públicos, y todo el texto y la implementación son originales. Los repositorios que
guía­ron el diseño, con su licencia:

- [license-key-manager / tabloy keygate](https://github.com/tabloy/keygate) (AGPL-3.0) — nomenclatura y flujo de estados de licencia.
- [keygen-sh/keygen-api](https://github.com/keygen-sh/keygen-api) (licencia propia del proyecto) — concepto de vincular la licencia a un equipo.
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) — semántica de pestañas, combobox, switch y diálogos.
- [radix-ui/primitives](https://github.com/radix-ui/primitives) (MIT) y [chakra-ui/ark](https://github.com/chakra-ui/ark) (MIT) — patrones de interacción accesible (no se instalaron dependencias).
- [emilkowalski/sonner](https://github.com/emilkowalski/sonner) (MIT) — comportamiento de los avisos (pausa, pila, cierre).
- [pmndrs/use-gesture](https://github.com/pmndrs/use-gesture) (MIT) — bloqueo de eje y umbrales de velocidad.
- [shadcn-ui/ui](https://github.com/shadcn-ui/ui) (MIT) — estructura de componentes reutilizables.
- [feathericons/feather](https://github.com/feathericons/feather) (MIT) — geometría de los trazos de los iconos SVG en línea.

## Notas de seguridad

- `ADMIN_SECRET_KEY` es la única credencial de administración. No hay cuentas ni registro público.
- Las sesiones son tokens firmados; cambiar la clave invalida todas las sesiones.
- Los límites de intentos están en memoria: son un freno de mejor esfuerzo en serverless.
