"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { FormularioGenerar } from "@/components/formulario-generar";
import { Carril } from "@/components/carril";
import { Contador } from "@/components/contador";
import { DialogoConfirmar } from "@/components/dialogo";
import { Icono, type NombreIcono } from "@/components/iconos";
import { Interruptor } from "@/components/interruptor";
import { Pestanas, type PestanaItem } from "@/components/pestanas";
import { Probador } from "@/components/probador";
import { FILTROS_INICIALES, TablaLicencias, type FiltrosLicencias } from "@/components/tabla-licencias";
import { Banner, Boton, Esqueleto, EtiquetaEstado, Tarjeta } from "@/components/ui";
import { useAvisos } from "@/components/avisos";
import { copiarTexto, pedirJson } from "@/lib/cliente";
import { CLAVES_EJEMPLO } from "@/lib/demo";
import { formatearHora, pluralizar } from "@/lib/formato";
import { usePreferencia, useSondeo } from "@/lib/hooks";
import type { LicenciaVista, ResumenLicencias } from "@/lib/tipos";

type Datos = { licencias: LicenciaVista[]; resumen: ResumenLicencias; generadoEn: string };

const RESUMEN_VACIO: ResumenLicencias = { total: 0, disponibles: 0, activas: 0, bloqueadas: 0, porVencer: 0 };
const INTERVALO_MS = 5000;
/** Caché de sesión: la vista aparece al instante y se revalida en segundo plano. */
const CLAVE_CACHE = "kg-panel-cache";
const VIDA_CACHE_MS = 5 * 60 * 1000;

