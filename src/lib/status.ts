import type { OrderStatus } from "@prisma/client";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID_PENDING_APPROVAL: "Pagado, esperando confirmación",
  APPROVED: "Confirmada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

export function statusClass(status: OrderStatus) {
  return `status-badge status-${status.toLowerCase()}`;
}
