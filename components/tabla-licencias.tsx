"use client";

import { useMemo, useState } from "react";
import { Carril } from "@/components/carril";
import { Icono } from "@/components/iconos";
import { TarjetaDeslizable } from "@/components/tarjeta-acciones";
import { BarraDias, Banner, Boton, BotonIcono, CAMPO, Chip, Esqueleto, EtiquetaEstado, Tarjeta } from "@/components/ui";
import { useAvisos } from "@/components/avisos";
import { copiarTexto } from "@/lib/cliente";
import { aCsv, type ColumnaCsv } from "@/lib/csv";
import { descargarArchivo } from "@/lib/cliente";
import { filtrar } from "@/lib/filtro";
import { formatearFecha, pluralizar } from "@/lib/formato";
import type { Estado, LicenciaVista } from "@/lib/tipos";

export type OrdenLicencias = "recientes" | "app" | "restantes";

export type FiltrosLicencias = {
  estado: "TODAS" | Estado;
  texto: string;
  orden: OrdenLicencias;
};

export const FILTROS_INICIALES: FiltrosLicencias = { estado: "TODAS", texto: "", orden: "recientes" };

const FILTROS: { id: FiltrosLicencias["estado"]; etiqueta: string }[] = [
  { id: "TODAS", etiqueta: "Todas" },
  { id: "DISPONIBLE", etiqueta: "Disponibles" },
  { id: "ACTIVA", etiqueta: "Activas" },
  { id: "BLOQUEADA", etiqueta: "Bloqueadas" },
];

const COLUMNAS_CSV: ColumnaCsv<LicenciaVista>[] = [
  { titulo: "Aplicación", valor: (l) => l.nombre_app },
  { titulo: "Clave", valor: (l) => l.clave },
  { titulo: "Equipo", valor: (l) => l.dispositivo_id ?? "" },
  { titulo: "Estado", valor: (l) => l.estado },
  { titulo: "Días consumidos", valor: (l) => l.diasActiva ?? "" },
  { titulo: "Días restantes (32)", valor: (l) => l.diasRestantes ?? "" },
  { titulo: "Vence", valor: (l) => (l.fecha_expiracion ? formatearFecha(l.fecha_expiracion) : "") },
  { titulo: "Creada", valor: (l) => formatearFecha(l.fecha_creacion) },
];

