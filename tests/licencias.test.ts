import { describe, expect, it } from "vitest";
import {
  CLAVE_REGEX,
  DIA_MS,
  MSG_OTRO_EQUIPO,
  MSG_REVOCADA,
  MSG_VENCIDA,
  avisoPorDia,
  avisoVista,
  evaluarAcceso,
  fechasActivacion,
  medirLicencia,
  type LicenciaRegla,
} from "@/lib/licencias";
import { generarSerial } from "@/lib/serial";

const INICIO = new Date("2026-01-01T12:00:00.000Z");

/** Licencia activada `dias` días antes de `ahora` por el equipo indicado. */
function activada(dias: number, ahora: Date, equipo = "equipo-A", estado: LicenciaRegla["estado"] = "ACTIVA"): LicenciaRegla {
  const { activacion, expiracion } = fechasActivacion(new Date(ahora.getTime() - dias * DIA_MS));
  return { estado, dispositivo_id: equipo, fecha_activacion: activacion, fecha_expiracion: expiracion };
}

describe("primer uso", () => {
  it("la expiración queda exactamente a 32 días naturales de la activación", () => {
    const { activacion, expiracion } = fechasActivacion(INICIO);
    expect(activacion.getTime()).toBe(INICIO.getTime());
    expect(expiracion.getTime() - activacion.getTime()).toBe(32 * DIA_MS);
  });

  it("una licencia recién activada da acceso con 0 días consumidos", () => {
    const lic = activada(0, INICIO);
    const r = evaluarAcceso(lic, "equipo-A", INICIO);
    expect(r).toEqual({
      acceso: true,
      estado: "ACTIVA",
      diasTranscurridos: 0,
      diasRestantesPara30: 30,
      diasParaBloqueoTotal: 32,
      aviso: null,
    });
  });
});

describe("avisos de tiempo", () => {
  it("avisa en el día 27 (faltan 3 para 30)", () => {
    const ahora = new Date(INICIO.getTime() + 27 * DIA_MS + 1000);
    const r = evaluarAcceso(activada(27, ahora), "equipo-A", ahora);
    expect(r.acceso).toBe(true);
    expect(r.diasTranscurridos).toBe(27);
    expect(r.diasRestantesPara30).toBe(3);
    expect(r.diasParaBloqueoTotal).toBe(5);
    expect(r.aviso).toBe("Día 27: faltan 3 días para llegar a 30.");
  });

  it("avisa en el día 29 (falta 1 para 30)", () => {
    const ahora = new Date(INICIO.getTime() + 29 * DIA_MS + 1000);
    const r = evaluarAcceso(activada(29, ahora), "equipo-A", ahora);
    expect(r.acceso).toBe(true);
    expect(r.diasRestantesPara30).toBe(1);
    expect(r.aviso).toBe("Día 29: falta 1 día para llegar a 30.");
  });

  it("no avisa en los demás días", () => {
    for (const dia of [0, 1, 26, 28, 30, 31]) {
      expect(avisoPorDia(dia)).toBeNull();
    }
  });
});

describe("otro equipo", () => {
  it("niega el acceso con el mensaje exacto y no cambia el equipo guardado", () => {
    const ahora = new Date(INICIO.getTime() + 2 * DIA_MS);
    const r = evaluarAcceso(activada(2, ahora, "equipo-A"), "equipo-B", ahora);
    expect(r.acceso).toBe(false);
    expect(r.aviso).toBe("Esta clave ya está vinculada a otra computadora");
    expect(r.aviso).toBe(MSG_OTRO_EQUIPO);
  });
});

