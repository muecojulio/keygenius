import type { NextConfig } from "next";

const esProduccion = process.env.NODE_ENV === "production";

/**
 * Anfitriones que pueden incrustar la app. En producción no se permite ninguno
 * (panel privado ⇒ sin clickjacking); en desarrollo se permite la vista previa
 * del sandbox para poder revisar la interfaz dentro de su marco.
 */
const MARCO_DESARROLLO = "'self' https://*.e2b.app https://e2b.app https://*.arena.ai";

/**
 * Content Security Policy sin nonces (no hay middleware que los inyecte):
 * se permite `'unsafe-inline'` en estilos y scripts porque Next los emite
 * incrustados. Nada de `unsafe-eval` fuera de desarrollo y ninguna conexión a
 * terceros: la app no carga analítica, tipografías ni CDNs ajenos.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'self'",
  `frame-ancestors ${esProduccion ? "'none'" : MARCO_DESARROLLO}`,
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${esProduccion ? "" : " 'unsafe-eval'"}`,
  `connect-src 'self'${esProduccion ? "" : " ws: wss:"}`,
  "manifest-src 'self'",
  esProduccion ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const cabecerasSeguridad = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()",
  },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Solo en producción: en desarrollo rompería la vista previa incrustada.
  ...(esProduccion
    ? [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // El cliente `pg` se ejecuta tal cual en Node (no se empaqueta).
  serverExternalPackages: ["pg"],
  // Vista previa del sandbox: permite que los recursos de desarrollo lleguen desde su host.
  allowedDevOrigins: ["*.e2b.app", "*.arena.ai"],
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
};

export default nextConfig;