export function TablaLicencias({
  licencias,
  cargando,
  filtros,
  onFiltros,
  onBloquear,
  onCargarEjemplos,
}: {
  licencias: LicenciaVista[];
  cargando: boolean;
  filtros: FiltrosLicencias;
  onFiltros: (filtros: FiltrosLicencias) => void;
  onBloquear: (licencia: LicenciaVista) => void;
  onCargarEjemplos: () => void;
}) {
  const { mostrar } = useAvisos();
  const [copiada, setCopiada] = useState<string | null>(null);

  const conteos = useMemo(
    () => ({
      TODAS: licencias.length,
      DISPONIBLE: licencias.filter((l) => l.estado === "DISPONIBLE").length,
      ACTIVA: licencias.filter((l) => l.estado === "ACTIVA").length,
      BLOQUEADA: licencias.filter((l) => l.estado === "BLOQUEADA").length,
    }),
    [licencias],
  );

  const visibles = useMemo(() => {
    const porEstado =
      filtros.estado === "TODAS" ? licencias : licencias.filter((l) => l.estado === filtros.estado);
    const buscadas = filtrar(porEstado, filtros.texto, (l) => [
      l.nombre_app,
      l.clave,
      l.dispositivo_id ?? "",
      l.estado,
      l.aviso ?? "",
    ]);
    return ordenar(buscadas, filtros.orden);
  }, [licencias, filtros]);

  async function copiar(clave: string) {
    const ok = await copiarTexto(clave);
    if (!ok) {
      mostrar({ tipo: "error", texto: "No se pudo copiar", detalle: "Selecciona la clave y cópiala a mano." });
      return;
    }
    setCopiada(clave);
    mostrar({ tipo: "ok", texto: `Clave ${clave} copiada` });
    window.setTimeout(() => setCopiada((actual) => (actual === clave ? null : actual)), 2000);
  }

  function exportar() {
    if (visibles.length === 0) {
      mostrar({ tipo: "info", texto: "No hay licencias que exportar con los filtros actuales." });
      return;
    }
    descargarArchivo(`keygenius-licencias-${fechaArchivo()}.csv`, aCsv(visibles, COLUMNAS_CSV));
    mostrar({ tipo: "ok", texto: "CSV descargado", detalle: pluralizar(visibles.length, "licencia") });
  }

  const hayFiltros = filtros.estado !== "TODAS" || filtros.texto.trim() !== "";

  return (
    <Tarjeta className="p-0">
      <div className="flex flex-col gap-4 border-b border-white/10 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Licencias</h2>
            <p className="text-sm text-slate-400">
              {pluralizar(licencias.length, "registro")} · se actualiza cada 5 segundos
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Boton icono="descargar" onClick={exportar} disabled={visibles.length === 0}>
              Exportar CSV
            </Boton>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Carril etiqueta="Filtros por estado" rejilla={false} className="lg:flex-1">
            {FILTROS.map((filtro) => (
              <Chip
                key={filtro.id}
                activo={filtros.estado === filtro.id}
                onClick={() => onFiltros({ ...filtros, estado: filtro.id })}
              >
                {filtro.etiqueta}
                <span className="tabular-nums opacity-70">{conteos[filtro.id]}</span>
              </Chip>
            ))}
          </Carril>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 lg:w-72 lg:flex-none">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500">
                <Icono nombre="buscar" className="size-4" />
              </span>
              <input
                type="search"
                aria-label="Buscar licencias"
                placeholder="Buscar app, clave, equipo…"
                value={filtros.texto}
                onChange={(evento) => onFiltros({ ...filtros, texto: evento.target.value })}
                className={`${CAMPO} pl-9`}
              />
            </div>
            <label className="sr-only" htmlFor="orden-licencias">
              Orden de las licencias
            </label>
            <select
              id="orden-licencias"
              value={filtros.orden}
              onChange={(evento) => onFiltros({ ...filtros, orden: evento.target.value as OrdenLicencias })}
              className={`${CAMPO} w-auto min-w-36 flex-none cursor-pointer`}
            >
              <option value="recientes">Más recientes</option>
              <option value="app">Por aplicación</option>
              <option value="restantes">Menos días restantes</option>
            </select>
          </div>
        </div>

        <p role="status" className="text-xs text-slate-400">
          {visibles.length === licencias.length
            ? `Mostrando ${pluralizar(licencias.length, "licencia")}.`
            : `${visibles.length} de ${licencias.length} licencias coinciden con el filtro.`}
        </p>
      </div>

      {cargando && licencias.length === 0 ? (
        <div className="space-y-3 p-5">
          {[0, 1, 2, 3].map((i) => (
            <Esqueleto key={i} className="h-14" />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200">
            <Icono nombre="llave" className="size-6" />
          </span>
          <p className="text-sm font-semibold text-slate-200">
            {licencias.length === 0 ? "Aún no hay licencias" : "Ninguna licencia coincide"}
          </p>
          <p className="max-w-sm text-xs text-slate-400">
            {licencias.length === 0
              ? "Genera tus primeras claves o usa la precarga para ver el panel con datos."
              : "Prueba con otro texto o quita los filtros activos."}
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            {licencias.length === 0 ? (
              <Boton variante="primario" icono="chispa" onClick={onCargarEjemplos}>
                Precargar
              </Boton>
            ) : (
              hayFiltros && (
                <Boton icono="refrescar" onClick={() => onFiltros(FILTROS_INICIALES)}>
                  Limpiar filtros
                </Boton>
              )
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Escritorio: tabla completa, con acciones a la vista. */}
          <div className="barra-fina hidden overflow-x-auto lg:block" data-carril="">
            <table className="w-full min-w-[980px] text-left text-sm">
              <caption className="sr-only">Licencias generadas con su estado y días restantes</caption>
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Aplicación</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Clave</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Equipo</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Estado</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Días consumidos</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Faltan (32)</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Vence</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibles.map((l) => (
                  <FilaEscritorio
                    key={l.id}
                    licencia={l}
                    copiada={copiada === l.clave}
                    onCopiar={() => void copiar(l.clave)}
                    onBloquear={() => onBloquear(l)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil y tableta: tarjetas, con acciones que se deslizan o se abren con el botón. */}
          <ul className="space-y-3 p-4 lg:hidden">
            {visibles.map((l) => (
              <li key={`${l.id}-${l.estado}`}>
                <TarjetaDeslizable
                  titulo={l.clave}
                  acciones={
                    <>
                      <BotonIcono
                        etiqueta={`Copiar clave ${l.clave}`}
                        icono={copiada === l.clave ? "check" : "copiar"}
                        onClick={() => void copiar(l.clave)}
                      />
                      <BotonIcono
                        etiqueta={`Bloquear clave ${l.clave}`}
                        icono="bloquear"
                        variante="peligro"
                        disabled={l.estado === "BLOQUEADA"}
                        onClick={() => onBloquear(l)}
                      />
                    </>
                  }
                >
                  <TarjetaMovil licencia={l} />
                </TarjetaDeslizable>
              </li>
            ))}
          </ul>
        </>
      )}
    </Tarjeta>
  );
}

function FilaEscritorio({
  licencia: l,
  copiada,
  onCopiar,
  onBloquear,
}: {
  licencia: LicenciaVista;
  copiada: boolean;
  onCopiar: () => void;
  onBloquear: () => void;
}) {
  const sinActivar = l.diasActiva === null;
  const bloqueable = l.estado !== "BLOQUEADA";
  return (
    <tr className="align-middle transition-colors duration-150 hover:bg-white/[0.03]">
      <td className="px-5 py-4 font-medium text-slate-100">{l.nombre_app}</td>
      <td className="px-5 py-4">
        <span className="flex items-center gap-2">
          <code className="font-mono text-xs tracking-wider text-indigo-200">{l.clave}</code>
          <BotonIcono
            etiqueta={copiada ? `Clave ${l.clave} copiada` : `Copiar clave ${l.clave}`}
            icono={copiada ? "check" : "copiar"}
            variante="fantasma"
            onClick={onCopiar}
            className="size-9"
          />
        </span>
      </td>
      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-300">{l.dispositivo_id ?? "—"}</td>
      <td className="px-5 py-4">
        <div className="flex flex-col items-start gap-1.5">
          <EtiquetaEstado estado={l.estado} conPulso />
          {l.aviso && (
            <span className={`text-xs ${l.estado === "ACTIVA" ? "text-amber-300" : "text-rose-300/80"}`}>{l.aviso}</span>
          )}
        </div>
      </td>
      <td className="px-5 py-4">
        {sinActivar ? (
          <span className="text-slate-500">Sin activar</span>
        ) : (
          <div className="space-y-1.5">
            <p className="tabular-nums">
              <span className="font-semibold text-slate-100">{l.diasActiva}</span>
              <span className="text-slate-500"> / 32 días</span>
            </p>
            <BarraDias dias={l.diasActiva ?? 0} />
          </div>
        )}
      </td>
      <td className="px-5 py-4 tabular-nums">
        {l.diasRestantes === null ? (
          <span className="text-slate-500">—</span>
        ) : (
          <span className={l.diasRestantes <= 3 ? "font-semibold text-rose-300" : "text-slate-200"}>
            {pluralizar(l.diasRestantes, "día")}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-slate-300">{formatearFecha(l.fecha_expiracion)}</td>
      <td className="px-5 py-4 text-right">
        <Boton variante="peligro" disabled={!bloqueable} onClick={onBloquear} className="px-3 py-1.5 text-xs">
          {bloqueable ? "Bloquear" : "Bloqueada"}
        </Boton>
      </td>
    </tr>
  );
}

function TarjetaMovil({ licencia: l }: { licencia: LicenciaVista }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{l.nombre_app}</p>
          <code className="mt-0.5 block truncate font-mono text-xs tracking-wider text-indigo-200">{l.clave}</code>
        </div>
        <EtiquetaEstado estado={l.estado} conPulso />
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Icono nombre="equipo" className="size-3.5 shrink-0" />
        <span className="truncate font-mono">{l.dispositivo_id ?? "Sin equipo vinculado"}</span>
      </div>

      {l.diasActiva === null ? (
        <p className="text-xs text-slate-400">Se activa en el primer uso y vence a los 32 días.</p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              <span className="font-semibold text-slate-200 tabular-nums">{l.diasActiva}</span> / 32 días consumidos
            </span>
            <span className={l.diasRestantes !== null && l.diasRestantes <= 3 ? "font-semibold text-rose-300" : "text-slate-300"}>
              Faltan {pluralizar(l.diasRestantes ?? 0, "día")}
            </span>
          </div>
          <BarraDias dias={l.diasActiva} />
        </div>
      )}

      {l.aviso && (
        <Banner tono={l.estado === "ACTIVA" ? "aviso" : "error"}>{l.aviso}</Banner>
      )}

      <p className="flex items-center gap-1.5 text-[0.7rem] text-slate-500">
        <Icono nombre="izquierda" className="size-3" />
        Desliza la tarjeta o usa el botón para ver las acciones
      </p>
    </div>
  );
}

function ordenar(licencias: LicenciaVista[], orden: OrdenLicencias): LicenciaVista[] {
  const copia = [...licencias];
  if (orden === "app") {
    return copia.sort((a, b) => a.nombre_app.localeCompare(b.nombre_app, "es") || a.clave.localeCompare(b.clave));
  }
  if (orden === "restantes") {
    return copia.sort((a, b) => {
      if (a.diasRestantes === null) return 1;
      if (b.diasRestantes === null) return -1;
      return a.diasRestantes - b.diasRestantes;
    });
  }
  return copia.sort((a, b) => (a.fecha_creacion < b.fecha_creacion ? 1 : -1));
}

function fechaArchivo(): string {
  return new Date().toISOString().slice(0, 10);
}
