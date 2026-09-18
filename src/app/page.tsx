import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const events = await prisma.event.findMany({ orderBy: { date: "asc" } });

  if (events.length === 0) {
    return (
      <main className="page">
        <div className="card center">
          <p className="eyebrow">Todavía no hay ningún evento</p>
          <h1>Nada por aquí, por ahora</h1>
          <p>
            El organizador todavía no cargó ningún evento. Si sos vos, entrá al{" "}
            <Link href="/admin">panel de administración</Link> para crear uno.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="card">
        <p className="eyebrow">Entradas online</p>
        <h1>Próximos eventos</h1>
      </div>

      {events.map((event) => (
        <Link
          key={event.id}
          href={`/${event.slug}`}
          className="card"
          style={{ display: "block", textDecoration: "none" }}
        >
          <h2 style={{ marginBottom: 8 }}>{event.name}</h2>
          <div className="meta-row" style={{ margin: "0 0 10px" }}>
            <span className="meta-pill">📅 {formatDateTime(event.date)}</span>
            <span className="meta-pill">📍 {event.location}</span>
          </div>
          <p className="price-tag" style={{ fontSize: 20, margin: 0 }}>
            {event.priceCents === 0 ? "Gratis" : formatMoney(event.priceCents, event.currency)}
          </p>
        </Link>
      ))}
    </main>
  );
}
