import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ApiKeysClient from "./ApiKeysClient";

export default async function ApiKeysPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.uid },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  // Serialize Date -> string so client component can use directly
  const initialKeys = keys.map((k) => ({
    ...k,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    revokedAt: k.revokedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-display text-3xl font-bold text-navy-900">API Keys</h1>
        <p className="mt-1 text-sm text-navy-700/80">
          Gunakan key di header <code className="code">x-api-key</code> saat memanggil API.
        </p>
      </div>
      <ApiKeysClient initialKeys={initialKeys} />
    </div>
  );
}