describe("vencimiento a 32 días", () => {
  it("sigue vigente a los 31 días y 23 horas", () => {
    const ahora = new Date(INICIO.getTime() + 32 * DIA_MS - 60_000);
    const r = evaluarAcceso(activada(0, INICIO), "equipo-A", ahora);
    expect(r.acceso).toBe(true);
    expect(r.estado).toBe("ACTIVA");
    expect(r.diasParaBloqueoTotal).toBe(1);
  });

  it("al cumplir 32 días queda BLOQUEADA y niega el acceso", () => {
    const ahora = new Date(INICIO.getTime() + 32 * DIA_MS);
    const r = evaluarAcceso(activada(0, INICIO), "equipo-A", ahora);
    expect(r.acceso).toBe(false);
    expect(r.estado).toBe("BLOQUEADA");
    expect(r.diasParaBloqueoTotal).toBe(0);
    expect(r.aviso).toBe(MSG_VENCIDA);
  });

  it("pasados más de 32 días también niega, aunque sea el mismo equipo", () => {
    const ahora = new Date(INICIO.getTime() + 40 * DIA_MS);
    const r = evaluarAcceso(activada(0, INICIO), "equipo-A", ahora);
    expect(r.acceso).toBe(false);
    expect(r.estado).toBe("BLOQUEADA");
    expect(r.diasTranscurridos).toBe(40);
  });
});

describe("bloqueo manual", () => {
  it("una clave revocada niega el acceso y no muestra días restantes", () => {
    const ahora = new Date(INICIO.getTime() + 5 * DIA_MS);
    const lic = activada(5, ahora, "equipo-A", "BLOQUEADA");
    const r = evaluarAcceso(lic, "equipo-A", ahora);
    expect(r.acceso).toBe(false);
    expect(r.estado).toBe("BLOQUEADA");
    expect(r.aviso).toBe(MSG_REVOCADA);
    expect(r.diasParaBloqueoTotal).toBe(0);
    expect(r.diasRestantesPara30).toBe(0);
    expect(r.diasTranscurridos).toBe(5);
  });
});

describe("medición de la vista del panel", () => {
  it("una licencia sin activar no tiene días consumidos", () => {
    const m = medirLicencia({ estado: "DISPONIBLE", dispositivo_id: null, fecha_activacion: null, fecha_expiracion: null }, INICIO);
    expect(m.activada).toBe(false);
    expect(m.dias).toBe(0);
    expect(avisoVista({ estado: "DISPONIBLE", dispositivo_id: null, fecha_activacion: null, fecha_expiracion: null }, INICIO)).toBeNull();
  });

  it("muestra el aviso del día 27 también en el panel", () => {
    const ahora = new Date(INICIO.getTime() + 27 * DIA_MS + 5000);
    expect(avisoVista(activada(27, ahora), ahora)).toBe("Día 27: faltan 3 días para llegar a 30.");
  });

  it("una licencia vencida se muestra como bloqueada con mensaje de vencimiento", () => {
    const ahora = new Date(INICIO.getTime() + 33 * DIA_MS);
    expect(avisoVista(activada(0, INICIO), ahora)).toBe(MSG_VENCIDA);
  });
});

describe("formato de la clave", () => {
  it("el serial generado cumple APP-XXXX-YYYY-ZZZZ y no usa 0, O, 1 ni I", () => {
    const seriales = new Set<string>();
    for (let i = 0; i < 2000; i += 1) {
      const s = generarSerial();
      expect(CLAVE_REGEX.test(s)).toBe(true);
      expect(s).not.toMatch(/[01IO]/);
      seriales.add(s);
    }
    // Con 32^12 combinaciones, 2000 seriales deben ser todos distintos.
    expect(seriales.size).toBe(2000);
  });

  it("rechaza formatos incorrectos", () => {
    expect(CLAVE_REGEX.test("APP-ABCD-EFGH")).toBe(false);
    expect(CLAVE_REGEX.test("app-abcd-efgh-ijkl")).toBe(false);
    expect(CLAVE_REGEX.test("APP-ABCD-EFGH-IJKL-MNOP")).toBe(false);
    expect(CLAVE_REGEX.test("APP-ABCD-EFGH-IJKL")).toBe(true);
  });
});