export function PanelAdmin() {
  const router = useRouter();
  const { mostrar } = useAvisos();

  const [datosFrescos, setDatosFrescos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  // Lo guardado en la sesión se lee como almacén externo: el servidor pinta los
  // esqueletos y el cliente engancha los datos guardados justo después de hidratar.
  const cache = useSyncExternalStore(suscribirCache, leerCachePanel, sinCacheEnServidor);
  const datos = datosFrescos ?? cache;
  const desdeCache = datosFrescos === null && cache !== null;
  const [automatico, setAutomatico] = usePreferencia("kg-actualizacion-automatica", true);
  const [pestana, setPestana] = useState("resumen");
  const [filtros, setFiltros] = useState<FiltrosLicencias>(FILTROS_INICIALES);
  const [porBloquear, setPorBloquear] = useState<LicenciaVista | null>(null);
  const [bloqueando, setBloqueando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<LicenciaVista | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [cargandoEjemplos, setCargandoEjemplos] = useState(false);
  const [quitandoEjemplos, setQuitandoEjemplos] = useState(false);
  const [confirmandoQuitarEjemplos, setConfirmandoQuitarEjemplos] = useState(false);
  const enCurso = useRef(false);

  const refrescar = useCallback(
    async (silencioso = false) => {
      if (enCurso.current) return;
      enCurso.current = true;
      if (!silencioso) setRefrescando(true);
      try {
        const { ok, status, body } = await pedirJson<Datos>("/api/admin/dashboard");
        if (status === 401) {
          router.refresh(); // la sesión venció: el servidor mostrará el acceso
          return;
        }
        if (status === 304) return; // sigue vigente: se conserva lo que ya está en pantalla
        if (!ok || !body.licencias || !body.resumen) throw new Error(body.error ?? "No se pudo cargar el panel.");

        const nuevos: Datos = { licencias: body.licencias, resumen: body.resumen, generadoEn: body.generadoEn };
        setDatosFrescos(nuevos);
        setError(null);
        escribirCachePanel(nuevos);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de conexión.");
      } finally {
        enCurso.current = false;
        setRefrescando(false);
      }
    },
    [router],
  );

  // Primera carga. Se difiere a una macrotarea a propósito: la primera pintura
  // (esqueletos o datos guardados) no espera a la red y no hay render en cascada
  // al montar. A partir de ahí el sondeo se encarga del resto.
  useEffect(() => {
    const id = window.setTimeout(() => void refrescar(true), 0);
    return () => window.clearTimeout(id);
  }, [refrescar]);

  useSondeo(() => void refrescar(true), {
    activo: automatico && !porBloquear && !porEliminar && !confirmandoQuitarEjemplos,
    intervaloMs: INTERVALO_MS,
  });

  const resumen = useMemo(() => datos?.resumen ?? RESUMEN_VACIO, [datos]);
  const licencias = useMemo(() => datos?.licencias ?? [], [datos]);
  const cargando = datos === null && !error;

  const nombresApps = useMemo(() => {
    const nombres = new Set(licencias.map((l) => l.nombre_app));
    return [...nombres].sort((a, b) => a.localeCompare(b, "es"));
  }, [licencias]);

  const conAviso = useMemo(
    () => licencias.filter((l) => l.aviso && l.estado !== "DISPONIBLE").slice(0, 4),
    [licencias],
  );

  const ultimas = useMemo(() => licencias.slice(0, 4), [licencias]);

  // Solo cuentan las claves exactas de la precarga: es lo único que quita el botón.
  const numeroEjemplos = useMemo(
    () => licencias.filter((l) => CLAVES_EJEMPLO.includes(l.clave)).length,
    [licencias],
  );

  const itemsPestanas: PestanaItem[] = [
    { id: "resumen", etiqueta: "Resumen", icono: "barras" },
    { id: "generar", etiqueta: "Generar", icono: "llave" },
    { id: "probar", etiqueta: "Probar", icono: "rayo" },
    { id: "licencias", etiqueta: "Licencias", icono: "escudo", contador: resumen.total },
  ];

  function verLicenciasCon(estado: FiltrosLicencias["estado"]) {
    setFiltros({ ...FILTROS_INICIALES, estado });
    setPestana("licencias");
  }

  async function cargarEjemplos() {
    setCargandoEjemplos(true);
    try {
      const { ok, status, body } = await pedirJson<{ insertadas?: number; existentes?: number }>(
        "/api/admin/precarga",
        { method: "POST" },
      );
      if (status === 401) {
        router.refresh();
        return;
      }
      if (!ok) {
        mostrar({ tipo: "error", texto: "No se pudo cargar la precarga", detalle: body.error });
        return;
      }
      mostrar({
        tipo: "ok",
        texto: "Precarga lista",
        detalle: `${pluralizar(body.insertadas ?? 0, "clave nueva", "claves nuevas")} · ${body.existentes ?? 0} ya existían`,
      });
      setPestana("licencias");
      await refrescar(true);
    } finally {
      setCargandoEjemplos(false);
    }
  }

  async function quitarEjemplos() {
    setQuitandoEjemplos(true);
    try {
      const { ok, status, body } = await pedirJson<{ eliminadas?: number }>("/api/admin/precarga", {
        method: "DELETE",
      });
      if (status === 401) {
        router.refresh();
        return;
      }
      if (!ok) {
        mostrar({ tipo: "error", texto: "No se pudieron quitar los ejemplos", detalle: body.error });
        return;
      }
      mostrar({
        tipo: "ok",
        texto: "Precarga eliminada",
        detalle:
          (body.eliminadas ?? 0) === 0
            ? "No quedaba ninguna clave de ejemplo."
            : `Se quitaron ${pluralizar(body.eliminadas ?? 0, "clave de ejemplo", "claves de ejemplo")}. Las claves reales no se tocaron.`,
      });
      setConfirmandoQuitarEjemplos(false);
      await refrescar(true);
    } finally {
      setQuitandoEjemplos(false);
    }
  }

  async function confirmarBloqueo() {
    const licencia = porBloquear;
    if (!licencia) return;
    setBloqueando(true);
    try {
      const { ok, status, body } = await pedirJson<{ licencia?: LicenciaVista }>("/api/admin/bloquear", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: licencia.id }),
      });
      if (status === 401) {
        router.refresh();
        return;
      }
      if (!ok) {
        mostrar({ tipo: "error", texto: "No se pudo bloquear la clave", detalle: body.error });
        return;
      }
      mostrar({
        tipo: "ok",
        texto: `Clave ${licencia.clave} bloqueada`,
        detalle: "El equipo pierde el acceso de inmediato.",
      });
      setPorBloquear(null);
      await refrescar(true);
    } finally {
      setBloqueando(false);
    }
  }

  /**
   * Elimina la licencia de la base. El diálogo ya avisó de que no hay vuelta
   * atrás; aquí solo queda confirmar contra el servidor y refrescar la lista.
   */
  async function confirmarEliminacion() {
    const licencia = porEliminar;
    if (!licencia) return;
    setEliminando(true);
    try {
      const { ok, status, body } = await pedirJson<{ licencia?: LicenciaVista }>("/api/admin/eliminar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: licencia.id }),
      });
      if (status === 401) {
        router.refresh();
        return;
      }
      if (!ok) {
        mostrar({ tipo: "error", texto: "No se pudo eliminar la clave", detalle: body.error });
        return;
      }
      mostrar({
        tipo: "ok",
        texto: `Clave ${licencia.clave} eliminada`,
        detalle:
          licencia.estado === "ACTIVA"
            ? "Ya no existe: el equipo pierde el acceso al validarla."
            : "Ya no está en la base de datos.",
      });
      setPorEliminar(null);
      await refrescar(true);
    } finally {
      setEliminando(false);
    }
  }

  async function cerrarSesion() {
    await fetch("/api/admin/sesion", { method: "DELETE" });
    router.refresh();
  }

  return (
    <main id="contenido" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-400 text-slate-950 shadow-lg shadow-indigo-900/50">
            <Icono nombre="llave" className="size-6" trazo={2} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="texto-degradado">KeyGenius</span>
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2">
                <span className="punto-vivo" aria-hidden="true" />
                {automatico ? "En vivo" : "Manual"}
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="tabular-nums">
                {desdeCache
                  ? "mostrando datos guardados…"
                  : datos
                    ? `actualizado a las ${formatearHora(new Date(datos.generadoEn))}`
                    : "cargando…"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Boton
            variante={numeroEjemplos > 0 ? "secundario" : "primario"}
            icono={numeroEjemplos > 0 ? "papelera" : "chispa"}
            estado={cargandoEjemplos || quitandoEjemplos ? "cargando" : "inactivo"}
            title={
              numeroEjemplos > 0
                ? `Quitar la precarga (${pluralizar(numeroEjemplos, "clave de ejemplo", "claves de ejemplo")})`
                : "Cargar las claves de ejemplo (Demo …)"
            }
            onClick={() => {
              if (numeroEjemplos > 0) {
                setConfirmandoQuitarEjemplos(true);
              } else {
                void cargarEjemplos();
              }
            }}
          >
            {cargandoEjemplos
              ? "Precargando…"
              : quitandoEjemplos
                ? "Quitando precarga…"
                : numeroEjemplos > 0
                  ? "Quitar precarga"
                  : "Precargar"}
          </Boton>
          <Boton icono="refrescar" estado={refrescando ? "cargando" : "inactivo"} onClick={() => void refrescar()}>
            {refrescando ? "Actualizando…" : "Actualizar"}
          </Boton>
          <Boton icono="salir" onClick={() => void cerrarSesion()}>
            Cerrar sesión
          </Boton>
        </div>
      </header>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <Interruptor
          activo={automatico}
          onCambiar={(valor) => {
            setAutomatico(valor);
            mostrar({
              tipo: "info",
              texto: valor ? "Actualización automática activada" : "Actualización automática desactivada",
              detalle: valor ? `Se consulta cada ${INTERVALO_MS / 1000} segundos.` : "Puedes actualizar a mano cuando quieras.",
            });
          }}
          etiqueta="Actualización automática"
          descripcion={`Consulta al servidor cada ${INTERVALO_MS / 1000} s`}
        />
        <p className="px-2 text-xs text-slate-500">
          Las respuestas sin cambios se revalidan con ETag: el sondeo no vuelve a descargar datos idénticos.
        </p>
      </div>

      {error && (
        <Banner tono="error" titulo="No se pudo actualizar el panel" className="mt-5">
          <span className="flex flex-wrap items-center gap-3">
            {error}
            <Boton tamano="sm" icono="refrescar" onClick={() => void refrescar()}>
              Reintentar
            </Boton>
          </span>
        </Banner>
      )}

      <Pestanas
        items={itemsPestanas}
        activa={pestana}
        onCambiar={setPestana}
        etiqueta="Secciones del panel"
        className="mt-6"
      >
        {(id) => {
          if (id === "generar") {
            return (
              <div className="grid gap-5 lg:grid-cols-3">
                <FormularioGenerar apps={nombresApps} onGenerado={() => refrescar(true)} />
                <Tarjeta className="lg:col-span-2">
                  <h2 className="text-lg font-semibold text-slate-50">Cómo funcionan las claves</h2>
                  <ul className="mt-4 space-y-3 text-sm text-slate-300">
                    <Punto icono="llave" titulo="Formato APP-XXXX-YYYY-ZZZZ">
                      Generadas con un generador criptográfico y sin caracteres que se confundan (0/O, 1/I).
                    </Punto>
                    <Punto icono="equipo" titulo="Primer uso: se vincula el equipo">
                      La clave se ata al <code className="font-mono text-indigo-200">dispositivo_id</code> que la
                      activa y queda con 32 días naturales por delante.
                    </Punto>
                    <Punto icono="reloj" titulo="Avisos en el día 27 y el 29">
                      Antes de llegar al hito de 30 días el panel muestra el aviso y la validación lo devuelve.
                    </Punto>
                    <Punto icono="bloquear" titulo="32 días = bloqueo">
                      Al cumplirse el plazo la clave pasa a BLOQUEADA sola; también puedes revocarla a mano.
                    </Punto>
                  </ul>
                </Tarjeta>
              </div>
            );
          }

          if (id === "probar") {
            return (
              <div className="grid gap-5">
                <Probador />
              </div>
            );
          }

          if (id === "licencias") {
            return (
              <TablaLicencias
                licencias={licencias}
                cargando={cargando}
                filtros={filtros}
                onFiltros={setFiltros}
                onBloquear={(licencia) => setPorBloquear(licencia)}
                onEliminar={(licencia) => setPorEliminar(licencia)}
                onCargarEjemplos={() => void cargarEjemplos()}
              />
            );
          }

          return (
            <div className="space-y-5">
              {cargando ? (
                <Carril etiqueta="Resumen de licencias" claseCarril="lg:grid-cols-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Esqueleto key={i} className="h-28 w-52 shrink-0 lg:w-auto" />
                  ))}
                </Carril>
              ) : (
                <Carril etiqueta="Resumen de licencias" claseCarril="lg:grid-cols-5">
                  <Estadistica
                    etiqueta="Total"
                    valor={resumen.total}
                    icono="escudo"
                    color="text-slate-100"
                    detalle="claves registradas"
                    onClick={() => verLicenciasCon("TODAS")}
                  />
                  <Estadistica
                    etiqueta="Disponibles"
                    valor={resumen.disponibles}
                    icono="llave"
                    color="text-sky-300"
                    detalle="sin activar"
                    onClick={() => verLicenciasCon("DISPONIBLE")}
                  />
                  <Estadistica
                    etiqueta="Activas"
                    valor={resumen.activas}
                    icono="rayo"
                    color="text-emerald-300"
                    detalle="en uso"
                    onClick={() => verLicenciasCon("ACTIVA")}
                  />
                  <Estadistica
                    etiqueta="En aviso"
                    valor={resumen.porVencer}
                    icono="alerta"
                    color="text-amber-300"
                    detalle="día 27 o más"
                    onClick={() => verLicenciasCon("ACTIVA")}
                  />
                  <Estadistica
                    etiqueta="Bloqueadas"
                    valor={resumen.bloqueadas}
                    icono="bloquear"
                    color="text-rose-300"
                    detalle="sin acceso"
                    onClick={() => verLicenciasCon("BLOQUEADA")}
                  />
                </Carril>
              )}

              {cargando ? (
                <div className="grid gap-5 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <Esqueleto key={i} className="h-52" />
                  ))}
                </div>
              ) : (
              <div className="grid gap-5 lg:grid-cols-3">
                <Tarjeta>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-50">
                    <Icono nombre="barras" className="size-4 text-indigo-300" />
                    Distribución
                  </h2>
                  <ul className="mt-4 space-y-3">
                    <Reparto etiqueta="Disponibles" valor={resumen.disponibles} total={resumen.total} color="bg-sky-400" />
                    <Reparto etiqueta="Activas" valor={resumen.activas} total={resumen.total} color="bg-emerald-400" />
                    <Reparto etiqueta="Bloqueadas" valor={resumen.bloqueadas} total={resumen.total} color="bg-rose-400" />
                  </ul>
                  <p className="mt-4 text-xs text-slate-400">
                    {resumen.total === 0
                      ? "Sin datos todavía: genera claves o usa la precarga."
                      : `${porcentaje(resumen.activas, resumen.total)}% de las claves está en uso ahora mismo.`}
                  </p>
                </Tarjeta>

                <Tarjeta>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-50">
                    <Icono nombre="alerta" className="size-4 text-amber-300" />
                    Avisos
                  </h2>
                  {conAviso.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">
                      Ninguna clave necesita atención. Los avisos aparecen en el día 27 y el 29.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {conAviso.map((l) => (
                        <li key={l.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-slate-100">{l.nombre_app}</span>
                            <EtiquetaEstado estado={l.estado} />
                          </div>
                          <p className="mt-1.5 text-xs text-amber-200/90">{l.aviso}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Boton
                    tamano="sm"
                    icono="derecha"
                    className="mt-4"
                    onClick={() => verLicenciasCon("ACTIVA")}
                  >
                    Ver licencias activas
                  </Boton>
                </Tarjeta>

                <Tarjeta>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-50">
                    <Icono nombre="reloj" className="size-4 text-emerald-300" />
                    Últimas generadas
                  </h2>
                  {ultimas.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">Aquí verás las claves más recientes.</p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {ultimas.map((l) => (
                        <li key={l.id} className="flex items-center justify-between gap-2">
                          <code className="truncate font-mono text-xs text-indigo-200">{l.clave}</code>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await copiarTexto(l.clave);
                              mostrar(
                                ok
                                  ? { tipo: "ok", texto: `Clave ${l.clave} copiada` }
                                  : { tipo: "error", texto: "No se pudo copiar la clave" },
                              );
                            }}
                            className="tacto inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-white/10 hover:text-slate-100"
                            aria-label={`Copiar clave ${l.clave}`}
                          >
                            <Icono nombre="copiar" className="size-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Boton tamano="sm" variante="primario" icono="llave" onClick={() => setPestana("generar")}>
                      Generar claves
                    </Boton>
                    <Boton tamano="sm" icono="rayo" onClick={() => setPestana("probar")}>
                      Probar validación
                    </Boton>
                  </div>
                </Tarjeta>
              </div>
              )}
            </div>
          );
        }}
      </Pestanas>

      <footer className="mt-10 flex flex-col items-center gap-2 pb-6 text-center text-xs text-slate-500">
        <p>
          Los días se calculan desde la activación: 32 días de licencia, aviso en el día 27 y el 29 (hito 30).
        </p>
        <p className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/privacidad" className="rounded-lg px-2 py-1 text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
            Política de privacidad
          </Link>
          <span aria-hidden="true" className="text-slate-700">
            ·
          </span>
          <span>Sin analítica de terceros. Solo la cookie de sesión del panel.</span>
        </p>
      </footer>

      <DialogoConfirmar
        abierto={porBloquear !== null}
        titulo={porBloquear ? `¿Bloquear la clave ${porBloquear.clave}?` : "¿Bloquear la clave?"}
        descripcion="El equipo pierde el acceso de inmediato y la clave no se puede reactivar. Esta acción no se puede deshacer."
        textoConfirmar="Bloquear clave"
        textoCancelar="Cancelar"
        ocupado={bloqueando}
        onConfirmar={() => void confirmarBloqueo()}
        onCancelar={() => setPorBloquear(null)}
      />

      <DialogoConfirmar
        abierto={porEliminar !== null}
        titulo={porEliminar ? `¿Eliminar la clave ${porEliminar.clave}?` : "¿Eliminar la clave?"}
        descripcion={
          porEliminar?.estado === "ACTIVA"
            ? `Es una licencia ACTIVA de «${porEliminar.nombre_app}»: el equipo ${porEliminar.dispositivo_id ?? "vinculado"} pierde el acceso de inmediato. Se borra de la base de datos y no se puede deshacer (a diferencia de bloquear, no queda registro).`
            : "Se borra de la base de datos y no se puede deshacer (a diferencia de bloquear, no queda registro)."
        }
        textoConfirmar="Eliminar definitivamente"
        textoCancelar="Cancelar"
        ocupado={eliminando}
        onConfirmar={() => void confirmarEliminacion()}
        onCancelar={() => setPorEliminar(null)}
      />

      <DialogoConfirmar
        abierto={confirmandoQuitarEjemplos}
        titulo="¿Quitar la precarga?"
        descripcion={`Se eliminarán ${pluralizar(numeroEjemplos, "clave de ejemplo", "claves de ejemplo")} (las «Demo …»). Las claves reales no se tocan. Podrás volver a precargarlas cuando quieras con el mismo botón.`}
        textoConfirmar="Quitar precarga"
        textoCancelar="Cancelar"
        ocupado={quitandoEjemplos}
        onConfirmar={() => void quitarEjemplos()}
        onCancelar={() => setConfirmandoQuitarEjemplos(false)}
      />
    </main>
  );
}

