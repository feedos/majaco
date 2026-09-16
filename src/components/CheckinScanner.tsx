"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import QrScanner from "@/components/QrScanner";

type Result =
  | { kind: "ok"; buyerName: string; quantity: number }
  | { kind: "already_used"; buyerName: string; quantity: number; usedAt: string }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

const COOLDOWN_MS = 2500;

export default function CheckinScanner() {
  const [result, setResult] = useState<Result | null>(null);
  const [checking, setChecking] = useState(false);
  const lastCodeRef = useRef<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleScan(raw: string) {
    const code = raw.trim().toUpperCase();
    if (checking || code === lastCodeRef.current) return;

    lastCodeRef.current = code;
    setChecking(true);
    try {
      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setResult({ kind: "ok", buyerName: data.buyerName, quantity: data.quantity });
      } else if (data.reason === "already_used") {
        setResult({
          kind: "already_used",
          buyerName: data.buyerName,
          quantity: data.quantity,
          usedAt: data.usedAt,
        });
      } else {
        setResult({ kind: "not_found" });
      }
    } catch {
      setResult({ kind: "error", message: "No pudimos validar el código. Probá de nuevo." });
    } finally {
      setChecking(false);
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
      cooldownRef.current = setTimeout(() => {
        lastCodeRef.current = null;
        setResult(null);
      }, COOLDOWN_MS);
    }
  }

  const paused = result !== null || checking;

  return (
    <main className="page">
      <div className="top-bar">
        <div>
          <p className="eyebrow">Puerta</p>
          <h1 style={{ marginBottom: 0 }}>Escanear entradas</h1>
        </div>
        <Link href="/admin" className="btn btn-secondary" style={{ width: "auto" }}>
          Volver
        </Link>
      </div>

      <div className="card">
        <QrScanner onScan={handleScan} paused={paused} />
        <p className="hint center" style={{ marginTop: 14 }}>
          Apuntá la cámara al QR de la entrada.
        </p>
      </div>

      {checking && (
        <div className="card center">
          <span className="spinner" style={{ margin: "0 auto" }} />
        </div>
      )}

      {result?.kind === "ok" && (
        <div className="card center" style={{ borderColor: "var(--success)" }}>
          <p style={{ fontSize: 40, margin: "0 0 8px" }}>✅</p>
          <h2 style={{ marginBottom: 4 }}>Entrada válida</h2>
          <p>
            <strong>{result.buyerName}</strong> · {result.quantity}{" "}
            {result.quantity === 1 ? "entrada" : "entradas"}
          </p>
        </div>
      )}

      {result?.kind === "already_used" && (
        <div className="card center" style={{ borderColor: "var(--danger)" }}>
          <p style={{ fontSize: 40, margin: "0 0 8px" }}>⚠️</p>
          <h2 style={{ marginBottom: 4 }}>Ya fue usada</h2>
          <p>
            <strong>{result.buyerName}</strong> · {result.quantity}{" "}
            {result.quantity === 1 ? "entrada" : "entradas"}
          </p>
          <p className="hint">
            Ingresó a las{" "}
            {new Intl.DateTimeFormat("es-AR", { timeStyle: "short" }).format(
              new Date(result.usedAt)
            )}
          </p>
        </div>
      )}

      {result?.kind === "not_found" && (
        <div className="card center" style={{ borderColor: "var(--danger)" }}>
          <p style={{ fontSize: 40, margin: "0 0 8px" }}>❌</p>
          <h2 style={{ marginBottom: 4 }}>Código inválido</h2>
          <p>No corresponde a ninguna entrada confirmada.</p>
        </div>
      )}

      {result?.kind === "error" && <p className="error-text center">{result.message}</p>}
    </main>
  );
}
