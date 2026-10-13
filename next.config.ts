import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // El cliente `pg` se ejecuta tal cual en Node (no se empaqueta).
  serverExternalPackages: ["pg"],
  // Vista previa del sandbox: permite que los recursos de desarrollo lleguen desde su host.
  allowedDevOrigins: ["*.e2b.app"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
