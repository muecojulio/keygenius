import { createFileRoute } from "@tanstack/react-router";
import { ejemplosLicencia, jsonError } from "@/lib/keygenius.server";

export const Route = createFileRoute("/api/licencia/ejemplos")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return await ejemplosLicencia();
        } catch (err) {
          return jsonError(err);
        }
      },
    },
  },
});
