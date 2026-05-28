import { headers } from "next/headers";

/**
 * Resolve the public base URL of this app at runtime.
 *
 * Priority:
 *  1. NEXT_PUBLIC_APP_URL env (explicit override)
 *  2. x-forwarded-* + host headers (auto-detected behind proxy / on VPS)
 *  3. http://localhost:3001 fallback
 */
export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");

  try {
    const h = headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ||
        (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // headers() throws outside request scope (e.g. during build) - fall through
  }

  return "http://localhost:3001";
}
