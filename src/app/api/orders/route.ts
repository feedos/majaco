import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPreferenceClient } from "@/lib/mercadopago";

const bodySchema = z.object({
  eventId: z.string().min(1),
  buyerName: z.string().trim().min(2, "Ingresá tu nombre completo").max(120),
  buyerEmail: z.string().trim().email("Ingresá un email válido"),
  quantity: z.coerce.number().int().min(1).max(10),
});

function getBaseUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: parsed.eventId } });
  if (!event) {
    return NextResponse.json({ error: "El evento no existe" }, { status: 404 });
  }

  if (event.capacity != null) {
    const takenAgg = await prisma.order.aggregate({
      where: {
        eventId: event.id,
        status: { in: ["PAID_PENDING_APPROVAL", "APPROVED"] },
      },
      _sum: { quantity: true },
    });
    const taken = takenAgg._sum.quantity ?? 0;
    if (taken + parsed.quantity > event.capacity) {
      return NextResponse.json(
        { error: "No quedan suficientes entradas disponibles" },
        { status: 409 }
      );
    }
  }

  const amountCents = event.priceCents * parsed.quantity;

  const order = await prisma.order.create({
    data: {
      eventId: event.id,
      buyerName: parsed.buyerName,
      buyerEmail: parsed.buyerEmail,
      quantity: parsed.quantity,
      amountCents,
      currency: event.currency,
    },
  });

  const baseUrl = getBaseUrl(req);
  const entradaUrl = `${baseUrl}/entrada/${order.personalToken}`;

  if (amountCents <= 0) {
    // Evento gratuito: no hace falta pasar por Mercado Pago.
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID_PENDING_APPROVAL", paidAt: new Date() },
    });
    return NextResponse.json({
      token: updated.personalToken,
      entradaUrl,
      checkoutUrl: null,
    });
  }

  try {
    const preference = await getPreferenceClient().create({
      body: {
        items: [
          {
            id: event.id,
            title: `Entrada - ${event.name}`,
            quantity: parsed.quantity,
            unit_price: event.priceCents / 100,
            currency_id: event.currency,
          },
        ],
        payer: {
          name: parsed.buyerName,
          email: parsed.buyerEmail,
        },
        external_reference: order.id,
        back_urls: {
          success: entradaUrl,
          failure: entradaUrl,
          pending: entradaUrl,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/mercadopago/webhook`,
        statement_descriptor: "ENTRADAS FIESTA",
      },
    });

    const checkoutUrl = preference.init_point ?? preference.sandbox_init_point ?? null;

    await prisma.order.update({
      where: { id: order.id },
      data: { mpPreferenceId: preference.id, mpInitPoint: checkoutUrl },
    });

    return NextResponse.json({
      token: order.personalToken,
      entradaUrl,
      checkoutUrl,
    });
  } catch (err) {
    console.error("Error creando preferencia de Mercado Pago", err);
    return NextResponse.json(
      {
        token: order.personalToken,
        entradaUrl,
        checkoutUrl: null,
        error:
          "No se pudo iniciar el pago con Mercado Pago. Verificá la configuración de MERCADOPAGO_ACCESS_TOKEN.",
      },
      { status: 502 }
    );
  }
}
