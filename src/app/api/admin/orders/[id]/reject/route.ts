import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

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
  if (order.status !== "PAID_PENDING_APPROVAL" && order.status !== "PENDING_PAYMENT") {
    return NextResponse.json(
      { error: "Esta orden no se puede rechazar en su estado actual" },
      { status: 409 }
    );
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: "REJECTED", rejectedAt: new Date() },
  });

  return NextResponse.json({ order: updated });
}
