import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateApiKey } from "@/lib/crypto";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  return NextResponse.json({ ok: true, keys });
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

  const { key, prefix } = generateApiKey();
  const created = await prisma.apiKey.create({
    data: {
      userId: session.uid,
      name: parsed.data.name,
      key,
      prefix,
    },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });

  // Return the full key only this one time.
  return NextResponse.json({ ok: true, apiKey: { ...created, key } });
}
