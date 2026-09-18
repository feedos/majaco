"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EventEditor, { type EventData } from "@/components/EventEditor";
import OrdersTable, { type AdminOrder } from "@/components/OrdersTable";
import { formatDateTime } from "@/lib/format";

const POLL_MS = 6000;

type View = { type: "list" } | { type: "create" } | { type: "event"; eventId: string };

export default function AdminDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [view, setView] = useState<View>({ type: "list" });

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevPending = useRef(0);

  function flashTitle() {
    if (typeof document === "undefined") return;
    const original = document.title;
    let flip = false;
    let ticks = 0;
    const id = setInterval(() => {
      document.title = flip ? "🔔 Nueva reserva" : original;
      flip = !flip;
      ticks++;
      if (ticks > 6) {
        clearInterval(id);
        document.title = original;
      }
    }, 1000);
  }

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/event", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      setError("No pudimos cargar los eventos.");
    } finally {
      setEventsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial, es async y no genera cascada sincrónica
    loadEvents();
  }, [loadEvents]);

  const selectedEventId = view.type === "event" ? view.eventId : null;
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const loadOrders = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(`/api/admin/orders?eventId=${eventId}`, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      const list: AdminOrder[] = data.orders ?? [];
      const pending = list.filter((o) => o.status === "PAID_PENDING_APPROVAL").length;
      if (pending > prevPending.current) {
        flashTitle();
      }
      prevPending.current = pending;
      setOrders(list);
    } catch {
      setError("No pudimos actualizar la lista de compradores.");
    } finally {
      setOrdersLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!selectedEventId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial + polling, es async y no genera cascada sincrónica
    loadOrders(selectedEventId);
    const id = setInterval(() => loadOrders(selectedEventId), POLL_MS);
    return () => clearInterval(id);
  }, [selectedEventId, loadOrders]);

  function selectEvent(eventId: string) {
    setOrdersLoading(true);
    prevPending.current = 0;
    setView({ type: "event", eventId });
  }

  async function handleApprove(id: string) {
    if (!selectedEventId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadOrders(selectedEventId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aceptar la orden");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    if (!selectedEventId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}/reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadOrders(selectedEventId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo rechazar la orden");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main className="page-wide">
      <div className="top-bar">
        <div>
          <p className="eyebrow">Panel de organizador</p>
          <h1 style={{ marginBottom: 0 }}>Tus eventos</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/admin/escanear" className="btn btn-primary" style={{ width: "auto" }}>
            Escanear entradas
          </Link>
          <button className="btn btn-secondary" style={{ width: "auto" }} onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {view.type === "list" && (
        <>
          {eventsLoading ? (
            <div className="card">
              <span className="spinner" />
            </div>
          ) : events.length === 0 ? (
            <div className="card empty-state">Todavía no creaste ningún evento.</div>
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                type="button"
                className="card"
                style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer" }}
                onClick={() => selectEvent(event.id)}
              >
                <h2 style={{ marginBottom: 8 }}>{event.name}</h2>
                <div className="meta-row" style={{ margin: 0 }}>
                  <span className="meta-pill">📅 {formatDateTime(event.date)}</span>
                  <span className="meta-pill">📍 {event.location}</span>
                </div>
              </button>
            ))
          )}
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 20 }}
            onClick={() => setView({ type: "create" })}
          >
            + Crear evento
          </button>
        </>
      )}

      {view.type === "create" && (
        <EventEditor
          event={null}
          onCancel={() => setView({ type: "list" })}
          onSaved={async (event) => {
            await loadEvents();
            selectEvent(event.id);
          }}
        />
      )}

      {view.type === "event" && selectedEvent && (
        <>
          <EventEditor
            event={selectedEvent}
            onCancel={() => setView({ type: "list" })}
            onSaved={() => {
              loadEvents();
            }}
          />

          {ordersLoading ? (
            <div className="card">
              <span className="spinner" />
            </div>
          ) : (
            <OrdersTable
              orders={orders}
              onApprove={handleApprove}
              onReject={handleReject}
              busyId={busyId}
            />
          )}
        </>
      )}

      {error && (
        <p className="error-text" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </main>
  );
}
