import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { syncOrderWithMercadoPago } from "@/lib/order-payment";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let order = await prisma.order.findUnique({
    where: { personalToken: token },
    include: { event: true },
  });

  if (!order) {
    return NextResponse.json({ error: "No encontramos esa entrada" }, { status: 404 });
  }

  if (order.status === "PENDING_PAYMENT") {
    const updated = await syncOrderWithMercadoPago(order.id);
    if (updated) order = { ...order, ...updated };
  }

  let qrDataUrl: string | null = null;
  if (order.status === "APPROVED" && order.ticketCode) {
    qrDataUrl = await QRCode.toDataURL(order.ticketCode, { margin: 1, width: 260 });
  }

  return NextResponse.json({
    status: order.status,
    buyerName: order.buyerName,
    quantity: order.quantity,
    amountCents: order.amountCents,
    currency: order.currency,
    ticketCode: order.status === "APPROVED" ? order.ticketCode : null,
    qrDataUrl,
    checkoutUrl: order.status === "PENDING_PAYMENT" ? order.mpInitPoint : null,
    event: {
      name: order.event.name,
      date: order.event.date,
      location: order.event.location,
    },
  });
}
