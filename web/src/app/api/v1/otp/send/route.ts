import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey, jsonError, jsonOk } from "@/lib/api-auth";
import { generateOtpCode, hashSecret, normalizePhone } from "@/lib/crypto";
import { worker } from "@/lib/worker-client";

const schema = z.object({
  phone: z.string().min(6).max(20),
  purpose: z.string().trim().max(60).optional(),
  length: z.number().int().min(4).max(8).optional(),
  expiresInSeconds: z.number().int().min(30).max(60 * 30).optional(),
  template: z.string().max(500).optional(),
  sessionId: z.string().optional(),
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

  const {
    phone,
    purpose,
    length = 6,
    expiresInSeconds = 300,
    template,
    sessionId,
  } = parsed.data;

  // Pick the WA session: explicit one, else the first connected session of the user.
  const waSession = sessionId
    ? await prisma.waSession.findFirst({
        where: { id: sessionId, userId: auth.userId },
      })
    : await prisma.waSession.findFirst({
        where: { userId: auth.userId, status: "CONNECTED" },
        orderBy: { connectedAt: "desc" },
      });

  if (!waSession) {
    return jsonError(
      "No connected WhatsApp session available. Connect one in the dashboard.",
      409
    );
  }
  if (waSession.status !== "CONNECTED") {
    return jsonError(
      `WhatsApp session is not connected (status: ${waSession.status})`,
      409
    );
  }

  const normalizedPhone = normalizePhone(phone);
  const code = generateOtpCode(length);
  const hashed = await hashSecret(code);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const otp = await prisma.otpRequest.create({
    data: {
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      waSessionId: waSession.id,
      phone: normalizedPhone,
      code: "", // never store the plaintext
      hashedCode: hashed,
      purpose,
      expiresAt,
      status: "PENDING",
    },
  });

  const message =
    template?.replace(/\{code\}/gi, code).replace(/\{otp\}/gi, code) ??
    `Kode OTP Anda adalah: *${code}*\nBerlaku ${Math.round(
      expiresInSeconds / 60
    )} menit. Jangan bagikan kode ini ke siapa pun.`;

  try {
    await worker.sendMessage(waSession.id, normalizedPhone, message);
    await prisma.otpRequest.update({
      where: { id: otp.id },
      data: { status: "SENT", sentAt: new Date() },
    });
  } catch (err) {
    await prisma.otpRequest.update({
      where: { id: otp.id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMsg: (err as Error).message?.slice(0, 500),
      },
    });
    return jsonError("Failed to send WhatsApp message", 502, {
      detail: (err as Error).message,
    });
  }

  return jsonOk({
    requestId: otp.id,
    phone: normalizedPhone,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds,
  });
}
