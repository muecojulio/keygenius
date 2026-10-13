// Límites de intentos en memoria. Son un freno de mejor esfuerzo: en serverless cada instancia
// cuenta por separado. La seguridad real depende de claves largas y aleatorias.

type Cubo = { n: number; reinicio: number };
const cubos = new Map<string, Cubo>();

function cuboVigente(clave: string, ventanaMs: number, ahora: number): Cubo {
  let cubo = cubos.get(clave);
  if (!cubo || ahora >= cubo.reinicio) {
    if (cubos.size > 5000) cubos.clear();
    cubo = { n: 0, reinicio: ahora + ventanaMs };
    cubos.set(clave, cubo);
  }
  return cubo;
}

/** Cuenta cada petición. Devuelve true si entra en el cupo (max por ventana). */
export function dentroDelCupo(clave: string, max: number, ventanaMs: number, ahora = Date.now()): boolean {
  const cubo = cuboVigente(clave, ventanaMs, ahora);
  cubo.n += 1;
  return cubo.n <= max;
}

/** ¿Ya agotó los fallos permitidos? No cuenta nada. */
export function fallosAgotados(clave: string, max: number, ahora = Date.now()): boolean {
  const cubo = cubos.get(clave);
  return !!cubo && ahora < cubo.reinicio && cubo.n >= max;
}

/** Anota un fallo (p. ej. clave incorrecta). */
export function registrarFallo(clave: string, ventanaMs: number, ahora = Date.now()): void {
  cuboVigente(clave, ventanaMs, ahora).n += 1;
}

/** Olvida los fallos de una clave tras un acceso correcto. */
export function olvidar(clave: string): void {
  cubos.delete(clave);
}

export function ipCliente(request: Request): string {
  const reenviada = request.headers.get("x-forwarded-for");
  const ip = reenviada ? reenviada.split(",")[0]?.trim() : "";
  return (ip || "desconocida").slice(0, 64);
}
