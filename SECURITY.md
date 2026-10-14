# Política de seguridad

KeyGenius es un panel privado de licencias: la única credencial es
`ADMIN_SECRET_KEY`. Si encuentras un problema de seguridad, **repórtalo en privado
antes de hacerlo público** a través de la pestaña *Security → Report a vulnerability*
del repositorio, o por el canal de soporte por el que adquiriste la licencia.

Incluye, si puedes: pasos para reproducirlo, impacto y la versión afectada. Se
agra­dece un plazo razonable (90 días) antes de la divulgación pública.

## Controles implementados

| Área | Medida |
| --- | --- |
| Autenticación | Clave única comparada en tiempo constante (`timingSafeEqual` sobre SHA-256) |
| Sesión | Token `expira.nonce.hmac` firmado con HMAC-SHA256 sobre `ADMIN_SECRET_KEY`; cookie `HttpOnly`, `SameSite=Strict`, `Secure` en producción, 12 h |
| CSRF | `SameSite=Strict` + comprobación de `Sec-Fetch-Site`/`Origin` en rutas que mutan datos |
| Entradas | Validación y limpieza por campo, límite de cuerpo, `content-type: application/json` obligatorio cuando hay cuerpo |
| SQL | Consultas siempre parametrizadas (`$1`, `$2`…); nada de concatenar valores |
| Fuerza bruta | Cupos por cliente y por clave (huellas SHA-256) en login y validación |
| Fugas de información | Errores genéricos al cliente, detalle solo en los registros del servidor; nunca se devuelven valores de variables de entorno |
| Cabeceras | CSP sin terceros, `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `X-Robots-Tag`, HSTS y `X-Frame-Options: DENY` en producción |
| CORS | `access-control-allow-origin: *` solo en el endpoint público de validación, sin credenciales |

## Revisión de dependencias

```
npm audit --omit=dev   → 0 vulnerabilidades
npm audit              → 5 altas, todas en herramientas de desarrollo
```

Las 5 alertas restantes provienen de la cadena de ESLint
(`eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`,
`GHSA-vfj7-8cjw-p6xm`). **No se despliegan**: Vercel no instala `devDependencies`, y el
componente afectado no procesa entradas de usuarios. Está publicado el *advisory* pero
todavía no existe una versión corregida de `braces` (la última, 3.0.3, sigue dentro del
rango vulnerable), así que no hay actualización posible. `vitest` sí se actualizó a 4.x
en este cambio, que elimina las alertas de `tinypool` y `@vitest/mocker`.

**No uses `npm audit fix --force`**: propondría bajar `eslint-config-next` a 14.x, una
regresión mayor del linter, sin resolver el problema de `braces`.

## Riesgos aceptados (documentados)

1. **Límites de intentos en memoria.** En serverless cada instancia cuenta por separado y
   el contador se reinicia con la instancia. Es un freno de mejor esfuerzo; la defensa real
   es una `ADMIN_SECRET_KEY` larga y aleatoria (≥ 12 caracteres) y el plazo de la sesión.
2. **`unsafe-inline` en la CSP** para estilos y scripts, porque no hay middleware que inyecte
   nonces. No hay contenido generado por usuarios, así que la superficie de XSS es mínima.
3. **Caché en memoria de 2,5 s** en el listado del panel: otra instancia puede servir un
   dato con esa antigüedad máxima. Nunca se cachean secretos ni respuestas de validación.
4. **`x-forwarded-for` es falsificable** fuera del proveedor de hosting; se prefiere
   `x-real-ip`, que sí fija la plataforma.

## Buenas prácticas para operarlo

- Define `ADMIN_SECRET_KEY` con al menos 32 caracteres aleatorios y **cámbiala** si se filtra
  (cambiar la clave invalida todas las sesiones al instante).
- Usa siempre HTTPS (Vercel lo aplica) y no compartas la clave por canales inseguros.
- Revisa la pestaña *Security* del repositorio y ejecuta `npm audit --omit=dev` tras cada actualización.
- Haz copias de seguridad de la base de datos: el bloqueo manual de una clave no se puede deshacer.
