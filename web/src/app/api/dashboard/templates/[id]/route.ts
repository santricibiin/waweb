import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  body: z.string().trim().min(1).max(1000).optional(),
  isDefault: z.boolean().optional(),
});

async function ownTemplate(userId: string, id: string) {
  const t = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!t || t.userId !== userId) return null;
  return t;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const t = await ownTemplate(session.uid, params.id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (data.body && !data.body.match(/\{code\}|\{otp\}/i)) {
    return NextResponse.json(
      { error: "Body harus mengandung placeholder {code} atau {otp}" },
      { status: 400 }
    );
  }

  if (data.isDefault === true) {
    await prisma.messageTemplate.updateMany({
      where: { userId: session.uid, isDefault: true, NOT: { id: params.id } },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.messageTemplate.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json({ ok: true, template: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const t = await ownTemplate(session.uid, params.id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.messageTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
