import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { worker } from "@/lib/worker-client";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const s = await prisma.waSession.findUnique({ where: { id: params.id } });
  if (!s || s.userId !== session.uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await worker.startSession(s.id);
    await prisma.waSession.update({
      where: { id: s.id },
      data: { status: "CONNECTING" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to start session" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
