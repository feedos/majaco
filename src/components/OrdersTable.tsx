"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import { STATUS_LABEL, statusClass } from "@/lib/status";
import type { OrderStatus } from "@prisma/client";

export type AdminOrder = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  amountCents: number;
  currency: string;
  status: OrderStatus;
  ticketCode: string | null;
  usedAt: string | null;
  createdAt: string;
  event: { name: string };
};

const FILTERS: { key: string; label: string; statuses: OrderStatus[] | null }[] = [
  { key: "action", label: "Para revisar", statuses: ["PAID_PENDING_APPROVAL"] },
  { key: "approved", label: "Confirmadas", statuses: ["APPROVED"] },
  { key: "all", label: "Todas", statuses: null },
];

export default function OrdersTable({
  orders,
  onApprove,
  onReject,
  busyId,
}: {
  orders: AdminOrder[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  busyId: string | null;
}) {
  const [filter, setFilter] = useState("action");

  const active = FILTERS.find((f) => f.key === filter)!;
  const filtered = useMemo(
    () =>
      active.statuses
        ? orders.filter((o) => active.statuses!.includes(o.status))
        : orders,
    [orders, active]
  );

  const pendingCount = orders.filter((o) => o.status === "PAID_PENDING_APPROVAL").length;

  return (
    <div className="card">
      <div className="top-bar">
        <h2 style={{ marginBottom: 0 }}>Compradores</h2>
      </div>

      <div className="tag-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`tab-btn ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
            type="button"
          >
            {f.label}
            {f.key === "action" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No hay compradores en esta vista.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Comprador</th>
                <th>Entradas</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Código</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td>
                    <div>{order.buyerName}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {order.buyerEmail}
                    </div>
                  </td>
                  <td>{order.quantity}</td>
                  <td>
                    {order.amountCents === 0
                      ? "Gratis"
                      : formatMoney(order.amountCents, order.currency)}
                  </td>
                  <td>
                    <span className={statusClass(order.status)}>
                      <span className="status-dot" />
                      {STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                    {order.ticketCode ?? "—"}
                    {order.usedAt && (
                      <div style={{ color: "var(--success)", fontSize: 12, marginTop: 2 }}>
                        ✅ Ingresó
                      </div>
                    )}
                  </td>
                  <td>
                    {order.status === "PAID_PENDING_APPROVAL" && (
                      <div className="btn-row" style={{ marginTop: 0 }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: "8px 14px" }}
                          disabled={busyId === order.id}
                          onClick={() => onApprove(order.id)}
                        >
                          Aceptar
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: "8px 14px" }}
                          disabled={busyId === order.id}
                          onClick={() => onReject(order.id)}
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
