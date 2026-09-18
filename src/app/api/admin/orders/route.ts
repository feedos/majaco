import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const eventId = req.nextUrl.searchParams.get("eventId");

  const orders = await prisma.order.findMany({
    where: eventId ? { eventId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { event: { select: { name: true } } },
  });

  return NextResponse.json({ orders });
}
