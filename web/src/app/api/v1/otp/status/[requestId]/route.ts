import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey, jsonError, jsonOk } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const auth = await authenticateApiKey(req);
  if ("status" in auth) return auth;

  const otp = await prisma.otpRequest.findFirst({
    where: { id: params.requestId, userId: auth.userId },
    select: {
      id: true,
      phone: true,
      status: true,
      purpose: true,
      attempts: true,
      maxAttempts: true,
      expiresAt: true,
      sentAt: true,
      verifiedAt: true,
      failedAt: true,
      createdAt: true,
    },
  });

  if (!otp) return jsonError("Not found", 404);

  return jsonOk({
    request: {
      ...otp,
      expiresAt: otp.expiresAt.toISOString(),
      sentAt: otp.sentAt?.toISOString() ?? null,
      verifiedAt: otp.verifiedAt?.toISOString() ?? null,
      failedAt: otp.failedAt?.toISOString() ?? null,
      createdAt: otp.createdAt.toISOString(),
    },
  });
}
