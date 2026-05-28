import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import WaSessionsClient from "./WaSessionsClient";

export default async function WaSessionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const sessions = await prisma.waSession.findMany({
    where: { userId: session.uid },
    orderBy: { createdAt: "desc" },
  });

  const initial = sessions.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    phoneNumber: s.phoneNumber,
    connectedAt: s.connectedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-display text-3xl font-bold text-navy-900">Sesi WhatsApp</h1>
        <p className="mt-1 text-sm text-navy-700/80">
          Tambahkan sesi, lalu scan QR untuk menghubungkan nomor pengirim OTP.
        </p>
      </div>
      <WaSessionsClient initialSessions={initial} />
    </div>
  );
}
