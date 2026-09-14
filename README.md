# Entradas para la fiesta

Web para vender/cobrar entradas de una fiesta mediante un link. El
organizador carga su **alias** para recibir transferencias, cada comprador
transfiere por fuera de la app (desde su banco o billetera virtual) y el
organizador **confirma manualmente** el pago desde un panel. La persona ve
en tiempo real, en su propia página, cuando quedó confirmada.

## Cómo funciona el flujo

1. **La persona entra al link** (la home `/`) y completa nombre, email y
   cantidad de entradas.
2. La app le muestra el **alias/CBU** cargado por el organizador y el monto
   a transferir. La persona transfiere por fuera de la app (Mercado Pago,
   home banking, etc.) y toca **"Ya transferí"** para avisar.
3. La orden queda como **"Transferencia avisada, a confirmar"**.
4. El organizador entra a **`/admin`** (con contraseña), ve la lista de
   gente que avisó que transfirió, chequea en su cuenta/billetera que
   efectivamente llegó la plata, y hace click en **"Aceptar"** (o
   "Rechazar" si no llegó nada).
5. La persona, que se quedó en su link personal `/entrada/<token>`, ve **en
   tiempo real** (la página se refresca sola cada pocos segundos) que su
   entrada fue confirmada, junto con un **código y un QR** para mostrar en
   la puerta. También parpadea el título de la pestaña y, si dio permiso,
   le llega una notificación del navegador.

No se manda ningún email ni WhatsApp: la "notificación" es que la propia
página del comprador se actualiza sola. Guardá bien el link `/entrada/<token>`
porque es el único lugar donde la persona puede ver el estado de su entrada.

Si cargás el evento con precio $0, se saltea todo el paso de transferencia:
la reserva queda directo en "a confirmar" para que la aceptes.

## Requisitos

- Node.js 20+

No hace falta ninguna cuenta de pasarela de pago: el cobro es por
transferencia directa a tu alias, y vos confirmás cada pago a mano.

## Configuración local

```bash
npm install
cp .env.example .env   # ya viene copiado, pero por las dudas
```

Completá `.env`:

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión a la base. En local usa SQLite (`file:./dev.db`), no hace falta tocarlo. |
| `NEXT_PUBLIC_BASE_URL` | URL pública del sitio (se usa para armar el link personal `/entrada/<token>` de cada comprador). En local `http://localhost:3000`. |
| `ADMIN_PASSWORD` | Contraseña para entrar a `/admin`. Cambiala por una tuya. |
| `ADMIN_SESSION_SECRET` | Cadena random larga, se usa para firmar la cookie de sesión del admin. Cambiala por algo propio. |

Preparar la base y correr en modo desarrollo:

```bash
npx prisma migrate dev
npm run dev
```

Abrí `http://localhost:3000/admin`, iniciá sesión con `ADMIN_PASSWORD` y
cargá el evento (nombre, fecha, lugar, precio, capacidad opcional, y tu
**alias/CBU** para que te transfieran). Ese evento es el que se muestra en
la home.

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
   `NEXT_PUBLIC_BASE_URL` con tu dominio final, `ADMIN_PASSWORD`,
   `ADMIN_SESSION_SECRET`).
6. Desplegá. Entrá a `/admin` en tu dominio para cargar el evento (incluido
   tu alias de transferencia), y compartí el link de la home con quien
   quiera comprar entradas.

## Panel de administración (`/admin`)

- Protegido con la contraseña `ADMIN_PASSWORD` (cookie de sesión de 8hs).
- Permite crear/editar el evento (nombre, descripción, lugar, fecha,
  precio, capacidad opcional, alias/CBU y titular de la cuenta).
- Lista los compradores, con pestañas para ver primero **"Para revisar"**
  (los que ya avisaron que transfirieron y esperan tu confirmación),
  **"Confirmadas"** o **"Todas"**.
- **Aceptar** genera el código/QR de la entrada y dispara la actualización
  en la página personal del comprador. **Rechazar** cierra la orden sin
  generar entrada (por ejemplo, si nunca te llegó la transferencia).
- La lista se refresca sola cada pocos segundos y avisa (parpadeo del
  título de la pestaña) cuando entra una reserva nueva para revisar.

## Notas y límites conocidos

- El pago no se verifica automáticamente: el "Ya transferí" del comprador
  es solo un aviso, y sos vos quien confirma mirando tu cuenta/billetera
  antes de aceptar. Tené cuidado de chequear nombre y monto antes de
  aceptar una orden.
- Se genera **un código/QR por orden**, no uno por entrada individual: si
  alguien compra 3 entradas en una sola reserva, ese código representa las
  3 juntas. Si necesitás control de acceso persona por persona, se puede
  extender fácilmente generando N códigos por orden.
- La verificación de disponibilidad (`capacity`) es a nivel evento único;
  el proyecto está pensado para un solo evento activo a la vez (el más
  reciente cargado en `/admin`).
