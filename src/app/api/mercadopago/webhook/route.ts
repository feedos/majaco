import { NextRequest, NextResponse } from "next/server";
import { getPaymentClient } from "@/lib/mercadopago";
import { applyApprovedPayment } from "@/lib/order-payment";

// Mercado Pago llama a esta URL tanto por query params (?type=payment&data.id=...)
// como con un body JSON similar. Contemplamos ambos casos.
export async function POST(req: NextRequest) {
  let paymentId: string | null = null;

  const type = req.nextUrl.searchParams.get("type") ?? req.nextUrl.searchParams.get("topic");
  paymentId = req.nextUrl.searchParams.get("data.id") ?? req.nextUrl.searchParams.get("id");

  if (!paymentId) {
    try {
      const body = await req.json();
      if (body?.type === "payment" || body?.action?.startsWith("payment")) {
        paymentId = body?.data?.id ? String(body.data.id) : null;
      }
    } catch {
      // sin body o no es JSON, seguimos con lo que tengamos de los query params
    }
  }

  if ((type && type !== "payment") || !paymentId) {
    return NextResponse.json({ received: true });
  }

  try {
    const payment = await getPaymentClient().get({ id: paymentId });
    const orderId = payment.external_reference;
    if (orderId && payment.status === "approved") {
      await applyApprovedPayment(orderId, String(payment.id));
    }
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago", err);
    // Devolvemos 200 igual para que MP no siga reintentando indefinidamente
    // un pago que no vamos a poder resolver (p.ej. id inválido).
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
