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
  template: z.string().max(1000).optional(),
  templateId: z.string().optional(),
  sessionId: z.string().optional(),
  variables: z.record(z.string()).optional(),
});

/**
 * Render a template body by substituting placeholders.
 *
 * Supported placeholders (case-insensitive):
 *   {code}, {otp}                  -> the OTP code
 *   {minutes}                      -> integer minutes of validity
 *   {seconds}                      -> seconds of validity
 *   {phone}                        -> recipient phone (normalized)
 *   {purpose}                      -> purpose string (or empty)
 *   {var:NAME}                     -> custom variable from `variables`
 */
function renderTemplate(
  body: string,
  ctx: {
    code: string;
    expiresInSeconds: number;
    phone: string;
    purpose: string;
    variables: Record<string, string>;
  }
): string {
  return body
    .replace(/\{code\}/gi, ctx.code)
    .replace(/\{otp\}/gi, ctx.code)
    .replace(/\{minutes\}/gi, Math.round(ctx.expiresInSeconds / 60).toString())
    .replace(/\{seconds\}/gi, ctx.expiresInSeconds.toString())
    .replace(/\{phone\}/gi, ctx.phone)
    .replace(/\{purpose\}/gi, ctx.purpose)
    .replace(/\{var:([a-zA-Z0-9_]+)\}/gi, (_, key) => ctx.variables[key] ?? "");
}

const FALLBACK_TEMPLATE =
  "Kode OTP Anda adalah: *{code}*\nBerlaku {minutes} menit. Jangan bagikan kode ini ke siapa pun.";

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
    templateId,
    sessionId,
    variables = {},
  } = parsed.data;

  // Pilih sesi WA
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

  // Pilih template body:
  //   1. inline `template` di body request (highest priority)
  //   2. `templateId` -> ambil dari DB
  //   3. user's default template kalau ada
  //   4. FALLBACK_TEMPLATE
  let templateBody = template;
  if (!templateBody && templateId) {
    const t = await prisma.messageTemplate.findFirst({
      where: { id: templateId, userId: auth.userId },
    });
    if (!t) return jsonError("Template not found", 404);
    templateBody = t.body;
  }
  if (!templateBody) {
    const def = await prisma.messageTemplate.findFirst({
      where: { userId: auth.userId, isDefault: true },
    });
    if (def) templateBody = def.body;
  }
  if (!templateBody) templateBody = FALLBACK_TEMPLATE;

  if (!templateBody.match(/\{code\}|\{otp\}/i)) {
    return jsonError("Template body must contain {code} or {otp} placeholder", 400);
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
      code: "",
      hashedCode: hashed,
      purpose,
      expiresAt,
      status: "PENDING",
    },
  });

  const message = renderTemplate(templateBody, {
    code,
    expiresInSeconds,
    phone: normalizedPhone,
    purpose: purpose ?? "",
    variables,
  });

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
