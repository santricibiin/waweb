import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LogsClient from "./LogsClient";

export default async function LogsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Load API keys list for the filter dropdown
  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: session.uid },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, revokedAt: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-display text-3xl font-bold text-navy-900">Log OTP</h1>
        <p className="mt-1 text-sm text-navy-700/80">
          Riwayat semua request OTP. Filter berdasarkan status, nomor, tanggal,
          atau API key.
        </p>
      </div>
      <LogsClient
        apiKeys={apiKeys.map((k) => ({
          id: k.id,
          label: `${k.name} (waotp_${k.prefix}_***)${k.revokedAt ? " - revoked" : ""}`,
        }))}
      />
    </div>
  );
}
