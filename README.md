# KeyGenius

Panel privado para crear y validar licencias de producto.

El repositorio solo contiene el programa. No incluye claves de clientes ni la contraseña del administrador.

## Qué hace

- Genera seriales `APP-XXXX-YYYY-ZZZZ` en estado `DISPONIBLE`.
- El primer uso vincula un equipo, activa la clave y la hace vencer a los 32 días.
- Si otro equipo la presenta, se niega el acceso.
- Pasados 32 días, la clave pasa a `BLOQUEADA`.
- En el día 27 y en el día 29 avisa que se acerca el día 30.

## Acceso de administrador

- Si el servidor tiene `ADMIN_SECRET_KEY` (8 caracteres o más), esa es la única clave.
- Si no, la primera apertura publicada pide crear una. Se guarda cifrada.
- Las rutas de administración no aceptan la clave de la vista previa.

## Rutas

- `POST /api/admin/generar` — cuerpo `{ "nombre_app", "cantidad" }`. Encabezado `x-admin-key`.
- `GET /api/admin/dashboard` — listado protegido.
- `POST /api/admin/bloquear` — cuerpo `{ "id" }`.
- `POST /api/licencia/validar` — cuerpo `{ "clave", "nombre_app", "dispositivo_id" }`. Pública a propósito, solo responde por esa clave.
