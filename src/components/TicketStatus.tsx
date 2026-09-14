"use client";

import { useEffect, useRef, useState } from "react";
import { formatDateTime, formatMoney } from "@/lib/format";
import { STATUS_LABEL, statusClass } from "@/lib/status";
import type { OrderStatus } from "@prisma/client";

type OrderInfo = {
  status: OrderStatus;
  buyerName: string;
  quantity: number;
  amountCents: number;
  currency: string;
  ticketCode: string | null;
  qrDataUrl: string | null;
  checkoutUrl: string | null;
  event: { name: string; date: string; location: string };
};

const POLL_MS = 4000;

export default function TicketStatus({ token }: { token: string }) {
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState(false);
  const [copied, setCopied] = useState(false);
  const prevStatus = useRef<OrderStatus | null>(null);
  const originalTitle = useRef<string | null>(null);

  function notifyApproved(eventName: string) {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("¡Tu entrada fue confirmada! 🎉", {
            body: `Ya podés ver tu entrada para ${eventName}.`,
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
    } catch {
      // Notification API no disponible, no pasa nada.
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/orders/${token}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || "No encontramos esa entrada");
          return;
        }

        setOrder(data);

        if (prevStatus.current && prevStatus.current !== "APPROVED" && data.status === "APPROVED") {
          setJustApproved(true);
          notifyApproved(data.event.name);
        }
        prevStatus.current = data.status;
      } catch {
        if (!cancelled) setError("No pudimos conectarnos. Reintentando...");
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  useEffect(() => {
    if (!justApproved) return;
    if (typeof document === "undefined") return;
    if (originalTitle.current === null) originalTitle.current = document.title;

    let flip = false;
    const id = setInterval(() => {
      document.title = flip ? "🎉 ¡Entrada confirmada!" : String(originalTitle.current);
      flip = !flip;
    }, 1200);

    const timeout = setTimeout(() => {
      clearInterval(id);
      if (originalTitle.current) document.title = originalTitle.current;
    }, 15000);

    return () => {
      clearInterval(id);
      clearTimeout(timeout);
      if (originalTitle.current) document.title = originalTitle.current;
    };
  }, [justApproved]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (error && !order) {
    return (
      <main className="page">
        <div className="card center">
          <h1>Ups</h1>
          <p className="error-text">{error}</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="page">
        <div className="card center">
          <span className="spinner" style={{ margin: "0 auto" }} />
          <p style={{ marginTop: 14 }}>Cargando tu entrada...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="card">
        <div className="top-bar">
          <div>
            <p className="eyebrow">Tu entrada</p>
            <h1 style={{ marginBottom: 0 }}>{order.event.name}</h1>
          </div>
          <span className={statusClass(order.status)}>
            <span className="status-dot" />
            {STATUS_LABEL[order.status]}
          </span>
        </div>

        <div className="meta-row">
          <span className="meta-pill">📅 {formatDateTime(order.event.date)}</span>
          <span className="meta-pill">📍 {order.event.location}</span>
          <span className="meta-pill">
            🎟️ {order.quantity} {order.quantity === 1 ? "entrada" : "entradas"}
          </span>
        </div>

        <p>
          A nombre de <strong>{order.buyerName}</strong> ·{" "}
          {order.amountCents === 0 ? "Gratis" : formatMoney(order.amountCents, order.currency)}
        </p>

        <div className="divider" />

        {order.status === "PENDING_PAYMENT" && (
          <div>
            <p>Todavía no completaste el pago.</p>
            {order.checkoutUrl ? (
              <a className="btn btn-primary" href={order.checkoutUrl}>
                Pagar con Mercado Pago
              </a>
            ) : (
              <p className="error-text">
                No pudimos generar el link de pago. Volvé a intentar desde el inicio o
                contactá al organizador.
              </p>
            )}
          </div>
        )}

        {order.status === "PAID_PENDING_APPROVAL" && (
          <div className="center">
            <p className="pulse" style={{ fontSize: 15 }}>
              💳 Pago recibido. El organizador tiene que confirmar tu entrada, esta página se
              actualiza sola apenas lo haga.
            </p>
          </div>
        )}

        {order.status === "APPROVED" && (
          <div className="center">
            {justApproved && (
              <p className="success-text" style={{ fontSize: 15 }}>
                🎉 ¡Te acaban de confirmar la entrada!
              </p>
            )}
            {order.qrDataUrl && (
              <div className="qr-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={order.qrDataUrl} alt="Código QR de la entrada" width={220} height={220} />
              </div>
            )}
            <p className="ticket-code">{order.ticketCode}</p>
            <p className="hint">Mostrá este código o el QR en la entrada de la fiesta.</p>
          </div>
        )}

        {order.status === "REJECTED" && (
          <p className="error-text center">
            Tu entrada fue rechazada. Si creés que es un error, contactá al organizador.
          </p>
        )}

        {order.status === "CANCELLED" && (
          <p className="error-text center">Esta reserva fue cancelada.</p>
        )}

        <div className="divider" />
        <p className="hint" style={{ marginBottom: 8 }}>
          Guardá este link, es tu comprobante y donde vas a ver el estado de tu entrada:
        </p>
        <div className="copy-row">
          <input readOnly value={typeof window !== "undefined" ? window.location.href : ""} />
          <button className="btn btn-secondary" onClick={copyLink} type="button">
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      </div>
    </main>
  );
}
