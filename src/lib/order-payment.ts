import { prisma } from "@/lib/prisma";
import { getPaymentClient } from "@/lib/mercadopago";

/**
 * Marca una orden como pagada a partir de un pago aprobado de Mercado Pago.
 * Se usa tanto desde el webhook como desde el fallback de polling, así que
 * es idempotente: si la orden ya no está PENDING_PAYMENT no hace nada.
 */
export async function applyApprovedPayment(orderId: string, mpPaymentId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PENDING_PAYMENT") return order;

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID_PENDING_APPROVAL",
      mpPaymentId,
      paidAt: new Date(),
    },
  });
}

export async function syncOrderWithMercadoPago(orderId: string) {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) return null;

  try {
    const results = await getPaymentClient().search({
      options: { external_reference: orderId, sort: "date_approved", criteria: "desc" },
    });
    const approved = results.results?.find((p) => p.status === "approved");
    if (approved?.id) {
      return applyApprovedPayment(orderId, String(approved.id));
    }
  } catch (err) {
    console.error("No se pudo sincronizar el pago con Mercado Pago", err);
  }
  return null;
}
