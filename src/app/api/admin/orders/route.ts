import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { event: { select: { name: true } } },
  });

  return NextResponse.json({ orders });
}
