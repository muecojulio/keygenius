import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { crearCache, memoizar } from "@/lib/cache";

describe("crearCache", () => {
  it("sirve valores frescos y deja de servirlos al vencer", () => {
    const cache = crearCache<number>({ ttlMs: 1000 });
    cache.guardar("a", 1, 0);
    expect(cache.leer("a", 999)?.valor).toBe(1);
    expect(cache.leer("a", 1000)).toBeUndefined();
  });

  it("guarda el sello de producción para ETag y 'actualizado a las…'", () => {
    const cache = crearCache<string>({ ttlMs: 10 });
    const entrada = cache.guardar("a", "hola", 5_000);
    expect(entrada.producidoEn).toBe(5_000);
    expect(cache.leer("a", 5_000)?.producidoEn).toBe(5_000);
  });

  it("desaloja lo más antiguo cuando se llena", () => {
    const cache = crearCache<number>({ ttlMs: 10_000, maxEntradas: 2 });
    cache.guardar("a", 1, 0);
    cache.guardar("b", 2, 0);
    cache.guardar("c", 3, 0);
    expect(cache.tamano()).toBe(2);
    expect(cache.leer("a", 0)).toBeUndefined();
    expect(cache.leer("c", 0)?.valor).toBe(3);
  });

  it("purga lo vencido al guardar", () => {
    const cache = crearCache<number>({ ttlMs: 100 });
    cache.guardar("viejo", 1, 0);
    cache.guardar("nuevo", 2, 500);
    expect(cache.tamano()).toBe(1);
  });

  it("invalida una entrada o todas", () => {
    const cache = crearCache<number>({ ttlMs: 1000 });
    cache.guardar("a", 1, 0);
    cache.guardar("b", 2, 0);
    cache.invalidar("a");
    expect(cache.leer("a", 0)).toBeUndefined();
    expect(cache.leer("b", 0)?.valor).toBe(2);
    cache.invalidar();
    expect(cache.tamano()).toBe(0);
  });
});

describe("memoizar", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("produce una sola vez durante la ventana de frescura", async () => {
    const producido = vi.fn(async () => "valor");
    const cache = memoizar<string>({ ttlMs: 1000 });

    expect((await cache.obtener("k", producido)).deCache).toBe(false);
    expect((await cache.obtener("k", producido)).deCache).toBe(true);
    expect(producido).toHaveBeenCalledTimes(1);
  });

  it("vuelve a producir cuando el valor vence", async () => {
    const producido = vi.fn(async () => "valor");
    const cache = memoizar<string>({ ttlMs: 1000 });
    await cache.obtener("k", producido);
    vi.advanceTimersByTime(1500);
    await cache.obtener("k", producido);
    expect(producido).toHaveBeenCalledTimes(2);
  });

  it("dos llamadas simultáneas comparten una sola ejecución", async () => {
    let resolver: (valor: string) => void = () => undefined;
    const producido = vi.fn(
      () =>
        new Promise<string>((resolverPromesa) => {
          resolver = resolverPromesa;
        }),
    );
    const cache = memoizar<string>({ ttlMs: 1000 });

    const primera = cache.obtener("k", producido);
    const segunda = cache.obtener("k", producido);
    resolver("listo");

    expect((await primera).valor).toBe("listo");
    expect((await segunda).valor).toBe("listo");
    expect(producido).toHaveBeenCalledTimes(1);
  });

  it("invalidar fuerza una nueva producción", async () => {
    const producido = vi.fn(async () => "valor");
    const cache = memoizar<string>({ ttlMs: 1000 });
    await cache.obtener("k", producido);
    cache.invalidar();
    await cache.obtener("k", producido);
    expect(producido).toHaveBeenCalledTimes(2);
  });

  it("un fallo del productor no envenena la caché", async () => {
    const producido = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("base de datos caída"))
      .mockResolvedValueOnce("bueno");
    const cache = memoizar<string>({ ttlMs: 1000 });

    await expect(cache.obtener("k", producido)).rejects.toThrow("base de datos caída");
    expect((await cache.obtener("k", producido)).valor).toBe("bueno");
  });
});
