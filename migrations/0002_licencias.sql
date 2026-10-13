-- Licencias de producto. Filas sin dueño de cuenta: el panel se protege
-- con clave de administrador (entorno o hash en admin_config), no con cuentas.
create table if not exists licencias (
  id                bigserial primary key,
  nombre_app        text not null,
  clave             text not null,
  dispositivo_id    text,
  estado            text not null default 'DISPONIBLE',
  fecha_creacion    timestamptz not null default now(),
  fecha_activacion  timestamptz,
  fecha_expiracion  timestamptz,
  constraint licencias_estado_chk check (estado in ('DISPONIBLE', 'ACTIVA', 'BLOQUEADA')),
  constraint licencias_nombre_len check (char_length(nombre_app) between 1 and 80),
  constraint licencias_clave_len check (char_length(clave) between 8 and 64)
);

create unique index if not exists licencias_clave_uidx on licencias (clave);
create index if not exists licencias_estado_idx on licencias (estado);
create index if not exists licencias_nombre_app_idx on licencias (nombre_app);
create index if not exists licencias_dispositivo_idx on licencias (dispositivo_id);
create index if not exists licencias_expiracion_idx on licencias (fecha_expiracion);

-- Una sola clave de administrador, guardada como hash. Nunca el texto plano.
create table if not exists admin_config (
  id          integer primary key check (id = 1),
  clave_hash  text not null,
  creado_en   timestamptz not null default now()
);
