import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";

export interface ApiKeyAuthResult {
  userId: string;
  apiKeyId: string;
}

/**
 * Authenticate a request via the `x-api-key` header.
 * Returns the user/api-key info, or a NextResponse to short-circuit.
 */
export async function authenticateApiKey(
  req: NextRequest
): Promise<ApiKeyAuthResult | NextResponse> {
  const key = req.headers.get("x-api-key");
  if (!key) {
    return NextResponse.json(
      { error: "Missing x-api-key header" },
      { status: 401 }
    );
  }

  const record = await prisma.apiKey.findUnique({
    where: { key },
    select: { id: true, userId: true, revokedAt: true },
  });

  if (!record || record.revokedAt) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Update lastUsedAt async (don't block response)
  prisma.apiKey
    .update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return { userId: record.userId, apiKeyId: record.id };
}

export function jsonError(message: string, status = 400, extra?: object) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function jsonOk<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}
