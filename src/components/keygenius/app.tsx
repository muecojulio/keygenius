import { useCallback, useEffect, useMemo, useState } from "react";
import * as Switch from "@radix-ui/react-switch";
import { Toaster, toast } from "sonner";
import {
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Plus,
  Shield,
  Smartphone,
} from "lucide-react";
import { toDataURL } from "qrcode";
import { ApiError, api, guardarSesion, leerSesion } from "@/components/keygenius/client";
import { PrivacyText } from "@/components/keygenius/privacy";

type Panel = "panel" | "generar" | "probar" | "privacidad" | "instalar";

type Session = {
  autenticado: boolean;
  modo: "previa" | "produccion";
  necesitaConfiguracion: boolean;
  demoClave: string | null;
};

type Licencia = {
  id: number;
  nombre_app: string;
  clave: string;
  dispositivo_id: string | null;
  estado: "DISPONIBLE" | "ACTIVA" | "BLOQUEADA";
  fecha_creacion: string | null;
  fecha_activacion: string | null;
  fecha_expiracion: string | null;
  diasTranscurridos: number | null;
  diasRestantesPara30: number | null;
  diasParaBloqueoTotal: number | null;
  aviso: string | null;
};

type Resumen = { total: number; disponibles: number; activas: number; bloqueadas: number };

type Validacion = {
  acceso: boolean;
  estado: string;
  diasTranscurridos: number;
  diasRestantesPara30: number;
  diasParaBloqueoTotal: number;
  aviso: string | null;
};

type Ejemplo = { clave: string; nombre_app: string; dispositivo_id: string; nota: string };

const NAV: Array<{ id: Panel; label: string; icon: typeof LayoutDashboard }> = [
  { id: "panel", label: "Panel", icon: LayoutDashboard },
  { id: "generar", label: "Generar", icon: Plus },
  { id: "probar", label: "Probar", icon: FlaskConical },
  { id: "privacidad", label: "Datos", icon: Shield },
  { id: "instalar", label: "Instalar", icon: Smartphone },
];

const PRESETS = ["Atlas Escritorio", "Norte Móvil", "Taller Pro"];

function fecha(iso: string | null): string {
  if (!iso) return "Sin activar";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function enmascarar(clave: string, mostrar: boolean): string {
  if (mostrar) return clave;
  const parts = clave.split("-");
  if (parts.length !== 4) return "••••";
  return `${parts[0]}-••••-••••-${parts[3]}`;
}

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success("Copiada");
  } catch {
    toast.error("No se pudo copiar");
  }
}

function Marca() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-xl bg-brass text-brass-ink">
        <KeyRound className="size-5" strokeWidth={1.75} />
      </span>
      <div>
        <p className="font-display text-2xl leading-none font-semibold text-ivory">KeyGenius</p>
        <p className="mt-1 text-xs tracking-wide text-stone">Licencias en un solo lugar</p>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-stone">
      <span>{label}</span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors duration-200 data-[state=checked]:bg-brass"
        aria-label={label}
      >
        <Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-ivory transition-transform duration-200 data-[state=checked]:translate-x-6 data-[state=checked]:bg-brass-ink" />
      </Switch.Root>
    </label>
  );
}

function LockScreen({ session, onEnter }: { session: Session; onEnter: () => void }) {
  const [clave, setClave] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const setup = session.necesitaConfiguracion;

  async function entrar(valor: string, repetir?: string) {
    setOcupado(true);
    setError(null);
    try {
      const data = setup
        ? await api<{ sesion?: string }>("/api/admin/configurar", {
            body: { clave: valor, confirmar: repetir ?? "" },
          })
        : await api<{ sesion?: string }>("/api/admin/sesion", { body: { clave: valor } });
      if (data.sesion) guardarSesion(data.sesion);
      onEnter();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo entrar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pt-8 pb-16">
      <div className="rise">
        <Marca />
        <div className="mt-6 h-px w-16 bg-brass" />
      </div>
      <form
        className="rise card grid gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void entrar(clave, confirmar);
        }}
      >
        <h1 className="font-display text-3xl font-semibold">
          {setup ? "Crea tu clave" : "Entra al panel"}
        </h1>
        <p className="text-sm leading-relaxed text-stone">
          {setup
            ? "Solo tú la conoces. Queda cifrada en tu base y no se comparte."
            : "El panel de licencias está cerrado. La validación de las apps sigue funcionando aparte."}
        </p>
        <label className="grid gap-2 text-sm text-stone">
          Clave de administrador
          <input
            className="field"
            type="password"
            autoComplete={setup ? "new-password" : "current-password"}
            value={clave}
            onChange={(event) => setClave(event.target.value)}
            minLength={setup ? 10 : 1}
            required
          />
        </label>
        {setup ? (
          <label className="grid gap-2 text-sm text-stone">
            Repítela
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(event) => setConfirmar(event.target.value)}
              required
            />
          </label>
        ) : null}
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        <button className="btn btn-primary w-full" type="submit" disabled={ocupado}>
          {ocupado ? "Un momento…" : setup ? "Guardar y entrar" : "Entrar"}
        </button>
        {session.demoClave ? (
          <button
            className="btn btn-ghost w-full"
            type="button"
            disabled={ocupado}
            onClick={() => void entrar(session.demoClave!)}
          >
            Entrar con la clave de vista previa
          </button>
        ) : null}
      </form>
      {session.demoClave ? (
        <p className="text-sm leading-relaxed text-stone">
          Vista previa: la clave de demostración es{" "}
          <span className="text-ivory">{session.demoClave}</span>. En la aplicación publicada
          elegirás la tuya y no aparece aquí.
        </p>
      ) : null}
    </main>
  );
}

