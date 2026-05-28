import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = await prisma.apiKey.findUnique({
    where: { id: params.id },
    select: { userId: true, revokedAt: true },
  });
  if (!key || key.userId !== session.uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (key.revokedAt) {
    return NextResponse.json({ ok: true, alreadyRevoked: true });
  }

  await prisma.apiKey.update({
    where: { id: params.id },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
