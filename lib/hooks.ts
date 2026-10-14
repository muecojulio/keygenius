"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

/** ¿El usuario pidió movimiento reducido? Se mantiene al día si cambia. */
export function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const alCambiar = () => setReducido(consulta.matches);
    alCambiar();
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);

  return reducido;
}

/**
 * Indica si hay contenido fuera de vista a izquierda o derecha del carril y lo
 * mantiene al día mientras se desplaza, cambia el tamaño o cambian los hijos.
 */
export function useDesborde<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [estado, setEstado] = useState({ izquierda: false, derecha: false });

  const comprobar = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const izquierda = el.scrollLeft > 4;
    const derecha = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEstado((previo) => (previo.izquierda === izquierda && previo.derecha === derecha ? previo : { izquierda, derecha }));
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    comprobar();

    el.addEventListener("scroll", comprobar, { passive: true });
    window.addEventListener("resize", comprobar);
    const observador = new ResizeObserver(comprobar);
    observador.observe(el);
    const mutaciones = new MutationObserver(comprobar);
    mutaciones.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener("scroll", comprobar);
      window.removeEventListener("resize", comprobar);
      observador.disconnect();
      mutaciones.disconnect();
    };
  }, [ref, comprobar]);

  return { ...estado, comprobar };
}

/** Ejecuta `alFuera` con el primer puntero que cae fuera del contenedor. */
export function useToqueFuera(ref: RefObject<HTMLElement | null>, activo: boolean, alFuera: () => void): void {
  const devolucion = useRef(alFuera);

  useEffect(() => {
    devolucion.current = alFuera;
  }, [alFuera]);

  useEffect(() => {
    if (!activo) return;
    function alPulsar(evento: PointerEvent) {
      const el = ref.current;
      if (!el) return;
      if (evento.target instanceof Node && el.contains(evento.target)) return;
      devolucion.current();
    }
    document.addEventListener("pointerdown", alPulsar);
    return () => document.removeEventListener("pointerdown", alPulsar);
  }, [activo, ref]);
}

/** Bloquea el scroll del documento mientras un diálogo está abierto. */
export function useBloqueoScroll(activo: boolean): void {
  useEffect(() => {
    if (!activo) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [activo]);
}

/**
 * Atrapa el foco dentro de `contenedor` mientras esté activo, cierra con Escape
 * y devuelve el foco al elemento que abrió el diálogo.
 */
export function useFocoTrampa(
  contenedor: RefObject<HTMLElement | null>,
  activo: boolean,
  alEscape?: () => void,
): void {
  const escape = useRef(alEscape);

  useEffect(() => {
    escape.current = alEscape;
  }, [alEscape]);

  useEffect(() => {
    if (!activo) return;
    const el = contenedor.current;
    if (!el) return;
    const zona: HTMLElement = el;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const enfocables = () =>
      Array.from(
        zona.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((nodo) => nodo.offsetParent !== null || nodo === document.activeElement);

    enfocables()[0]?.focus();

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        escape.current?.();
        return;
      }
      if (evento.key !== "Tab") return;
      const lista = enfocables();
      if (lista.length === 0) {
        evento.preventDefault();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const actual = document.activeElement;
      if (!primero || !ultimo) return;
      if (evento.shiftKey && (actual === primero || !zona.contains(actual))) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (actual === ultimo || !zona.contains(actual))) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alTeclear, true);
    return () => {
      document.removeEventListener("keydown", alTeclear, true);
      previo?.focus();
    };
  }, [activo, contenedor]);
}

/** Sondeo periódico que se detiene cuando la pestaña está oculta. */
export function useSondeo(
  alSondear: () => void,
  { activo, intervaloMs }: { activo: boolean; intervaloMs: number },
): void {
  const devolucion = useRef(alSondear);

  useEffect(() => {
    devolucion.current = alSondear;
  }, [alSondear]);

  useEffect(() => {
    if (!activo) return;
    const id = window.setInterval(() => {
      if (!document.hidden) devolucion.current();
    }, intervaloMs);
    return () => window.clearInterval(id);
  }, [activo, intervaloMs]);
}

/* ── Preferencias en localStorage ─────────────────────────────────────────
   Se leen con `useSyncExternalStore` para que el servidor renderice el valor
   por defecto y el cliente se sincronice después de hidratar, sin desajustes y
   sin `setState` dentro de un efecto. */

type Escucha = () => void;

const suscriptores = new Map<string, Set<Escucha>>();
const instantaneas = new Map<string, unknown>();
const crudos = new Map<string, string | null>();

function leerCrudo(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

/** Valor actual del almacén, con referencia estable mientras el texto no cambie. */
function instantanea<T>(clave: string, inicial: T): T {
  const crudo = leerCrudo(clave);
  if (crudos.get(clave) === crudo) return (instantaneas.get(clave) as T | undefined) ?? inicial;

  let valor = inicial;
  if (crudo !== null) {
    try {
      valor = JSON.parse(crudo) as T;
    } catch {
      valor = inicial;
    }
  }
  crudos.set(clave, crudo);
  instantaneas.set(clave, valor);
  return valor;
}

function notificar(clave: string): void {
  for (const escucha of suscriptores.get(clave) ?? []) escucha();
}

function suscribir(clave: string, escucha: Escucha): () => void {
  const conjunto = suscriptores.get(clave) ?? new Set<Escucha>();
  conjunto.add(escucha);
  suscriptores.set(clave, conjunto);

  // Mantiene sincronizadas las demás pestañas del mismo origen.
  const alCambiarAlmacen = (evento: StorageEvent) => {
    if (evento.key === null || evento.key === clave) escucha();
  };
  window.addEventListener("storage", alCambiarAlmacen);

  return () => {
    conjunto.delete(escucha);
    window.removeEventListener("storage", alCambiarAlmacen);
  };
}

/** Preferencia persistente (por ejemplo, si la actualización es automática). */
export function usePreferencia<T>(clave: string, inicial: T): [T, (valor: T) => void] {
  const suscribirClave = useCallback((escucha: Escucha) => suscribir(clave, escucha), [clave]);
  const leer = useCallback(() => instantanea(clave, inicial), [clave, inicial]);
  const leerEnServidor = useCallback(() => inicial, [inicial]);
  const valor = useSyncExternalStore(suscribirClave, leer, leerEnServidor);

  const guardar = useCallback(
    (nuevo: T) => {
      crudos.set(clave, JSON.stringify(nuevo));
      instantaneas.set(clave, nuevo);
      try {
        window.localStorage.setItem(clave, JSON.stringify(nuevo));
      } catch {
        // Modo privado o cuota llena: la preferencia dura solo esta sesión.
      }
      notificar(clave);
    },
    [clave],
  );

  return [valor, guardar];
}
