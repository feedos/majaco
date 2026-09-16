import { redirect } from "next/navigation";
import { getIsAdminAuthenticated } from "@/lib/admin-auth";
import CheckinScanner from "@/components/CheckinScanner";

export default async function EscanearPage() {
  const authed = await getIsAdminAuthenticated();
  if (!authed) redirect("/admin/login");

  return <CheckinScanner />;
}
