import { NextResponse } from "next/server";
import { getIsAdminAuthenticated } from "@/lib/admin-auth";

export async function requireAdmin() {
  const ok = await getIsAdminAuthenticated();
  if (!ok) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}
