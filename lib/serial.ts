import { randomInt } from "node:crypto";

// Sin 0/O/1/I para que el serial se pueda dictar o copiar sin confusiones.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function bloque(largo: number): string {
  let out = "";
  for (let i = 0; i < largo; i += 1) out += ALFABETO[randomInt(ALFABETO.length)];
  return out;
}

/** Serial con formato APP-XXXX-YYYY-ZZZZ, generado con CSPRNG. */
export function generarSerial(): string {
  return `APP-${bloque(4)}-${bloque(4)}-${bloque(4)}`;
}
