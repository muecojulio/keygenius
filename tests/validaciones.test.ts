import { describe, expect, it } from "vitest";
import {
  limpiarCantidad,
  limpiarClave,
  limpiarDispositivo,
  limpiarIdLicencia,
  limpiarNombreApp,
} from "@/lib/validaciones";
import { claveCoincide, crearToken, tokenValido, DURACION_SESION_MS } from "@/lib/sesion";

describe("limpieza de entradas", () => {
  it("normaliza la clave a mayúsculas y rechaza formatos inválidos", () => {
    expect(limpiarClave(" app-abcd-efgh-ijk2 ")).toBe("APP-ABCD-EFGH-IJK2");
    expect(limpiarClave("APP-ABCD-EFGH")).toBeNull();
    expect(limpiarClave(12345)).toBeNull();
  });

  it("colapsa espacios del nombre y limita la longitud", () => {
    expect(limpiarNombreApp("  Atlas    Escritorio ")).toBe("Atlas Escritorio");
    expect(limpiarNombreApp("A")).toBeNull();
    expect(limpiarNombreApp("x".repeat(81))).toBeNull();
    expect(limpiarNombreApp("Hola\u0007")).toBeNull();
  });

  it("valida el identificador del equipo", () => {
    expect(limpiarDispositivo("pc-01")).toBe("pc-01");
    expect(limpiarDispositivo("abc")).toBeNull();
    expect(limpiarDispositivo("")).toBeNull();
  });

  it("el identificador de licencia solo acepta enteros positivos", () => {
    expect(limpiarIdLicencia(12)).toBe(12);
    expect(limpiarIdLicencia("12")).toBe(12);
    expect(limpiarIdLicencia(1)).toBe(1);
    expect(limpiarIdLicencia(0)).toBeNull();
    expect(limpiarIdLicencia(-3)).toBeNull();
    expect(limpiarIdLicencia(2.5)).toBeNull();
    expect(limpiarIdLicencia("abc")).toBeNull();
    expect(limpiarIdLicencia("")).toBeNull();
    expect(limpiarIdLicencia(null)).toBeNull();
    expect(limpiarIdLicencia(undefined)).toBeNull();
    expect(limpiarIdLicencia(true)).toBeNull();
    expect(limpiarIdLicencia({ id: 4 })).toBeNull();
  });

  it("la cantidad va de 1 a 10 y por defecto es 1", () => {
    expect(limpiarCantidad(undefined)).toBe(1);
    expect(limpiarCantidad("3")).toBe(3);
    expect(limpiarCantidad(10)).toBe(10);
    expect(limpiarCantidad(0)).toBeNull();
    expect(limpiarCantidad(11)).toBeNull();
    expect(limpiarCantidad(2.5)).toBeNull();
  });
});

describe("sesión del administrador", () => {
  const secreto = "clave-de-prueba-larga-123";

  it("un token recién creado es válido", () => {
    const ahora = new Date("2026-06-01T10:00:00Z");
    expect(tokenValido(crearToken(secreto, ahora), secreto, ahora)).toBe(true);
  });

  it("caduca después de 12 horas", () => {
    const ahora = new Date("2026-06-01T10:00:00Z");
    const token = crearToken(secreto, ahora);
    const despues = new Date(ahora.getTime() + DURACION_SESION_MS + 1);
    expect(tokenValido(token, secreto, despues)).toBe(false);
  });

  it("un token firmado con otra clave o alterado no es válido", () => {
    const ahora = new Date("2026-06-01T10:00:00Z");
    const token = crearToken(secreto, ahora);
    expect(tokenValido(token, "otra-clave-distinta-999", ahora)).toBe(false);
    const alterado = token.replace(/^(\d+)/, (n) => String(Number(n) + 1000));
    expect(tokenValido(alterado, secreto, ahora)).toBe(false);
    expect(tokenValido(undefined, secreto, ahora)).toBe(false);
    expect(tokenValido("", secreto, ahora)).toBe(false);
  });

  it("compara claves sin depender de la longitud ni de un prefijo", () => {
    expect(claveCoincide(secreto, secreto)).toBe(true);
    expect(claveCoincide(secreto.slice(0, -1), secreto)).toBe(false);
    expect(claveCoincide(secreto + "x", secreto)).toBe(false);
  });
});

describe("límites de intentos", () => {
  it("solo los fallos agotan el cupo de login; un acceso correcto lo limpia", async () => {
    const { fallosAgotados, registrarFallo, olvidar } = await import("@/lib/limite");
    const clave = "login:test-ip";
    const t0 = 1_000_000;
    expect(fallosAgotados(clave, 2, t0)).toBe(false);
    registrarFallo(clave, 60_000, t0);
    registrarFallo(clave, 60_000, t0);
    expect(fallosAgotados(clave, 2, t0)).toBe(true);
    expect(fallosAgotados(clave, 2, t0 + 60_001)).toBe(false);
    olvidar(clave);
    expect(fallosAgotados(clave, 2, t0)).toBe(false);
  });
});
