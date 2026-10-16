# Manantial

Aplicación web progresiva (PWA) para un devocional cristiano diario y un recorrido completo por los 1.189 capítulos de la Biblia en 365 días. La lectura está organizada por referencias bíblicas; no incluye el texto de la Reina-Valera 1960.

Incluye cuentas personales, inicio de sesión, seguimiento privado del progreso y grupos con códigos de invitación. Las cuentas administradoras se inicializan solo desde variables de entorno.

## Requisitos

- Node.js 18 o posterior.
- Una clave de API de un proveedor compatible con la API de chat completions para generar reflexiones con IA.

## Desarrollo

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` a `.env` y configura `AI_API_KEY`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. La contraseña inicial del administrador debe tener al menos 12 caracteres. Puedes cambiar `AI_BASE_URL` y `AI_MODEL` según el proveedor.
3. Ejecuta `npm run local` (inicia la API y la web a la vez) y abre http://localhost:5173. También puedes usar `npm run dev:api` y `npm run dev` en dos terminales.

Cada uno de los 365 días tiene un devocional propio escrito para su lectura (título, reflexión, pregunta, oración, práctica, historia de aplicación y lección aprendida) en `src/devotionals/01.js` a `12.js`, en bloques de 31 días. `npm test` verifica que no falte ningún día ni se repita ningún contenido. La IA solo se usa si algún día no tuviera devocional escrito. Las claves de IA solo se leen en el servidor y nunca se envían al navegador. Las cuentas requieren que el servidor de API esté activo.

## Cuentas y grupos

- Las personas crean su cuenta desde la aplicación. La contraseña tiene un mínimo de 10 caracteres y se guarda con `scrypt`; las sesiones usan una cookie `HttpOnly`.
- La cuenta administradora se crea la primera vez que se inicia el servidor con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. No existe registro público de administradores.
- Desde **Usuarios**, el administrador crea cuentas (nombre, correo, contraseña y grupo opcional), cambia a las personas de grupo o elimina cuentas.
- Desde **Grupos**, el administrador crea un grupo y comparte su código de invitación. Una persona puede ingresar el código al registrarse o unirse después en **Mi grupo**.
- El panel administrador muestra los participantes, el avance del plan y su última actividad. No muestra reflexiones guardadas ni contraseñas.
- Las cuentas y el progreso se guardan en `data/database.json`. Este archivo no se versiona; protégelo y respáldalo en producción.
- En producción configura HTTPS y define `NODE_ENV=production` para habilitar cookies seguras.

Pruebas de la API: `npm test`.

## Producción

Ejecuta `npm run build` y luego `node server.js` con `NODE_ENV=production`: el mismo servidor entrega la web de `dist/` y la API en `/api`. Usa el puerto de `PORT` (o `API_PORT`). Los datos de cuentas se guardan en `DATA_DIR/database.json` (por defecto `data/`); la generación de devocionales se almacena en memoria por día mientras el proceso del servidor siga activo.

### Render

`render.yaml` define el servicio. En Render elige **New → Blueprint**, conecta este repositorio y completa `ADMIN_EMAIL` (un correo), `ADMIN_PASSWORD` (mínimo 12 caracteres) y `AI_API_KEY`. En el plan gratis los datos se borran en cada reinicio; para conservarlos usa un plan con disco y define `DATA_DIR` (ver comentarios en `render.yaml`).

## Contenido bíblico

El plan recorre en orden los capítulos de los 66 libros, distribuyendo las 1.189 lecturas a lo largo de 365 días. Las reflexiones y oraciones son contenido original generado para la aplicación; las referencias orientan la lectura en una Biblia Reina-Valera 1960 con licencia.