function Estadistica({
  etiqueta,
  valor,
  icono,
  color,
  detalle,
  onClick,
}: {
  etiqueta: string;
  valor: number;
  icono: NombreIcono;
  color: string;
  detalle: string;
  onClick: () => void;
}) {
  return (
    <Tarjeta
      interactiva
      onClick={onClick}
      className="w-52 shrink-0 p-4 lg:w-auto"
      aria-label={`${etiqueta}: ${valor} ${detalle}. Ver en la lista de licencias`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{etiqueta}</span>
        <Icono nombre={icono} className={`size-4 ${color}`} />
      </span>
      <span className={`mt-2 block text-3xl font-bold tabular-nums ${color}`}>
        <Contador valor={valor} />
      </span>
      <span className="mt-1 block text-xs text-slate-500">{detalle}</span>
    </Tarjeta>
  );
}

function Reparto({
  etiqueta,
  valor,
  total,
  color,
}: {
  etiqueta: string;
  valor: number;
  total: number;
  color: string;
}) {
  const pct = porcentaje(valor, total);
  return (
    <li>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300">{etiqueta}</span>
        <span className="tabular-nums text-slate-400">
          {valor}
          <span className="text-slate-600"> · {pct}%</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${etiqueta}: ${valor} de ${total}`}
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className={`h-full rounded-full ${color} transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

function Punto({ icono, titulo, children }: { icono: NombreIcono; titulo: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-200">
        <Icono nombre={icono} className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-slate-100">{titulo}</span>
        <span className="block text-sm text-slate-400">{children}</span>
      </span>
    </li>
  );
}

function porcentaje(valor: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((valor / total) * 100);
}

/** Almacén del último panel visto, compartido por suscripción (sin setState en efectos). */
let cachePanel: Datos | null | undefined;
const escuchasCache = new Set<() => void>();

function leerCachePanel(): Datos | null {
  if (cachePanel === undefined) cachePanel = leerDeCache();
  return cachePanel;
}

function suscribirCache(escucha: () => void): () => void {
  escuchasCache.add(escucha);
  return () => {
    escuchasCache.delete(escucha);
  };
}

function escribirCachePanel(datos: Datos): void {
  cachePanel = datos;
  guardarEnCache(datos);
  for (const escucha of escuchasCache) escucha();
}

const sinCacheEnServidor = () => null;

function guardarEnCache(datos: Datos): void {
  try {
    window.sessionStorage.setItem(CLAVE_CACHE, JSON.stringify({ guardadoEn: Date.now(), datos }));
  } catch {
    // Sin almacenamiento: se sigue funcionando sin pintado instantáneo.
  }
}

function leerDeCache(): Datos | null {
  try {
    const crudo = window.sessionStorage.getItem(CLAVE_CACHE);
    if (!crudo) return null;
    const { guardadoEn, datos } = JSON.parse(crudo) as { guardadoEn: number; datos: Datos };
    if (!datos?.licencias || Date.now() - guardadoEn > VIDA_CACHE_MS) return null;
    return datos;
  } catch {
    return null;
  }
}
