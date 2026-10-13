/** Error con código HTTP pensado para mostrarse tal cual al cliente. */
export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Falta una variable de entorno necesaria. Nunca incluye su valor. */
export class ConfigError extends Error {
  constructor(variable: string) {
    super(`Configuración incompleta: ${variable}`);
    this.name = "ConfigError";
  }
}
