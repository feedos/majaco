import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { generateTicketCode } from "@/lib/format";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }
  if (order.status !== "PAID_PENDING_APPROVAL") {
    return NextResponse.json(
      { error: "Solo se pueden aceptar órdenes pagadas y pendientes de aprobación" },
      { status: 409 }
    );
  }

  let ticketCode = generateTicketCode();
  // Evitamos colisiones improbables del código de entrada.
  for (let attempts = 0; attempts < 5; attempts++) {
    const clash = await prisma.order.findUnique({ where: { ticketCode } });
    if (!clash) break;
    ticketCode = generateTicketCode();
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date(), ticketCode },
  });

  return NextResponse.json({ order: updated });
}
