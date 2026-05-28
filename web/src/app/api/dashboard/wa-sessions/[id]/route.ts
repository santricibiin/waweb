import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { worker } from "@/lib/worker-client";

async function ownSession(userId: string, id: string) {
  const s = await prisma.waSession.findUnique({ where: { id } });
  if (!s || s.userId !== userId) return null;
  return s;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const s = await ownSession(session.uid, params.id);
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let workerStatus: any = null;
  try {
    workerStatus = await worker.status(s.id);
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true, session: s, worker: workerStatus });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const s = await ownSession(session.uid, params.id);
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await worker.logout(s.id);
  } catch {
    // ignore worker errors so deletion still succeeds
  }
  await prisma.waSession.delete({ where: { id: s.id } });
  return NextResponse.json({ ok: true });
}
