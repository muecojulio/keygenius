import { createFileRoute } from "@tanstack/react-router";
import { configurarAdmin, jsonError } from "@/lib/keygenius.server";

export const Route = createFileRoute("/api/admin/configurar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await configurarAdmin(request);
        } catch (err) {
          return jsonError(err);
        }
      },
    },
  },
});
