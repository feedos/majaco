"use client";

import { useEffect, useState } from "react";

type EventData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  date: string;
  priceCents: number;
  currency: string;
  capacity: number | null;
  transferAlias: string;
  accountHolder: string;
};

function toDateTimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function EventEditor({
  onSaved,
}: {
  onSaved?: (event: EventData) => void;
}) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    date: "",
    price: "0",
    currency: "ARS",
    capacity: "",
    transferAlias: "",
    accountHolder: "",
  });

  useEffect(() => {
    fetch("/api/admin/event")
      .then((r) => r.json())
      .then((data) => {
        if (data.event) {
          setEvent(data.event);
          setForm({
            name: data.event.name,
            description: data.event.description ?? "",
            location: data.event.location,
            date: toDateTimeLocal(data.event.date),
            price: String(data.event.priceCents / 100),
            currency: data.event.currency,
            capacity: data.event.capacity != null ? String(data.event.capacity) : "",
            transferAlias: data.event.transferAlias ?? "",
            accountHolder: data.event.accountHolder ?? "",
          });
          setCollapsed(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event?.id,
          name: form.name,
          description: form.description,
          location: form.location,
          date: new Date(form.date).toISOString(),
          priceCents: Math.round(Number(form.price) * 100),
          currency: form.currency,
          capacity: form.capacity === "" ? null : Number(form.capacity),
          transferAlias: form.transferAlias,
          accountHolder: form.accountHolder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el evento");
      setEvent(data.event);
      setSuccess(true);
      setCollapsed(true);
      onSaved?.(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <span className="spinner" />
      </div>
    );
  }

  if (collapsed && event) {
    return (
      <div className="card">
        <div className="top-bar">
          <div>
            <p className="eyebrow">Evento</p>
            <h2 style={{ marginBottom: 0 }}>{event.name}</h2>
          </div>
          <button className="btn btn-secondary" style={{ width: "auto" }} onClick={() => setCollapsed(false)}>
            Editar
          </button>
        </div>
        <p className="hint">
          Link para compartir:{" "}
          <a href="/" target="_blank" rel="noreferrer">
            {typeof window !== "undefined" ? window.location.origin : ""}/
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>{event ? "Editar evento" : "Crear evento"}</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Nombre de la fiesta</label>
        <input
          id="name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <label htmlFor="description">Descripción</label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label htmlFor="location">Lugar</label>
        <input
          id="location"
          required
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />

        <label htmlFor="date">Fecha y hora</label>
        <input
          id="date"
          type="datetime-local"
          required
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="price">Precio por entrada</label>
            <input
              id="price"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div style={{ width: 110 }}>
            <label htmlFor="currency">Moneda</label>
            <input
              id="currency"
              maxLength={3}
              required
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <label htmlFor="capacity">Capacidad (opcional)</label>
        <input
          id="capacity"
          type="number"
          min={0}
          placeholder="Sin límite"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
        />

        <div className="divider" />

        <label htmlFor="transferAlias">Alias o CBU para transferencias</label>
        <input
          id="transferAlias"
          placeholder="fiesta.majaco.mp"
          required={Number(form.price) > 0}
          value={form.transferAlias}
          onChange={(e) => setForm({ ...form, transferAlias: e.target.value })}
        />
        <p className="hint" style={{ marginTop: -8, marginBottom: 0 }}>
          Esto es lo que va a ver cada comprador para transferirte. Vos confirmás cada pago
          a mano desde la lista de compradores.
        </p>

        <label htmlFor="accountHolder">Titular de la cuenta (opcional)</label>
        <input
          id="accountHolder"
          placeholder="Nombre del titular"
          value={form.accountHolder}
          onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
        />

        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar evento"}
          </button>
          {event && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCollapsed(true)}
            >
              Cancelar
            </button>
          )}
        </div>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">Evento guardado.</p>}
      </form>
    </div>
  );
}
