import { describe, expect, it } from "vitest";
import { coincide, filtrar, moverOpciones, normalizar, ordenarPorTexto } from "@/lib/filtro";

describe("normalizar", () => {
  it("quita acentos y mayúsculas", () => {
    expect(normalizar("Aplicación Ágil")).toBe("aplicacion agil");
    expect(normalizar("  DEMO   Norte ")).toBe("demo   norte");
  });

  it("trata como iguales textos con y sin diacríticos", () => {
    expect(coincide("Aplicación", "aplicacion")).toBe(true);
    expect(coincide("Ratón", "raton")).toBe(true);
    expect(coincide("Panel", "coche")).toBe(false);
  });

  it("una consulta vacía coincide con todo", () => {
    expect(coincide("lo que sea", "   ")).toBe(true);
  });
});

describe("filtrar", () => {
  const licencias = [
    { nombre_app: "Demo Atlas", clave: "APP-DEMO-ATLS-0001", dispositivo_id: null },
    { nombre_app: "Demo Taller", clave: "APP-DEMO-TALL-0027", dispositivo_id: "demo-pc-27" },
    { nombre_app: "Facturación", clave: "APP-FACT-0001-0002", dispositivo_id: "equipo-ñ" },
  ];

  const campos = (l: (typeof licencias)[number]) => [l.nombre_app, l.clave, l.dispositivo_id ?? ""];

  it("conserva el orden original", () => {
    const resultado = filtrar(licencias, "demo", campos);
    expect(resultado.map((l) => l.clave)).toEqual(["APP-DEMO-ATLS-0001", "APP-DEMO-TALL-0027"]);
  });

  it("encuentra sin acentos, en cualquier campo", () => {
    expect(filtrar(licencias, "facturacion", campos)).toHaveLength(1);
    expect(filtrar(licencias, "norte", campos)).toHaveLength(0);
    expect(filtrar(licencias, "PC-27", campos)).toHaveLength(1);
  });

  it("sin consulta devuelve una copia completa", () => {
    const resultado = filtrar(licencias, "", campos);
    expect(resultado).toHaveLength(3);
    expect(resultado).not.toBe(licencias);
  });
});

describe("ordenarPorTexto", () => {
  it("ordena ignorando acentos y mayúsculas", () => {
    expect(ordenarPorTexto(["Órbita", "atlas", "Zenit"])).toEqual(["atlas", "Órbita", "Zenit"]);
  });
});

describe("navegación con teclado en listas", () => {
  it("baja y sube con salto al otro extremo", () => {
    expect(moverOpciones("ArrowDown", { total: 3, activo: 2 })).toBe(0);
    expect(moverOpciones("ArrowUp", { total: 3, activo: 0 })).toBe(2);
  });

  it("al no haber opción activa, baja a la primera y sube a la última", () => {
    expect(moverOpciones("ArrowDown", { total: 3, activo: -1 })).toBe(0);
    expect(moverOpciones("ArrowUp", { total: 3, activo: -1 })).toBe(2);
  });

  it("Inicio y Fin van a los extremos", () => {
    expect(moverOpciones("Home", { total: 5, activo: 3 })).toBe(0);
    expect(moverOpciones("End", { total: 5, activo: 1 })).toBe(4);
  });

  it("ignora otras teclas y listas vacías", () => {
    expect(moverOpciones("Enter", { total: 5, activo: 1 })).toBeNull();
    expect(moverOpciones("ArrowDown", { total: 0, activo: -1 })).toBeNull();
  });
});
