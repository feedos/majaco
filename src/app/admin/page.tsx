import { redirect } from "next/navigation";
import { getIsAdminAuthenticated } from "@/lib/admin-auth";
import AdminDashboard from "@/components/AdminDashboard";

export default async function AdminPage() {
  const authed = await getIsAdminAuthenticated();
  if (!authed) redirect("/admin/login");

  return <AdminDashboard />;
}
