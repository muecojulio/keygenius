import { describe, expect, it } from "vitest";
import { aCsv, escaparCampoCsv } from "@/lib/csv";

describe("escaparCampoCsv", () => {
  it("deja intacto lo que no necesita comillas", () => {
    expect(escaparCampoCsv("Atlas")).toBe("Atlas");
    expect(escaparCampoCsv(12)).toBe("12");
  });

  it("escapa comillas dobles duplicándolas", () => {
    expect(escaparCampoCsv('App "Pro"')).toBe('"App ""Pro"""');
  });

  it("entrecomilla cuando hay separador o salto de línea", () => {
    expect(escaparCampoCsv("uno;dos")).toBe('"uno;dos"');
    expect(escaparCampoCsv("linea1\nlinea2")).toBe('"linea1\nlinea2"');
  });

  it("convierte vacíos y nulos en campo vacío", () => {
    expect(escaparCampoCsv(null)).toBe("");
    expect(escaparCampoCsv(undefined)).toBe("");
    expect(escaparCampoCsv("")).toBe("");
  });
});

describe("aCsv", () => {
  type Fila = { app: string; clave: string };
  const columnas = [
    { titulo: "Aplicación", valor: (f: Fila) => f.app },
    { titulo: "Clave", valor: (f: Fila) => f.clave },
  ];

  it("usa punto y coma y CRLF (lo que abre bien Excel en español)", () => {
    const csv = aCsv([{ app: "Atlas", clave: "APP-AAAA-BBBB-CCCC" }], columnas);
    expect(csv).toBe("Aplicación;Clave\r\nAtlas;APP-AAAA-BBBB-CCCC");
  });

  it("escapa cada campo, incluido el encabezado", () => {
    const csv = aCsv([{ app: "App; con separador", clave: 'Con "comillas"' }], columnas);
    const [, linea] = csv.split("\r\n");
    expect(linea).toBe('"App; con separador";"Con ""comillas"""');
  });

  it("con solo el encabezado sigue siendo un CSV válido", () => {
    expect(aCsv([] as Fila[], columnas)).toBe("Aplicación;Clave");
  });
});
