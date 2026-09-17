import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney } from "@/lib/format";
import BuyForm from "@/components/BuyForm";

export const dynamic = "force-dynamic";

async function getEvent(slug: string) {
  return prisma.event.findUnique({ where: { slug } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return {};

  return {
    title: event.name,
    description: event.description || `Comprá tu entrada para ${event.name}`,
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  let available: number | null = null;
  if (event.capacity != null) {
    const takenAgg = await prisma.order.aggregate({
      where: { eventId: event.id, status: { in: ["PAID_PENDING_APPROVAL", "APPROVED"] } },
      _sum: { quantity: true },
    });
    available = Math.max(event.capacity - (takenAgg._sum.quantity ?? 0), 0);
  }

  return (
    <main className="page">
      <div className="card">
        <p className="eyebrow">Entrada online</p>
        <h1>{event.name}</h1>
        {event.description && <p>{event.description}</p>}

        <div className="meta-row">
          <span className="meta-pill">📅 {formatDateTime(event.date)}</span>
          <span className="meta-pill">📍 {event.location}</span>
          {available != null && (
            <span className="meta-pill">🎟️ {available} disponibles</span>
          )}
        </div>

        <p className="price-tag">
          {event.priceCents === 0 ? "Gratis" : formatMoney(event.priceCents, event.currency)}
        </p>
      </div>

      <div className="card">
        <h2>Reservá tu entrada</h2>
        <BuyForm
          eventId={event.id}
          priceCents={event.priceCents}
          currency={event.currency}
          soldOut={available === 0}
        />
      </div>

      <footer className="site-footer">
        ¿Ya reservaste? Guardá el link que te dieron al confirmar para ver el estado de tu entrada.
      </footer>
    </main>
  );
}
