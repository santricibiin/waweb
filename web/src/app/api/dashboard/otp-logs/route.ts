import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Prisma } from "@prisma/client";

const VALID_STATUS = ["PENDING", "SENT", "VERIFIED", "EXPIRED", "FAILED"] as const;
type StatusFilter = (typeof VALID_STATUS)[number];

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const phone = sp.get("phone")?.trim();
  const purpose = sp.get("purpose")?.trim();
  const apiKeyId = sp.get("apiKeyId")?.trim();
  const fromStr = sp.get("from");
  const toStr = sp.get("to");
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));

  const where: Prisma.OtpRequestWhereInput = { userId: session.uid };

  if (status && (VALID_STATUS as readonly string[]).includes(status)) {
    where.status = status as StatusFilter;
  }
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    where.phone = { contains: digits || phone };
  }
  if (purpose) where.purpose = { contains: purpose };
  if (apiKeyId) where.apiKeyId = apiKeyId;

  if (fromStr || toStr) {
    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr ? new Date(toStr) : undefined;
    if (from && !isNaN(from.getTime())) {
      where.createdAt = { ...(where.createdAt as object), gte: from };
    }
    if (to && !isNaN(to.getTime())) {
      // include the entire 'to' day
      to.setHours(23, 59, 59, 999);
      where.createdAt = { ...(where.createdAt as object), lte: to };
    }
  }

  const [total, logs, statsRaw] = await Promise.all([
    prisma.otpRequest.count({ where }),
    prisma.otpRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        phone: true,
        purpose: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        expiresAt: true,
        sentAt: true,
        verifiedAt: true,
        failedAt: true,
        errorMsg: true,
        createdAt: true,
        apiKey: { select: { name: true, prefix: true } },
        waSession: { select: { name: true, phoneNumber: true } },
      },
    }),
    prisma.otpRequest.groupBy({
      by: ["status"],
      where: { userId: session.uid },
      _count: { _all: true },
    }),
  ]);

  const stats: Record<string, number> = {
    PENDING: 0,
    SENT: 0,
    VERIFIED: 0,
    EXPIRED: 0,
    FAILED: 0,
  };
  for (const row of statsRaw) stats[row.status] = row._count._all;

  return NextResponse.json({
    ok: true,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    stats,
    logs: logs.map((l) => ({
      ...l,
      expiresAt: l.expiresAt.toISOString(),
      sentAt: l.sentAt?.toISOString() ?? null,
      verifiedAt: l.verifiedAt?.toISOString() ?? null,
      failedAt: l.failedAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
