import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  eventId: z.string().min(1),
  buyerName: z.string().trim().min(2, "Ingresá tu nombre completo").max(120),
  buyerEmail: z.string().trim().email("Ingresá un email válido"),
  quantity: z.coerce.number().int().min(1).max(10),
});

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
      // Evento gratuito: no hace falta transferencia, pasa directo a revisión.
      ...(amountCents <= 0
        ? { status: "PAID_PENDING_APPROVAL", declaredPaidAt: new Date() }
        : {}),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;

  return NextResponse.json({
    token: order.personalToken,
    entradaUrl: `${baseUrl}/entrada/${order.personalToken}`,
  });
}
