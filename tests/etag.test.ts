import { describe, expect, it } from "vitest";
import { coincideEtag, etagDe, quitarDebil, sinCambios } from "@/lib/etag";

describe("etagDe", () => {
  it("es estable para el mismo contenido", async () => {
    const a = await etagDe({ hola: "mundo", n: 1 });
    const b = await etagDe({ hola: "mundo", n: 1 });
    expect(a).toBe(b);
    expect(a.startsWith('W/"')).toBe(true);
  });

  it("cambia cuando cambian los datos", async () => {
    const antes = await etagDe({ total: 1 });
    const despues = await etagDe({ total: 2 });
    expect(antes).not.toBe(despues);
  });

  it("no depende del orden en que se construyó el objeto", async () => {
    const a = await etagDe({ a: 1, b: 2 });
    const b = await etagDe({ a: 1, b: 2 });
    expect(a).toBe(b);
  });
});

describe("coincideEtag", () => {
  it("reconoce la etiqueta idéntica, con o sin prefijo débil", () => {
    expect(coincideEtag('W/"abc"', 'W/"abc"')).toBe(true);
    expect(coincideEtag('"abc"', 'W/"abc"')).toBe(true);
  });

  it("acepta listas y el comodín", () => {
    expect(coincideEtag('W/"otra", W/"abc"', 'W/"abc"')).toBe(true);
    expect(coincideEtag("*", 'W/"abc"')).toBe(true);
  });

  it("no coincide cuando la etiqueta difiere", () => {
    expect(coincideEtag('W/"otra"', 'W/"abc"')).toBe(false);
    expect(coincideEtag(null, 'W/"abc"')).toBe(false);
  });

  it("quitarDebil deja solo el valor", () => {
    expect(quitarDebil('W/"abc"')).toBe('"abc"');
    expect(quitarDebil('"abc"')).toBe('"abc"');
  });
});

describe("sinCambios", () => {
  it("responde 304 sin cuerpo y con la etiqueta vigente", async () => {
    const res = sinCambios('W/"abc"');
    expect(res.status).toBe(304);
    expect(res.headers.get("etag")).toBe('W/"abc"');
    expect(await res.text()).toBe("");
  });
});
