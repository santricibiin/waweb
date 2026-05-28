import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Generate a random API key.
 * Format: waotp_<prefix>_<random>
 * - prefix: 8 url-safe chars (visible in dashboard list)
 * - random: 40 url-safe chars (the actual secret)
 */
export function generateApiKey(): { key: string; prefix: string } {
  const prefix = crypto.randomBytes(6).toString("base64url").slice(0, 8);
  const random = crypto.randomBytes(30).toString("base64url").slice(0, 40);
  const key = `waotp_${prefix}_${random}`;
  return { key, prefix };
}

/**
 * Generate a numeric OTP code of given length (default 6).
 */
export function generateOtpCode(length = 6): string {
  const max = 10 ** length;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(length, "0");
}

export async function hashSecret(value: string): Promise<string> {
  return bcrypt.hash(value, 10);
}

export async function verifyHash(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}

/**
 * Normalize phone numbers to E.164-like digits-only format.
 * Accepts inputs like "08123...", "+62 812-3...", "62812..."
 * Default country prefix is "62" (Indonesia) when input starts with 0.
 */
export function normalizePhone(input: string, defaultCountry = "62"): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = defaultCountry + digits.slice(1);
  }
  return digits;
}
