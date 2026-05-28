/**
 * Server-side client for talking to the WhatsApp worker service.
 * Never import this from client components.
 */

const WORKER_URL = process.env.WORKER_URL || "http://localhost:4000";
const WORKER_TOKEN = process.env.WORKER_INTERNAL_TOKEN || "";

interface WorkerRequestInit extends RequestInit {
  json?: unknown;
}

async function workerFetch<T>(path: string, init: WorkerRequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("x-internal-token", WORKER_TOKEN);
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(init.json);
  }

  const res = await fetch(`${WORKER_URL}${path}`, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.error || `Worker error (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export interface WorkerSessionStatus {
  sessionId: string;
  status: "DISCONNECTED" | "CONNECTING" | "QR" | "CONNECTED" | "LOGGED_OUT";
  qr?: string | null; // data URL or raw qr string
  phoneNumber?: string | null;
}

export const worker = {
  startSession(sessionId: string) {
    return workerFetch<{ ok: true }>(`/sessions/${sessionId}/start`, {
      method: "POST",
    });
  },

  status(sessionId: string) {
    return workerFetch<WorkerSessionStatus>(`/sessions/${sessionId}/status`);
  },

  logout(sessionId: string) {
    return workerFetch<{ ok: true }>(`/sessions/${sessionId}/logout`, {
      method: "POST",
    });
  },

  sendMessage(sessionId: string, phone: string, text: string) {
    return workerFetch<{ ok: true; messageId?: string }>(
      `/sessions/${sessionId}/send`,
      {
        method: "POST",
        json: { phone, text },
      }
    );
  },
};
