import { createFileRoute } from "@tanstack/react-router";
import { bloquearClave, jsonError } from "@/lib/keygenius.server";

export const Route = createFileRoute("/api/admin/bloquear")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await bloquearClave(request);
        } catch (err) {
          return jsonError(err);
        }
      },
    },
  },
});
