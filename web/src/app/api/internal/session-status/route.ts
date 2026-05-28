import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Internal callback from the WhatsApp worker.
 * Authenticated via shared internal token, NOT the user session.
 */
const schema = z.object({
  sessionId: z.string().min(1),
  status: z.enum(["DISCONNECTED", "CONNECTING", "QR", "CONNECTED", "LOGGED_OUT"]),
  phoneNumber: z.string().optional().nullable(),
  qrIssuedAt: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-internal-token");
  if (!token || token !== process.env.WORKER_INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const { sessionId, status, phoneNumber, qrIssuedAt } = parsed.data;
  const existing = await prisma.waSession.findUnique({ where: { id: sessionId } });
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.waSession.update({
    where: { id: sessionId },
    data: {
      status,
      phoneNumber: phoneNumber ?? existing.phoneNumber,
      lastQrAt: qrIssuedAt ? new Date(qrIssuedAt) : existing.lastQrAt,
      connectedAt: status === "CONNECTED" ? new Date() : existing.connectedAt,
    },
  });

  return NextResponse.json({ ok: true });
}
