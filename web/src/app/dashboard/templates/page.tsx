import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import TemplatesClient from "./TemplatesClient";

export default async function TemplatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const templates = await prisma.messageTemplate.findMany({
    where: { userId: session.uid },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  const initial = templates.map((t) => ({
    id: t.id,
    name: t.name,
    body: t.body,
    isDefault: t.isDefault,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-display text-3xl font-bold text-navy-900">
          Template Pesan
        </h1>
        <p className="mt-1 text-sm text-navy-700/80">
          Buat template pesan WhatsApp dengan placeholder dinamis. Salah satu
          template bisa dijadikan default - dipakai otomatis saat parameter{" "}
          <code className="code">template</code> tidak diisi di API.
        </p>
      </div>
      <TemplatesClient initialTemplates={initial} />
    </div>
  );
}
