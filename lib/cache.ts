// Caché en memoria con vencimiento y deduplicación de trabajo en curso.
//
// El panel se refresca solo cada pocos segundos y puede haber varias sesiones
// abiertas a la vez: esta caché evita que N peticiones simultáneas golpeen
// Postgres con la misma consulta y sirve respuestas instantáneas durante una
// ventana corta. Es por instancia (como corresponde en serverless) y siempre
// se invalida al escribir.

export type EntradaCache<V> = {
  valor: V;
  /** Momento (epoch) en que el valor dejó de ser fresco. */
  expira: number;
  /** Momento (epoch) en que se produjo: sirve de sello estable para ETag. */
  producidoEn: number;
};

export type ResultadoCache<V> = EntradaCache<V> & { deCache: boolean };

export type CacheTtl<V> = {
  leer: (clave: string, ahora?: number) => EntradaCache<V> | undefined;
  guardar: (clave: string, valor: V, ahora?: number) => EntradaCache<V>;
  invalidar: (clave?: string) => void;
  tamano: () => number;
};

/** Caché con TTL y desalojo por orden de inserción (el más antiguo primero). */
export function crearCache<V>({ ttlMs, maxEntradas = 200 }: { ttlMs: number; maxEntradas?: number }): CacheTtl<V> {
  const datos = new Map<string, EntradaCache<V>>();

  function purgar(ahora: number): void {
    for (const [clave, entrada] of datos) {
      if (entrada.expira <= ahora) datos.delete(clave);
    }
    while (datos.size > maxEntradas) {
      const masAntigua = datos.keys().next();
      if (masAntigua.done) break;
      datos.delete(masAntigua.value);
    }
  }

  return {
    leer(clave, ahora = Date.now()) {
      const entrada = datos.get(clave);
      if (!entrada || entrada.expira <= ahora) return undefined;
      return entrada;
    },
    guardar(clave, valor, ahora = Date.now()) {
      const entrada: EntradaCache<V> = { valor, expira: ahora + ttlMs, producidoEn: ahora };
      datos.set(clave, entrada);
      // Se purga después de insertar: así el desalojo respeta el tamaño máximo.
      purgar(ahora);
      return entrada;
    },
    invalidar(clave) {
      if (clave === undefined) datos.clear();
      else datos.delete(clave);
    },
    tamano() {
      return datos.size;
    },
  };
}

/**
 * Envuelve un productor asíncrono con caché de frescura corta: si hay un valor
 * fresco lo devuelve, si ya venció (o falta) lo recalcula, y si dos llamadas
 * llegan a la vez comparten una sola ejecución.
 */
export function memoizar<T>({ ttlMs, maxEntradas = 50 }: { ttlMs: number; maxEntradas?: number }) {
  const cache = crearCache<T>({ ttlMs, maxEntradas });
  const enVuelo = new Map<string, Promise<ResultadoCache<T>>>();

  async function obtener(clave: string, producir: () => Promise<T>): Promise<ResultadoCache<T>> {
    const fresca = cache.leer(clave);
    if (fresca) return { ...fresca, deCache: true };

    const pendiente = enVuelo.get(clave);
    if (pendiente) return pendiente;

    const trabajo = (async () => {
      try {
        const valor = await producir();
        return { ...cache.guardar(clave, valor), deCache: false };
      } finally {
        enVuelo.delete(clave);
      }
    })();

    enVuelo.set(clave, trabajo);
    return trabajo;
  }

  return {
    obtener,
    /** Sello temporal del dato cacheado, útil para ETag o "actualizado a las…". */
    sello(clave: string): string | null {
      const entrada = cache.leer(clave);
      return entrada ? new Date(entrada.producidoEn).toISOString() : null;
    },
    invalidar(clave?: string) {
      cache.invalidar(clave);
    },
    tamano: cache.tamano,
  };
}
