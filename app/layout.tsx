import type { Metadata, Viewport } from "next";
import { ProveedorAvisos } from "@/components/avisos";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "KeyGenius · Panel de licencias", template: "%s · KeyGenius" },
  description:
    "Genera, valida y controla las licencias de tus aplicaciones: claves APP-XXXX-YYYY-ZZZZ, 32 días por licencia, vínculo al primer equipo y avisos en el día 27 y el 29.",
  applicationName: "KeyGenius",
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="text-slate-100 antialiased">
        {/* Fondo vivo: solo decorativo, nunca interfiere con la interacción. */}
        <div className="fondo-vivo" aria-hidden="true">
          <span className="mancha mancha--indigo" />
          <span className="mancha mancha--esmeralda" />
          <span className="mancha mancha--violeta" />
        </div>
        <a className="saltar" href="#contenido">
          Saltar al contenido
        </a>
        <ProveedorAvisos>{children}</ProveedorAvisos>
      </body>
    </html>
  );
}
