import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const bodySchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(2).max(140),
    description: z.string().trim().max(2000).optional().default(""),
    location: z.string().trim().min(2).max(200),
    date: z.string().min(1),
    priceCents: z.coerce.number().int().min(0),
    currency: z.string().trim().min(3).max(3).default("ARS"),
    capacity: z.coerce.number().int().min(0).optional().nullable(),
    transferAlias: z.string().trim().max(120).optional().default(""),
    accountHolder: z.string().trim().max(120).optional().default(""),
  })
  .refine((data) => data.priceCents === 0 || data.transferAlias.length >= 2, {
    message: "Ingresá el alias/CBU para recibir las transferencias",
    path: ["transferAlias"],
  });

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "evento"
  );
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const event = await prisma.event.findFirst({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ event });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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

  const date = new Date(parsed.date);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const data = {
    name: parsed.name,
    description: parsed.description ?? "",
    location: parsed.location,
    date,
    priceCents: parsed.priceCents,
    currency: parsed.currency.toUpperCase(),
    capacity: parsed.capacity ?? null,
    transferAlias: parsed.transferAlias,
    accountHolder: parsed.accountHolder,
  };

  if (parsed.id) {
    const event = await prisma.event.update({ where: { id: parsed.id }, data });
    return NextResponse.json({ event });
  }

  let slug = slugify(parsed.name);
  const clash = await prisma.event.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const event = await prisma.event.create({ data: { ...data, slug } });
  return NextResponse.json({ event });
}
