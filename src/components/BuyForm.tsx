"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

export default function BuyForm({
  eventId,
  priceCents,
  currency,
  soldOut,
}: {
  eventId: string;
  priceCents: number;
  currency: string;
  soldOut: boolean;
}) {
  const router = useRouter();
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = priceCents * quantity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, buyerName, buyerEmail, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No pudimos procesar tu reserva");
      }
      router.push(`/entrada/${data.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado");
      setLoading(false);
    }
  }

  if (soldOut) {
    return <p className="error-text">No quedan entradas disponibles para este evento.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="buyerName">Nombre y apellido</label>
      <input
        id="buyerName"
        required
        value={buyerName}
        onChange={(e) => setBuyerName(e.target.value)}
        placeholder="Como figura en tu DNI"
        autoComplete="name"
      />

      <label htmlFor="buyerEmail">Email</label>
      <input
        id="buyerEmail"
        type="email"
        required
        value={buyerEmail}
        onChange={(e) => setBuyerEmail(e.target.value)}
        placeholder="tu@email.com"
        autoComplete="email"
      />

      <label htmlFor="quantity">Cantidad de entradas</label>
      <select
        id="quantity"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <div className="divider" />

      <div className="btn-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "var(--text-muted)" }}>Total</span>
        <strong>{total === 0 ? "Gratis" : formatMoney(total, currency)}</strong>
      </div>

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 14 }}>
        {loading && <span className="spinner" />}
        {loading ? "Procesando..." : total === 0 ? "Reservar entrada" : "Continuar al pago"}
      </button>

      {error && <p className="error-text">{error}</p>}
    </form>
  );
}
