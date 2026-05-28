import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { worker } from "@/lib/worker-client";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.waSession.findMany({
    where: { userId: session.uid },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, sessions });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const created = await prisma.waSession.create({
    data: {
      userId: session.uid,
      name: parsed.data.name,
      status: "DISCONNECTED",
    },
  });

  // Kick off worker connection (non-fatal if it fails)
  try {
    await worker.startSession(created.id);
    await prisma.waSession.update({
      where: { id: created.id },
      data: { status: "CONNECTING" },
    });
  } catch (err) {
    // worker may be offline; user can retry via /connect
  }

  return NextResponse.json({ ok: true, session: created });
}
