import { beforeEach, describe, expect, it } from "vitest";
import {
  cuboDeSecreto,
  dentroDelCupo,
  fallosAgotados,
  ipCliente,
  olvidar,
  registrarFallo,
  reiniciarLimites,
} from "@/lib/limite";

beforeEach(() => reiniciarLimites());

describe("dentroDelCupo", () => {
  it("permite hasta el máximo y corta a partir de ahí", () => {
    expect(dentroDelCupo("ip:1", 3, 1000, 0)).toBe(true);
    expect(dentroDelCupo("ip:1", 3, 1000, 0)).toBe(true);
    expect(dentroDelCupo("ip:1", 3, 1000, 0)).toBe(true);
    expect(dentroDelCupo("ip:1", 3, 1000, 0)).toBe(false);
  });

  it("la ventana se reinicia sola", () => {
    dentroDelCupo("ip:1", 1, 1000, 0);
    expect(dentroDelCupo("ip:1", 1, 1000, 500)).toBe(false);
    expect(dentroDelCupo("ip:1", 1, 1000, 1000)).toBe(true);
  });

  it("cada clave cuenta por separado", () => {
    dentroDelCupo("ip:1", 1, 1000, 0);
    expect(dentroDelCupo("ip:2", 1, 1000, 0)).toBe(true);
  });
});

describe("fallos de acceso", () => {
  it("agota el cupo tras los fallos permitidos", () => {
    for (let i = 0; i < 3; i += 1) registrarFallo("login:1", 1000, i);
    expect(fallosAgotados("login:1", 3, 0)).toBe(true);
    expect(fallosAgotados("login:1", 4, 0)).toBe(false);
  });

  it("deja de estar agotado al vencer la ventana y al olvidar", () => {
    registrarFallo("login:1", 1000, 0);
    expect(fallosAgotados("login:1", 1, 500)).toBe(true);
    expect(fallosAgotados("login:1", 1, 1000)).toBe(false);

    registrarFallo("login:2", 1000, 0);
    olvidar("login:2");
    expect(fallosAgotados("login:2", 1, 0)).toBe(false);
  });
});

describe("ipCliente", () => {
  function con(cabeceras: Record<string, string>) {
    return ipCliente(new Request("https://panel.ejemplo.com/", { headers: cabeceras }));
  }

  it("prefiere x-real-ip (fijada por el proveedor)", () => {
    expect(con({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "10.0.0.1" })).toBe("203.0.113.7");
  });

  it("si no, usa la primera IP de x-forwarded-for", () => {
    expect(con({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" })).toBe("203.0.113.7");
  });

  it("quita corchetes de IPv6 y corta valores larguísimos", () => {
    expect(con({ "x-real-ip": "[2001:db8::1]" })).toBe("2001:db8::1");
    expect(con({ "x-real-ip": "a".repeat(200) })).toHaveLength(64);
  });

  it("sin cabeceras devuelve un valor inofensivo", () => {
    expect(con({})).toBe("desconocida");
  });
});

describe("cuboDeSecreto", () => {
  it("no guarda el secreto en claro y es estable", () => {
    const cubo = cuboDeSecreto("login-clave", "mi-clave-secreta");
    expect(cubo.startsWith("login-clave:")).toBe(true);
    expect(cubo).not.toContain("mi-clave-secreta");
    expect(cubo).toBe(cuboDeSecreto("login-clave", "mi-clave-secreta"));
    expect(cubo).not.toBe(cuboDeSecreto("login-clave", "mi-clave-secreta2"));
  });
});
