import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { code } = await req.json().catch(() => ({ code: "" }));
  const ticketCode = typeof code === "string" ? code.trim().toUpperCase() : "";

  if (!ticketCode) {
    return NextResponse.json({ ok: false, reason: "empty" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { ticketCode },
    include: { event: { select: { name: true } } },
  });

  if (!order || order.status !== "APPROVED") {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  if (order.usedAt) {
    return NextResponse.json({
      ok: false,
      reason: "already_used",
      buyerName: order.buyerName,
      quantity: order.quantity,
      usedAt: order.usedAt,
    });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    buyerName: order.buyerName,
    quantity: order.quantity,
    eventName: order.event.name,
    usedAt: updated.usedAt,
  });
}
