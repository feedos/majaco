import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// El comprador avisa que ya hizo la transferencia. Esto NO confirma el pago:
// solo pone la orden en la cola de revisión para que el organizador chequee
// su cuenta y la acepte o la rechace desde /admin.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const order = await prisma.order.findUnique({ where: { personalToken: token } });
  if (!order) {
    return NextResponse.json({ error: "No encontramos esa entrada" }, { status: 404 });
  }
  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "Esta orden ya fue actualizada" }, { status: 409 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID_PENDING_APPROVAL", declaredPaidAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
