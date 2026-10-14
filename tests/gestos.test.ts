import { describe, expect, it } from "vitest";
import {
  DISTANCIA_PESTANA,
  UMBRAL_TARJETA,
  actualizarGesto,
  clasificarEje,
  decidirTarjeta,
  deltaX,
  direccionPestana,
  duracion,
  esHorizontal,
  iniciarGesto,
  limitar,
  velocidadX,
} from "@/lib/gestos";

describe("clasificación del eje", () => {
  it("no decide con movimientos pequeños (deja el gesto al navegador)", () => {
    expect(clasificarEje(5, 3)).toBeNull();
    expect(clasificarEje(-8, 9)).toBeNull();
  });

  it("exige 1,2 veces más recorrido horizontal que vertical", () => {
    expect(clasificarEje(60, 50)).toBe("horizontal"); // 60 >= 50 * 1.2
    expect(clasificarEje(50, 50)).toBe("vertical");
    expect(clasificarEje(59, 50)).toBe("vertical");
  });

  it("un desplazamiento claramente vertical es del navegador", () => {
    expect(clasificarEje(4, 90)).toBe("vertical");
  });

  it("el eje se fija una sola vez y no cambia a mitad del gesto", () => {
    const inicio = iniciarGesto(0, 0, 1000);
    const horizontal = actualizarGesto(inicio, 60, 10, 1100);
    expect(horizontal.eje).toBe("horizontal");
    // Aunque después el dedo baje mucho, el eje ya está decidido.
    const despues = actualizarGesto(horizontal, 70, 200, 1200);
    expect(despues.eje).toBe("horizontal");
    expect(esHorizontal(despues)).toBe(true);
  });
});

describe("cambio de pestaña por desliz", () => {
  function gesto(dx: number, dy: number, ms: number) {
    const inicio = iniciarGesto(200, 300, 0);
    return actualizarGesto(inicio, 200 + dx, 300 + dy, ms);
  }

  it("deslizar a la izquierda avanza de pestaña", () => {
    expect(direccionPestana(gesto(-80, 4, 250))).toBe(-1);
  });

  it("deslizar a la derecha retrocede", () => {
    expect(direccionPestana(gesto(80, -4, 250))).toBe(1);
  });

  it("un movimiento corto no cambia de pestaña", () => {
    expect(direccionPestana(gesto(-20, 0, 400))).toBe(0);
  });

  it("un tirón rápido y corto sí cambia (umbral de velocidad)", () => {
    const tirón = gesto(-30, 0, 60); // 0,5 px/ms hacia la izquierda
    expect(velocidadX(tirón)).toBeLessThan(-0.35);
    expect(direccionPestana(tirón)).toBe(-1);
  });

  it("un gesto vertical nunca cambia de pestaña", () => {
    expect(direccionPestana(gesto(-10, 120, 200))).toBe(0);
  });

  it("el umbral de distancia es el declarado", () => {
    expect(direccionPestana(gesto(-(DISTANCIA_PESTANA - 1), 0, 900))).toBe(0);
    expect(direccionPestana(gesto(-DISTANCIA_PESTANA, 0, 900))).toBe(-1);
  });
});

describe("tarjeta deslizable", () => {
  it("abre al superar la fracción del ancho de acciones", () => {
    const ancho = 120;
    expect(decidirTarjeta({ desplazamiento: -ancho * UMBRAL_TARJETA, velocidad: 0, ancho })).toBe("abrir");
    expect(decidirTarjeta({ desplazamiento: -10, velocidad: 0, ancho })).toBe("cerrar");
  });

  it("abre con un tirón rápido hacia la izquierda aunque el recorrido sea corto", () => {
    expect(decidirTarjeta({ desplazamiento: -20, velocidad: -0.8, ancho: 120 })).toBe("abrir");
  });

  it("cierra con un tirón hacia la derecha", () => {
    expect(decidirTarjeta({ desplazamiento: -100, velocidad: 0.9, ancho: 120 })).toBe("cerrar");
  });

  it("sin ancho medido, se queda cerrada", () => {
    expect(decidirTarjeta({ desplazamiento: -50, velocidad: -2, ancho: 0 })).toBe("cerrar");
  });
});

describe("utilidades", () => {
  it("limita el desplazamiento al panel de acciones", () => {
    expect(limitar(-200, -120, 0)).toBe(-120);
    expect(limitar(40, -120, 0)).toBe(0);
    expect(limitar(-60, -120, 0)).toBe(-60);
  });

  it("mide el tiempo y el desplazamiento del rastro", () => {
    const inicio = iniciarGesto(10, 10, 1000);
    const final = actualizarGesto(inicio, 40, 12, 1100);
    expect(deltaX(final)).toBe(30);
    expect(duracion(final)).toBe(100);
  });
});
