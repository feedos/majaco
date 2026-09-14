import TicketStatus from "@/components/TicketStatus";

export default async function EntradaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TicketStatus token={token} />;
}
