import { createFileRoute } from "@tanstack/react-router";
import { generarClaves, jsonError } from "@/lib/keygenius.server";

export const Route = createFileRoute("/api/admin/generar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await generarClaves(request);
        } catch (err) {
          return jsonError(err);
        }
      },
    },
  },
});
