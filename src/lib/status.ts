import type { OrderStatus } from "@prisma/client";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Esperando transferencia",
  PAID_PENDING_APPROVAL: "Transferencia avisada, a confirmar",
  APPROVED: "Confirmada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

export function statusClass(status: OrderStatus) {
  return `status-badge status-${status.toLowerCase()}`;
}
