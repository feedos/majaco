import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const order = await prisma.order.findUnique({
    where: { personalToken: token },
    include: { event: true },
  });

  if (!order) {
    return NextResponse.json({ error: "No encontramos esa entrada" }, { status: 404 });
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
    transfer:
      order.status === "PENDING_PAYMENT"
        ? { alias: order.event.transferAlias, accountHolder: order.event.accountHolder }
        : null,
    event: {
      name: order.event.name,
      date: order.event.date,
      location: order.event.location,
    },
  });
}
