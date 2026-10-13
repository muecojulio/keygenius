import { createFileRoute } from "@tanstack/react-router";
import { jsonError, validarLicencia, validarOptions } from "@/lib/keygenius.server";

export const Route = createFileRoute("/api/licencia/validar")({
  server: {
    handlers: {
      OPTIONS: async () => validarOptions(),
      POST: async ({ request }) => {
        try {
          return await validarLicencia(request);
        } catch (err) {
          return jsonError(err);
        }
      },
    },
  },
});
