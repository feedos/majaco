# Entradas para la fiesta

Web para vender/cobrar entradas de una fiesta mediante un link, con pago real
por Mercado Pago, aprobación manual del organizador y una página personal de
la entrada que se actualiza sola (sin necesidad de email/WhatsApp) apenas el
organizador la acepta.

## Cómo funciona el flujo

1. **La persona entra al link** (la home `/`) y completa nombre, email y
   cantidad de entradas.
2. Se la manda a **pagar con Mercado Pago** (Checkout Pro). Si el evento es
   gratis (precio $0), se saltea el pago.
3. Mercado Pago le confirma el pago a la app (por webhook, y además por un
   chequeo automático de respaldo por si el webhook no está configurado) y
   la orden queda como **"Pagado, esperando confirmación"**.
4. El organizador entra a **`/admin`** (con contraseña), ve la lista de gente
   que pagó y hace click en **"Aceptar"** (o "Rechazar").
5. La persona, que se quedó en su link personal `/entrada/<token>`, ve **en
   tiempo real** (la página se refresca sola cada pocos segundos) que su
   entrada fue confirmada, junto con un **código y un QR** para mostrar en
   la puerta. También suena/parpadea el título de la pestaña y, si dio
   permiso, le llega una notificación del navegador.

No se manda ningún email ni WhatsApp: la "notificación" es que la propia
página del comprador se actualiza sola. Guardá bien el link `/entrada/<token>`
porque es el único lugar donde la persona puede ver el estado de su entrada.

## Requisitos

- Node.js 20+
- Una cuenta de [Mercado Pago](https://www.mercadopago.com.ar/developers/panel/app)
  para conseguir el **Access Token** (podés usar credenciales de prueba
  mientras desarrollás, y las de producción cuando cobres de verdad).

## Configuración local

```bash
npm install
cp .env.example .env   # ya viene copiado, pero por las dudas
```

Completá `.env`:

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión a la base. En local usa SQLite (`file:./dev.db`), no hace falta tocarlo. |
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token de tu cuenta de Mercado Pago (Panel de desarrolladores → Tus integraciones → Credenciales). |
| `NEXT_PUBLIC_BASE_URL` | URL pública del sitio (se usa para armar los links de vuelta de Mercado Pago y el webhook). En local `http://localhost:3000`. |
| `ADMIN_PASSWORD` | Contraseña para entrar a `/admin`. Cambiala por una tuya. |
| `ADMIN_SESSION_SECRET` | Cadena random larga, se usa para firmar la cookie de sesión del admin. Cambiala por algo propio. |

Preparar la base y correr en modo desarrollo:

```bash
npx prisma migrate dev
npm run dev
```

Abrí `http://localhost:3000/admin`, iniciá sesión con `ADMIN_PASSWORD` y
cargá el evento (nombre, fecha, lugar, precio, capacidad opcional). Ese
evento es el que se muestra en la home.

## Probar pagos sin cobrar de verdad

Mercado Pago tiene un modo de pruebas: generá **usuarios de prueba** y
credenciales de test desde el panel de desarrolladores, usalas en
`MERCADOPAGO_ACCESS_TOKEN` mientras probás, y cambiala por las credenciales
reales (de producción) recién cuando quieras cobrar entradas de verdad.

## El webhook de Mercado Pago (recomendado, no obligatorio)

Para que la orden pase a "pagado" apenas se confirma el pago (y no recién
cuando la persona vuelve a mirar su página), configurá en el panel de
Mercado Pago (Tu aplicación → Webhooks) la URL:

```
https://TU-DOMINIO/api/mercadopago/webhook
```

suscripta al evento **"Pagos"**. Si no lo configurás, no pasa nada grave: la
página `/entrada/<token>` igual chequea el estado del pago contra la API de
Mercado Pago cada vez que se refresca, así que en unos segundos se pone al
día solo.

## Desplegar en producción

La app es un proyecto Next.js estándar, lista para **Vercel** (gratis para
este uso):

1. **Base de datos**: SQLite no sirve en Vercel (el filesystem no persiste
   entre invocaciones). Creá una base Postgres gratis, por ejemplo en
   [Neon](https://neon.tech) o [Supabase](https://supabase.com), y copiá su
   `DATABASE_URL`.
2. En `prisma/schema.prisma` cambiá:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
   por:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Borrá la carpeta `prisma/migrations` (son migraciones de SQLite) y
   generá las de Postgres corriendo, con tu `DATABASE_URL` de Postgres en
   `.env`:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Subí el repo a GitHub e importalo en [Vercel](https://vercel.com/new).
5. En Vercel, configurá las variables de entorno (`DATABASE_URL`,
   `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_BASE_URL` con tu dominio final,
   `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`).
6. Desplegá. Entrá a `/admin` en tu dominio para cargar el evento, y
   compartí el link de la home con quien quiera comprar entradas.

## Panel de administración (`/admin`)

- Protegido con la contraseña `ADMIN_PASSWORD` (cookie de sesión de 8hs).
- Permite crear/editar el evento (nombre, descripción, lugar, fecha, precio,
  capacidad opcional).
- Lista los compradores, con pestañas para ver primero **"Para revisar"**
  (los que ya pagaron y esperan tu aceptación), **"Confirmadas"** o
  **"Todas"**.
- **Aceptar** genera el código/QR de la entrada y dispara la actualización
  en la página personal del comprador. **Rechazar** cierra la orden sin
  generar entrada.
- La lista se refresca sola cada pocos segundos y avisa (parpadeo del
  título de la pestaña) cuando entra una reserva nueva para revisar.

## Notas y límites conocidos

- Se genera **un código/QR por orden**, no uno por entrada individual: si
  alguien compra 3 entradas en una sola reserva, ese código representa las
  3 juntas. Si necesitás control de acceso persona por persona, se puede
  extender fácilmente generando N códigos por orden.
- La verificación de disponibilidad (`capacity`) es a nivel evento único;
  el proyecto está pensado para un solo evento activo a la vez (el más
  reciente cargado en `/admin`).
