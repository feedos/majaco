"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import EventEditor from "@/components/EventEditor";
import OrdersTable, { type AdminOrder } from "@/components/OrdersTable";

const POLL_MS = 6000;

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
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
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial + polling, es async y no genera cascada sincrónica
    loadOrders();
    const id = setInterval(loadOrders, POLL_MS);
    return () => clearInterval(id);
  }, [loadOrders]);

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aceptar la orden");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}/reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadOrders();
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
          <h1 style={{ marginBottom: 0 }}>Entradas de la fiesta</h1>
        </div>
        <button className="btn btn-secondary" style={{ width: "auto" }} onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>

      <EventEditor />

      {loading ? (
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

      {error && (
        <p className="error-text" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </main>
  );
}
