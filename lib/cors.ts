// Cabeceras CORS del endpoint público de validación.
//
// Es deliberadamente abierto (`*`) porque lo consumen las aplicaciones de
// escritorio de los clientes desde otros orígenes, y no viaja ninguna cookie:
// la autenticación es la propia clave de licencia. Nunca añadir aquí
// `access-control-allow-credentials`.
export const CORS_VALIDAR = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "600",
} as const;
