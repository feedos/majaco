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
   a transferir. La persona transfiere por fuera de la app (home banking,
   billetera virtual, etc.) y toca **"Ya transferí"** para avisar.
3. La orden queda como **"Transferencia avisada, a confirmar"**.
4. El organizador entra a **`/admin`** (con contraseña), ve la lista de
   gente que avisó que transfirió, chequea en su cuenta que efectivamente
   llegó la plata, y hace click en **"Aceptar"** (o "Rechazar" si no llegó
   nada).
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

No hace falta ninguna cuenta de pasarela de pago: el cobro es por
transferencia directa a tu alias, y vos confirmás cada pago a mano.

## Requisitos

- Node.js 20+
- Una base de datos **Postgres** (ver abajo cómo conseguir una gratis).

## 1) Conseguir una base de datos Postgres gratis

1. Andá a [neon.tech](https://neon.tech) (o [supabase.com](https://supabase.com),
   cualquiera de los dos sirve) y entrá con tu cuenta de GitHub.
2. Creá un proyecto nuevo (nombre libre, por ejemplo "majaco").
3. Copiá el **connection string** que te dan (empieza con `postgresql://...`).
   En Neon está en el dashboard del proyecto, botón "Connect"; en Supabase
   en Project Settings → Database → Connection string (modo "URI").

Con eso ya tenés tu `DATABASE_URL`.

## 2) Configuración local (opcional, para probar en tu compu)

```bash
npm install
cp .env.example .env
```

Completá `.env` con la `DATABASE_URL` de arriba y una contraseña propia en
`ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET`. Después:

```bash
npx prisma migrate deploy
npm run dev
```

Abrí `http://localhost:3000/admin`, iniciá sesión con `ADMIN_PASSWORD` y
cargá el evento (nombre, fecha, lugar, precio, capacidad opcional, y tu
**alias/CBU** para que te transfieran).

## 3) Desplegar en Vercel

1. Este repo ya está en GitHub. Andá a [vercel.com/new](https://vercel.com/new),
   entrá con tu cuenta de GitHub e importá el repo `majaco`.
2. Antes de darle a "Deploy", abrí **"Environment Variables"** y cargá:

   | Variable | Valor |
   | --- | --- |
   | `DATABASE_URL` | El connection string de Neon/Supabase del paso 1 |
   | `NEXT_PUBLIC_BASE_URL` | El dominio que te va a dar Vercel, por ejemplo `https://majaco.vercel.app` (podés dejarlo así, editarlo después de desplegar si cambia) |
   | `ADMIN_PASSWORD` | Una contraseña tuya para entrar a `/admin` |
   | `ADMIN_SESSION_SECRET` | Cualquier texto largo y random (por ejemplo, generalo en [1password.com/password-generator](https://1password.com/password-generator/) o similar) |

3. Click en **Deploy** y esperá que termine (1-2 minutos).
4. Una vez desplegado, entrá una sola vez por SSH/terminal a crear las
   tablas en tu base (Vercel no corre migraciones solo). Lo más simple es
   hacerlo desde tu compu, apuntando a la misma `DATABASE_URL` de
   producción:
   ```bash
   DATABASE_URL="tu-connection-string-de-neon-o-supabase" npx prisma migrate deploy
   ```
5. Entrá a tu dominio de Vercel → `/admin`, cargá el evento (con tu
   alias/CBU) y compartí el link de la home con quien quiera comprar
   entradas.

Cada vez que se haga `git push` a la rama conectada, Vercel vuelve a
desplegar solo.

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

## Escanear entradas en la puerta (`/admin/escanear`)

Desde el botón **"Escanear entradas"** del panel (o yendo directo a
`/admin/escanear`) se abre la cámara del celular para leer el QR de cada
entrada:

- **✅ Verde**: entrada válida, la marca como usada (queda "Ingresó" en la
  lista de `/admin`).
- **⚠️ Ya usada**: ese QR ya había entrado antes (evita que reingresen con
  una captura de pantalla reenviada).
- **❌ Inválido**: el código no corresponde a ninguna entrada confirmada.

El navegador va a pedir permiso de cámara la primera vez; tiene que ser
sobre **HTTPS** (Vercel ya lo sirve así) para que funcione.

## Notas y límites conocidos

- El pago no se verifica automáticamente: el "Ya transferí" del comprador
  es solo un aviso, y sos vos quien confirma mirando tu cuenta/billetera
  antes de aceptar. Tené cuidado de chequear nombre y monto antes de
  aceptar una orden.
- Se genera **un código/QR por orden**, no uno por entrada individual: si
  alguien compra 3 entradas en una sola reserva, ese código representa las
  3 juntas y un solo escaneo las marca todas como ingresadas. Si necesitás
  control de acceso persona por persona, se puede extender fácilmente
  generando N códigos por orden.
- La verificación de disponibilidad (`capacity`) es a nivel evento único;
  el proyecto está pensado para un solo evento activo a la vez (el más
  reciente cargado en `/admin`).
