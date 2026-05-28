import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.messageTemplate.findMany({
    where: { userId: session.uid },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ ok: true, templates });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  body: z.string().trim().min(1).max(1000),
  isDefault: z.boolean().optional(),
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
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (!data.body.match(/\{code\}|\{otp\}/i)) {
    return NextResponse.json(
      { error: "Body harus mengandung placeholder {code} atau {otp}" },
      { status: 400 }
    );
  }

  // Kalau isDefault=true, unset default lainnya dulu
  if (data.isDefault) {
    await prisma.messageTemplate.updateMany({
      where: { userId: session.uid, isDefault: true },
      data: { isDefault: false },
    });
  }

  const created = await prisma.messageTemplate.create({
    data: {
      userId: session.uid,
      name: data.name,
      body: data.body,
      isDefault: data.isDefault ?? false,
    },
  });
  return NextResponse.json({ ok: true, template: created });
}