function PanelLicencias({
  licencias,
  resumen,
  mostrar,
  setMostrar,
  auto,
  setAuto,
  filtro,
  setFiltro,
  busca,
  setBusca,
  onRevocar,
  revocando,
}: {
  licencias: Licencia[];
  resumen: Resumen | null;
  mostrar: boolean;
  setMostrar: (value: boolean) => void;
  auto: boolean;
  setAuto: (value: boolean) => void;
  filtro: string;
  setFiltro: (value: string) => void;
  busca: string;
  setBusca: (value: string) => void;
  onRevocar: (id: number) => void;
  revocando: number | null;
}) {
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const visibles = licencias.filter((item) => {
    if (filtro !== "TODAS" && item.estado !== filtro) return false;
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (
      item.nombre_app.toLowerCase().includes(q) || item.clave.toLowerCase().includes(q)
    );
  });

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total", resumen?.total ?? 0],
          ["Disponibles", resumen?.disponibles ?? 0],
          ["Activas", resumen?.activas ?? 0],
          ["Bloqueadas", resumen?.bloqueadas ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="card px-4 py-3">
            <p className="text-xs text-stone">{label}</p>
            <p className="mt-1 font-display text-3xl tabular-nums text-ivory">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-stone">
          <span className="live-dot" aria-hidden />
          {auto ? "En vivo" : "En pausa"}
        </span>
        <Toggle checked={auto} onCheckedChange={setAuto} label="Actualizar sola" />
        <Toggle checked={mostrar} onCheckedChange={setMostrar} label="Mostrar claves" />
      </div>
      <input
        className="field"
        placeholder="Buscar app o clave"
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        aria-label="Buscar licencias"
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["TODAS", "DISPONIBLE", "ACTIVA", "BLOQUEADA"].map((item) => (
          <button
            key={item}
            type="button"
            className="chip shrink-0"
            data-on={filtro === item}
            onClick={() => setFiltro(item)}
          >
            {item === "TODAS" ? "Todas" : item.charAt(0) + item.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {visibles.length === 0 ? (
        <div className="card px-5 py-8 text-sm text-stone">No hay licencias con ese filtro.</div>
      ) : (
        <ul className="grid gap-3">
          {visibles.map((item) => (
            <li key={item.id} className="card grid gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ivory">{item.nombre_app}</p>
                  <button
                    type="button"
                    className="mt-1 font-medium tracking-wide text-brass"
                    onClick={() => void copiar(item.clave)}
                  >
                    {enmascarar(item.clave, mostrar)}
                  </button>
                </div>
                <span className={`pill pill-${item.estado}`}>{item.estado}</span>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-stone">Días usados</dt>
                  <dd className="tabular-nums text-ivory">
                    {item.diasTranscurridos == null ? "—" : item.diasTranscurridos}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone">Días al bloqueo</dt>
                  <dd className="tabular-nums text-ivory">
                    {item.diasParaBloqueoTotal == null ? "—" : item.diasParaBloqueoTotal}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone">Hacia el día 30</dt>
                  <dd className="tabular-nums text-ivory">
                    {item.diasRestantesPara30 == null ? "—" : item.diasRestantesPara30}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone">Activación</dt>
                  <dd className="text-ivory">{fecha(item.fecha_activacion)}</dd>
                </div>
              </dl>
              {item.aviso ? <p className="text-sm text-brass">{item.aviso}</p> : null}
              {item.dispositivo_id ? (
                <p className="text-xs text-stone">
                  Equipo {mostrar ? item.dispositivo_id : "vinculado"}
                </p>
              ) : null}
              {item.estado === "BLOQUEADA" ? null : confirmar === item.id ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-danger flex-1"
                    disabled={revocando === item.id}
                    onClick={() => onRevocar(item.id)}
                  >
                    {revocando === item.id ? "Revocando…" : "Confirmar"}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmar(null)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-danger" onClick={() => setConfirmar(item.id)}>
                  Revocar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Generar({ onCreated }: { onCreated: () => void }) {
  const [nombre, setNombre] = useState(PRESETS[0] ?? "");
  const [cantidad, setCantidad] = useState(1);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nuevas, setNuevas] = useState<Array<{ id: number; clave: string; nombre_app: string }>>([]);

  return (
    <div className="grid gap-4">
      <form
        className="card grid gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          setOcupado(true);
          setError(null);
          void api<{ claves: Array<{ id: number; clave: string; nombre_app: string }> }>(
            "/api/admin/generar",
            { body: { nombre_app: nombre, cantidad } },
          )
            .then((data) => {
              setNuevas(data.claves);
              toast.success(data.claves.length === 1 ? "Clave lista" : "Claves listas");
              onCreated();
            })
            .catch((err: unknown) => {
              setError(err instanceof ApiError ? err.message : "No se pudo generar.");
            })
            .finally(() => setOcupado(false));
        }}
      >
        <h2 className="font-display text-3xl font-semibold">Nueva clave</h2>
        <p className="text-sm text-stone">Queda disponible hasta el primer equipo que la use.</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="chip"
              data-on={nombre === preset}
              onClick={() => setNombre(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
        <label className="grid gap-2 text-sm text-stone">
          Aplicación
          <input
            className="field"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            maxLength={80}
            required
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-stone">Cantidad</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost size-11 px-0"
              onClick={() => setCantidad((n) => Math.max(1, n - 1))}
              aria-label="Menos claves"
            >
              −
            </button>
            <span className="w-8 text-center text-lg tabular-nums">{cantidad}</span>
            <button
              type="button"
              className="btn btn-ghost size-11 px-0"
              onClick={() => setCantidad((n) => Math.min(10, n + 1))}
              aria-label="Más claves"
            >
              +
            </button>
          </div>
        </div>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={ocupado}>
          {ocupado ? "Generando…" : "Generar"}
        </button>
      </form>
      {nuevas.length > 0 ? (
        <ul className="grid gap-2">
          {nuevas.map((item) => (
            <li key={item.id} className="card flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-xs text-stone">{item.nombre_app}</p>
                <p className="font-medium tracking-wide text-ivory">{item.clave}</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => void copiar(item.clave)}>
                Copiar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Probar() {
  const [ejemplos, setEjemplos] = useState<Ejemplo[]>([]);
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [device, setDevice] = useState("");
  const [resultado, setResultado] = useState<Validacion | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const guardado = localStorage.getItem("keygenius.dispositivo");
    if (guardado) setDevice(guardado);
    else {
      const creado = `navegador-${crypto.randomUUID().slice(0, 8)}`;
      localStorage.setItem("keygenius.dispositivo", creado);
      setDevice(creado);
    }
    void api<{ ejemplos: Ejemplo[] }>("/api/licencia/ejemplos")
      .then((data) => setEjemplos(data.ejemplos))
      .catch(() => setEjemplos([]));
  }, []);

  return (
    <div className="grid gap-4">
      <form
        className="card grid gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          setOcupado(true);
          setError(null);
          void api<Validacion>("/api/licencia/validar", {
            body: { clave, nombre_app: nombre, dispositivo_id: device },
          })
            .then((data) => setResultado(data))
            .catch((err: unknown) => {
              setResultado(null);
              setError(err instanceof ApiError ? err.message : "No se pudo validar.");
            })
            .finally(() => setOcupado(false));
        }}
      >
        <h2 className="font-display text-3xl font-semibold">Probar una clave</h2>
        <p className="text-sm leading-relaxed text-stone">
          Esto llama a la misma validación que usará tu programa. No envía la clave a ningún otro
          servicio.
        </p>
        {ejemplos.length > 0 ? (
          <div className="grid gap-2">
            {ejemplos.map((item) => (
              <button
                key={`${item.clave}-${item.dispositivo_id}`}
                type="button"
                className="card px-4 py-3 text-left transition-transform duration-150 active:scale-[0.98]"
                onClick={() => {
                  setClave(item.clave);
                  setNombre(item.nombre_app);
                  setDevice(item.dispositivo_id);
                  setResultado(null);
                }}
              >
                <p className="text-sm text-ivory">{item.nota}</p>
                <p className="mt-1 text-xs tracking-wide text-stone">{item.clave}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone">
            Genera una clave y pruébala aquí. En la vista previa aparecen ejemplos listos.
          </p>
        )}
        <label className="grid gap-2 text-sm text-stone">
          Clave
          <input className="field" value={clave} onChange={(event) => setClave(event.target.value)} required />
        </label>
        <label className="grid gap-2 text-sm text-stone">
          Aplicación
          <input className="field" value={nombre} onChange={(event) => setNombre(event.target.value)} required />
        </label>
        <label className="grid gap-2 text-sm text-stone">
          Identificador de equipo
          <input className="field" value={device} onChange={(event) => setDevice(event.target.value)} required />
        </label>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={ocupado}>
          {ocupado ? "Validando…" : "Validar"}
        </button>
      </form>
      {resultado ? (
        <div className="card grid gap-2 p-5">
          <p className="text-xs tracking-wide text-stone uppercase">Respuesta</p>
          <p className="font-display text-3xl text-ivory">{resultado.acceso ? "Acceso" : "Sin acceso"}</p>
          <p className="text-sm text-stone">Estado {resultado.estado}</p>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-stone">Usados</dt>
              <dd className="tabular-nums text-ivory">{resultado.diasTranscurridos}</dd>
            </div>
            <div>
              <dt className="text-stone">Al día 30</dt>
              <dd className="tabular-nums text-ivory">{resultado.diasRestantesPara30}</dd>
            </div>
            <div>
              <dt className="text-stone">Al bloqueo</dt>
              <dd className="tabular-nums text-ivory">{resultado.diasParaBloqueoTotal}</dd>
            </div>
          </dl>
          {resultado.aviso ? <p className="text-sm text-brass">{resultado.aviso}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function Instalar() {
  const [qr, setQr] = useState<string | null>(null);
  const [local, setLocal] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    setLocal(/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(host));
    const url = `${window.location.origin}/?install=1&platform=ios`;
    void toDataURL(url, {
      margin: 1,
      width: 280,
      color: { dark: "#141612", light: "#f3f0e6" },
    }).then(setQr);
  }, []);

  return (
    <div className="grid gap-4">
      <section className="card grid gap-3 p-5">
        <h2 className="font-display text-3xl font-semibold">Instalar en el teléfono</h2>
        <p className="text-sm leading-relaxed text-stone">
          KeyGenius se instala como aplicación, con icono propio, no como una pestaña más.
        </p>
        <ol className="grid list-decimal gap-2 pl-5 text-sm text-ivory">
          <li>En el iPhone, ábrela con Safari.</li>
          <li>Toca Compartir.</li>
          <li>Elige Agregar a inicio y confirma.</li>
        </ol>
        <a className="btn btn-primary" href="/?install=1&platform=ios">
          Abrir la guía de instalación
        </a>
        <p className="text-sm text-stone">
          En Android, el menú de Chrome ofrece Instalar aplicación cuando el sitio ya está publicado
          con HTTPS.
        </p>
      </section>
      <section className="card grid place-items-center gap-3 p-5">
        {qr ? (
          <img
            src={qr}
            alt="Código para abrir la guía de instalación de KeyGenius"
            className="h-56 w-56 rounded-xl"
          />
        ) : (
          <div className="grid h-56 w-56 place-items-center text-sm text-stone">Preparando código</div>
        )}
        <p className="text-center text-sm text-stone">
          {local
            ? "Este código usa la dirección de esta vista. En el teléfono, escanéalo cuando KeyGenius ya esté publicada."
            : "Escanéalo con la cámara. Abre la guía para dejar KeyGenius en la pantalla de inicio."}
        </p>
      </section>
    </div>
  );
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const [panel, setPanel] = useState<Panel>("panel");
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [mostrar, setMostrar] = useState(false);
  const [auto, setAuto] = useState(true);
  const [filtro, setFiltro] = useState("TODAS");
  const [busca, setBusca] = useState("");
  const [revocando, setRevocando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await api<{ licencias: Licencia[]; resumen: Resumen }>("/api/admin/dashboard");
      setLicencias(data.licencias);
      setResumen(data.resumen);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onLogout();
      else setError(err instanceof ApiError ? err.message : "No se pudo cargar el panel.");
    }
  }, [onLogout]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!auto || panel !== "panel") return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void cargar();
    }, 8000);
    return () => window.clearInterval(id);
  }, [auto, panel, cargar]);

  const titulo = useMemo(() => NAV.find((item) => item.id === panel)?.label ?? "Panel", [panel]);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-line md:flex md:flex-col md:gap-6 md:px-4 md:py-6">
        <Marca />
        <nav className="grid gap-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nav-btn flex-row justify-start gap-3 px-3"
              data-on={panel === item.id}
              onClick={() => setPanel(item.id)}
            >
              <item.icon className="size-5" strokeWidth={1.75} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="btn btn-ghost mt-auto" onClick={onLogout}>
          <LogOut className="size-4" />
          Cerrar
        </button>
      </aside>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-10">
        <header className="flex items-center justify-between gap-3 md:hidden">
          <Marca />
          <button type="button" className="btn btn-ghost size-11 px-0" onClick={onLogout} aria-label="Cerrar sesión">
            <LogOut className="size-4" />
          </button>
        </header>
        <div className="hidden items-end justify-between md:flex">
          <h1 className="font-display text-4xl font-semibold">{titulo}</h1>
        </div>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        <div key={panel} className="rise">
          {panel === "panel" ? (
            <PanelLicencias
              licencias={licencias}
              resumen={resumen}
              mostrar={mostrar}
              setMostrar={setMostrar}
              auto={auto}
              setAuto={setAuto}
              filtro={filtro}
              setFiltro={setFiltro}
              busca={busca}
              setBusca={setBusca}
              revocando={revocando}
              onRevocar={(id) => {
                setRevocando(id);
                void api("/api/admin/bloquear", { body: { id } })
                  .then(() => cargar())
                  .then(() => toast.success("Clave revocada"))
                  .catch((err: unknown) => {
                    toast.error(err instanceof ApiError ? err.message : "No se pudo revocar");
                  })
                  .finally(() => setRevocando(null));
              }}
            />
          ) : null}
          {panel === "generar" ? <Generar onCreated={() => void cargar()} /> : null}
          {panel === "probar" ? <Probar /> : null}
          {panel === "privacidad" ? (
            <div className="card p-5">
              <PrivacyText />
            </div>
          ) : null}
          {panel === "instalar" ? <Instalar /> : null}
        </div>
      </div>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-line bg-ink px-1 pt-1 md:hidden">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className="nav-btn"
            data-on={panel === item.id}
            onClick={() => setPanel(item.id)}
          >
            <item.icon className="size-5" strokeWidth={1.75} />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function KeyGeniusApp() {
  const [session, setSession] = useState<Session | null>(null);

  const refrescar = useCallback(() => {
    const headers = new Headers();
    const token = leerSesion();
    if (token) headers.set("x-kg-session", token);
    void fetch("/api/admin/sesion", { headers, cache: "no-store", credentials: "same-origin" })
      .then((res) => res.json() as Promise<Session>)
      .then((data) => setSession(data))
      .catch(() =>
        setSession({
          autenticado: false,
          modo: "produccion",
          necesitaConfiguracion: false,
          demoClave: null,
        }),
      );
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  function salir() {
    guardarSesion(null);
    void api("/api/admin/sesion", { method: "DELETE" }).catch(() => undefined);
    setSession((prev) =>
      prev
        ? { ...prev, autenticado: false }
        : {
            autenticado: false,
            modo: "produccion",
            necesitaConfiguracion: false,
            demoClave: null,
          },
    );
    refrescar();
  }

  return (
    <>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--color-panel)",
            color: "var(--color-ivory)",
            border: "1px solid var(--color-line)",
          },
        }}
      />
      {session == null ? (
        <main className="grid min-h-dvh place-items-center px-6">
          <div className="grid gap-3 text-center">
            <p className="font-display text-4xl font-semibold">KeyGenius</p>
            <p className="text-sm text-stone">Abriendo el panel</p>
          </div>
        </main>
      ) : session.autenticado ? (
        <Shell onLogout={salir} />
      ) : (
        <LockScreen session={session} onEnter={refrescar} />
      )}
    </>
  );
}
