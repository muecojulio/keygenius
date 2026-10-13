import { createFileRoute } from "@tanstack/react-router";
import { cerrarSesion, estadoSesion, iniciarSesion, jsonError } from "@/lib/keygenius.server";

export const Route = createFileRoute("/api/admin/sesion")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await estadoSesion(request);
        } catch (err) {
          return jsonError(err);
        }
      },
      POST: async ({ request }) => {
        try {
          return await iniciarSesion(request);
        } catch (err) {
          return jsonError(err);
        }
      },
      DELETE: async ({ request }) => {
        try {
          return await cerrarSesion(request);
        } catch (err) {
          return jsonError(err);
        }
      },
    },
  },
});
