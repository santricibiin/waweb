import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey, jsonError, jsonOk } from "@/lib/api-auth";
import { verifyHash, normalizePhone } from "@/lib/crypto";

const schema = z.object({
  requestId: z.string().min(1).optional(),
  phone: z.string().min(6).max(20).optional(),
  code: z.string().min(4).max(10),
});

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if ("status" in auth) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, { issues: parsed.error.flatten() });
  }

  const { requestId, phone, code } = parsed.data;
  if (!requestId && !phone) {
    return jsonError("Either requestId or phone is required");
  }

  // Find the most recent active OTP for this user/request/phone
  const otp = await prisma.otpRequest.findFirst({
    where: {
      userId: auth.userId,
      ...(requestId ? { id: requestId } : {}),
      ...(phone ? { phone: normalizePhone(phone) } : {}),
      status: "SENT",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return jsonError("No active OTP found for this request", 404);
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    await prisma.otpRequest.update({
      where: { id: otp.id },
      data: { status: "EXPIRED" },
    });
    return jsonError("OTP expired", 410);
  }

  if (otp.attempts + 1 > otp.maxAttempts) {
    await prisma.otpRequest.update({
      where: { id: otp.id },
      data: { status: "FAILED", failedAt: new Date(), errorMsg: "Max attempts exceeded" },
    });
    return jsonError("Maximum verification attempts exceeded", 429);
  }

  const matches = await verifyHash(code, otp.hashedCode);

  if (!matches) {
    await prisma.otpRequest.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return jsonError("Invalid OTP code", 400, {
      attemptsRemaining: otp.maxAttempts - (otp.attempts + 1),
    });
  }

  await prisma.otpRequest.update({
    where: { id: otp.id },
    data: { status: "VERIFIED", verifiedAt: new Date() },
  });

  return jsonOk({
    verified: true,
    requestId: otp.id,
    phone: otp.phone,
    verifiedAt: new Date().toISOString(),
  });
}
