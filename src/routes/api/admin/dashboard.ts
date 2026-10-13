import { createFileRoute } from "@tanstack/react-router";
import { jsonError, panelAdmin } from "@/lib/keygenius.server";

export const Route = createFileRoute("/api/admin/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await panelAdmin(request);
        } catch (err) {
          return jsonError(err);
        }
      },
    },
  },
});
