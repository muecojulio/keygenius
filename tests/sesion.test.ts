import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DURACION_SESION_MS, claveCoincide, crearToken, huella, tokenValido } from "@/lib/sesion";

const SECRETO = "clave-de-prueba-suficientemente-larga";
const AHORA = new Date("2026-01-01T00:00:00.000Z");

describe("crearToken", () => {
  it("incluye un valor aleatorio: dos sesiones del mismo instante no comparten token", () => {
    const a = crearToken(SECRETO, AHORA);
    const b = crearToken(SECRETO, AHORA);
    expect(a).not.toBe(b);
    expect(a.split(".")).toHaveLength(3);
  });

  it("vence exactamente en la duración declarada", () => {
    const token = crearToken(SECRETO, AHORA);
    const expira = Number(token.split(".")[0]);
    expect(expira).toBe(AHORA.getTime() + DURACION_SESION_MS);
  });
});

describe("tokenValido", () => {
  it("acepta un token recién creado", () => {
    expect(tokenValido(crearToken(SECRETO, AHORA), SECRETO, AHORA)).toBe(true);
  });

  it("rechaza el token cuando vence", () => {
    const token = crearToken(SECRETO, AHORA);
    const despues = new Date(AHORA.getTime() + DURACION_SESION_MS + 1);
    expect(tokenValido(token, SECRETO, despues)).toBe(false);
  });

  it("rechaza tokens manipulados", () => {
    const token = crearToken(SECRETO, AHORA);
    const [expira, nonce] = token.split(".");
    expect(tokenValido(`${Number(expira) + 10_000}.${nonce}.firmafalsa`, SECRETO, AHORA)).toBe(false);
    expect(tokenValido(`${expira}.${nonce}.`, SECRETO, AHORA)).toBe(false);
    expect(tokenValido("sinpuntos", SECRETO, AHORA)).toBe(false);
    expect(tokenValido("", SECRETO, AHORA)).toBe(false);
    expect(tokenValido(null, SECRETO, AHORA)).toBe(false);
  });

  it("otra clave invalida todas las sesiones", () => {
    const token = crearToken(SECRETO, AHORA);
    expect(tokenValido(token, "otra-clave-igualmente-larga-y-distinta", AHORA)).toBe(false);
  });

  it("sigue aceptando el formato anterior (dos partes) hasta que vence", () => {
    // Compatibilidad: `expira.firma`, como se firmaba antes de añadir el nonce.
    const expira = String(AHORA.getTime() + 60_000);
    const firma = createHmac("sha256", SECRETO).update(`kg-admin-session:${expira}`).digest("base64url");
    expect(tokenValido(`${expira}.${firma}`, SECRETO, AHORA)).toBe(true);
  });
});

describe("claveCoincide", () => {
  it("solo acepta la clave exacta", () => {
    expect(claveCoincide(SECRETO, SECRETO)).toBe(true);
    expect(claveCoincide("otra", SECRETO)).toBe(false);
    expect(claveCoincide(SECRETO.slice(0, -1), SECRETO)).toBe(false);
    expect(claveCoincide("", SECRETO)).toBe(false);
  });
});

describe("huella", () => {
  it("es estable, corta y no reversible", () => {
    const h = huella(SECRETO);
    expect(h).toBe(huella(SECRETO));
    expect(h).toHaveLength(32);
    expect(h).not.toContain(SECRETO);
    expect(h).not.toBe(huella(`${SECRETO}!`));
  });
});
