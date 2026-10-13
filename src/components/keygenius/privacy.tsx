export function PrivacyText() {
  return (
    <article className="grid gap-5 text-sm leading-relaxed text-stone">
      <header className="grid gap-2">
        <p className="text-xs font-semibold tracking-[0.16em] text-brass uppercase">Privacidad</p>
        <h2 className="font-display text-3xl font-semibold text-ivory">Tus claves se quedan aquí</h2>
      </header>
      <p>
        KeyGenius guarda solo lo necesario para saber si una licencia sigue vigente: nombre de la
        aplicación, clave, un identificador de equipo que envía tu programa, el estado y las fechas.
      </p>
      <p>
        Esa información no se vende, no se manda a redes, a Zapier, a modelos de inteligencia
        artificial ni a otras APIs. La validación ocurre en esta misma aplicación.
      </p>
      <p>
        El identificador de equipo no es un nombre, un teléfono ni una ubicación. KeyGenius no lee
        contactos, fotos ni la posición del teléfono.
      </p>
      <p>
        La clave de administrador se guarda como un cifrado de una sola vía, o vive solo en el
        servidor si configuras ADMIN_SECRET_KEY. No va dentro del código publicado ni se muestra a
        quien usa una licencia.
      </p>
      <p>
        Revocar una clave corta el acceso, pero el registro permanece para que puedas ver el
        historial. No hay cuentas para los clientes finales.
      </p>
      <p>
        La aplicación puede instalarse en el teléfono. El archivo que lo permite no guarda copias de
        las licencias.
      </p>
      <p>El responsable de los datos es quien administra esta instalación.</p>
    </article>
  );
}
