import { prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney } from "@/lib/format";
import BuyForm from "@/components/BuyForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const event = await prisma.event.findFirst({ orderBy: { createdAt: "desc" } });

  if (!event) {
    return (
      <main className="page">
        <div className="card center">
          <p className="eyebrow">Todavía no hay ningún evento</p>
          <h1>Nada por aquí, por ahora</h1>
          <p>
            El organizador todavía no cargó la fiesta. Si sos vos, entrá al{" "}
            <a href="/admin">panel de administración</a> para crearla.
          </p>
        </div>
      </main>
    );
  }

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
