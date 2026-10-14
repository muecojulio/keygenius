import { describe, expect, it } from "vitest";
import { anfitrionPeticion, peticionDelMismoSitio } from "@/lib/seguridad";

const URL_PANEL = "https://panel.ejemplo.com/api/admin/bloquear";

function peticion(headers: Record<string, string>): Request {
  return new Request(URL_PANEL, { method: "POST", headers });
}

describe("peticionDelMismoSitio", () => {
  it("acepta peticiones del propio origen (Fetch Metadata)", () => {
    expect(peticionDelMismoSitio(peticion({ "sec-fetch-site": "same-origin" }))).toBe(true);
  });

  it("acepta la navegación directa", () => {
    expect(peticionDelMismoSitio(peticion({ "sec-fetch-site": "none" }))).toBe(true);
  });

  it("rechaza peticiones de otro sitio", () => {
    expect(peticionDelMismoSitio(peticion({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(peticionDelMismoSitio(peticion({ "sec-fetch-site": "same-site" }))).toBe(false);
  });

  it("sin Fetch Metadata compara el encabezado Origin", () => {
    expect(peticionDelMismoSitio(peticion({ origin: "https://panel.ejemplo.com" }))).toBe(true);
    expect(peticionDelMismoSitio(peticion({ origin: "https://malicioso.example" }))).toBe(false);
    expect(peticionDelMismoSitio(peticion({ origin: "no-es-una-url" }))).toBe(false);
  });

  it("comparando con Origin tiene en cuenta el anfitrión reenviado", () => {
    const req = new Request(URL_PANEL, {
      method: "POST",
      headers: { origin: "https://panel.ejemplo.com", "x-forwarded-host": "panel.ejemplo.com" },
    });
    expect(peticionDelMismoSitio(req)).toBe(true);
  });

  it("permite a quien no es un navegador (sin cabeceras): no hay CSRF posible", () => {
    expect(peticionDelMismoSitio(peticion({}))).toBe(true);
  });
});

describe("anfitrionPeticion", () => {
  it("usa x-forwarded-host y se queda con el primer valor", () => {
    expect(anfitrionPeticion(peticion({ "x-forwarded-host": "a.example, b.internal" }))).toBe("a.example");
  });

  it("cae a Host cuando no hay cabecera reenviada", () => {
    const req = new Request(URL_PANEL, { headers: { host: "panel.ejemplo.com" } });
    expect(anfitrionPeticion(req)).toBe("panel.ejemplo.com");
  });
});
