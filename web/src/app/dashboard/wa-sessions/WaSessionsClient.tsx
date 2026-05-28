"use client";

import { useEffect, useRef, useState } from "react";

type Status = "DISCONNECTED" | "CONNECTING" | "QR" | "CONNECTED" | "LOGGED_OUT";

interface WaSession {
  id: string;
  name: string;
  status: Status;
  phoneNumber: string | null;
  connectedAt: string | null;
  createdAt: string;
}

interface QrInfo {
  sessionId: string;
  qr: string | null;
  status: Status;
}

export default function WaSessionsClient({
  initialSessions,
}: {
  initialSessions: WaSession[];
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrInfo, setQrInfo] = useState<QrInfo | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startPolling(id: string) {
    stopPolling();
    pollRef.current = setInterval(() => pollStatus(id), 2000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  async function pollStatus(id: string) {
    try {
      const res = await fetch(`/api/dashboard/wa-sessions/${id}`);
      const data = await res.json();
      if (!res.ok) return;
      const w = data.worker;
      setQrInfo({
        sessionId: id,
        qr: w?.qr ?? null,
        status: (w?.status ?? data.session.status) as Status,
      });
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: (data.session.status ?? s.status) as Status,
                phoneNumber: data.session.phoneNumber ?? s.phoneNumber,
                connectedAt: data.session.connectedAt ?? s.connectedAt,
              }
            : s
        )
      );
      if ((w?.status ?? data.session.status) === "CONNECTED") {
        stopPolling();
      }
    } catch {
      // ignore
    }
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/wa-sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat sesi");
      const s = data.session;
      setSessions((prev) => [
        {
          id: s.id,
          name: s.name,
          status: s.status,
          phoneNumber: s.phoneNumber,
          connectedAt: null,
          createdAt: s.createdAt,
        },
        ...prev,
      ]);
      setName("");
      setQrInfo({ sessionId: s.id, qr: null, status: "CONNECTING" });
      startPolling(s.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function reconnect(id: string) {
    setError(null);
    setQrInfo({ sessionId: id, qr: null, status: "CONNECTING" });
    try {
      const res = await fetch(`/api/dashboard/wa-sessions/${id}/connect`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal terhubung");
      }
      startPolling(id);
    } catch (err) {
      setError((err as Error).message);
      setQrInfo(null);
    }
  }

  async function removeSession(id: string) {
    if (!confirm("Hapus sesi ini? Anda perlu scan ulang jika ingin pakai lagi.")) return;
    const res = await fetch(`/api/dashboard/wa-sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (qrInfo?.sessionId === id) setQrInfo(null);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={createSession}
        className="card flex flex-col gap-3 md:flex-row md:items-end"
      >
        <div className="flex-1">
          <label className="label">Nama sesi</label>
          <input
            className="input"
            placeholder="Misal: WA Marketing"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
        </div>
        <button type="submit" disabled={creating} className="btn-primary py-2.5">
          {creating ? "Membuat..." : "Tambah sesi"}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {qrInfo && (
        <div className="card-dark relative overflow-hidden">
          <div className="absolute inset-0 panel-batik-dark opacity-25 pointer-events-none" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="h-display text-lg font-semibold text-cream-50">
                Hubungkan WhatsApp
              </h3>
              <span className="pill pill-info">{qrInfo.status}</span>
            </div>
            {qrInfo.status === "QR" && qrInfo.qr ? (
              <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
                <div className="rounded-lg bg-white p-3 shadow-soft">
                  {qrInfo.qr.startsWith("data:image") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrInfo.qr} alt="QR Code" className="h-64 w-64" />
                  ) : (
                    <pre className="codeblock max-w-full break-all">{qrInfo.qr}</pre>
                  )}
                </div>
                <div className="space-y-3 text-sm text-cream-100/90">
                  <div className="font-semibold text-gold-300">Cara scan:</div>
                  <ol className="list-inside list-decimal space-y-1.5 leading-relaxed">
                    <li>Buka WhatsApp di HP Anda</li>
                    <li>Settings &rarr; Linked Devices</li>
                    <li>Tap &quot;Link a Device&quot;</li>
                    <li>Arahkan kamera ke QR di samping</li>
                  </ol>
                  <p className="text-xs text-cream-100/60">
                    QR akan refresh otomatis. Status akan berubah ke{" "}
                    <span className="font-semibold text-emerald-300">CONNECTED</span> jika berhasil.
                  </p>
                </div>
              </div>
            ) : qrInfo.status === "CONNECTED" ? (
              <div className="rounded-lg bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
                ✓ Berhasil terhubung. Sesi siap mengirim OTP.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-cream-100/70">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold-300" />
                Menyiapkan QR...
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-[11px] font-semibold uppercase tracking-wider text-navy-700">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Nomor</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-navy-700/60">
                  Belum ada sesi WhatsApp.
                </td>
              </tr>
            )}
            {sessions.map((s) => (
              <tr key={s.id} className="border-t border-navy-100 hover:bg-navy-50/50">
                <td className="px-4 py-3 font-medium text-navy-900">{s.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-navy-700">
                  {s.phoneNumber || "-"}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => reconnect(s.id)} className="btn-outline">
                    Hubungkan / QR
                  </button>
                  <button onClick={() => removeSession(s.id)} className="btn-danger">
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    CONNECTED: "pill pill-success",
    CONNECTING: "pill pill-warn",
    QR: "pill pill-info",
    DISCONNECTED: "pill pill-mute",
    LOGGED_OUT: "pill pill-danger",
  };
  return <span className={map[status]}>{status}</span>;
}
