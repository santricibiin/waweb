"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

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
  sessionName: string;
  qr: string | null;
  status: Status;
}

export default function WaSessionsClient({
  initialSessions,
}: {
  initialSessions: WaSession[];
}) {
  const toast = useToast();
  const [sessions, setSessions] = useState(initialSessions);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [qrInfo, setQrInfo] = useState<QrInfo | null>(null);
  const [removing, setRemoving] = useState<WaSession | null>(null);
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
      const newStatus = (w?.status ?? data.session.status) as Status;
      setQrInfo((prev) =>
        prev && prev.sessionId === id
          ? { ...prev, qr: w?.qr ?? null, status: newStatus }
          : prev
      );
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: newStatus,
                phoneNumber: data.session.phoneNumber ?? s.phoneNumber,
                connectedAt: data.session.connectedAt ?? s.connectedAt,
              }
            : s
        )
      );
      if (newStatus === "CONNECTED") {
        stopPolling();
        toast.success("WhatsApp terhubung", "Sesi siap mengirim OTP.");
      }
    } catch {
      // ignore
    }
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
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
      setQrInfo({ sessionId: s.id, sessionName: s.name, qr: null, status: "CONNECTING" });
      startPolling(s.id);
    } catch (err) {
      toast.error("Gagal", (err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function reconnect(s: WaSession) {
    setQrInfo({ sessionId: s.id, sessionName: s.name, qr: null, status: "CONNECTING" });
    try {
      const res = await fetch(`/api/dashboard/wa-sessions/${s.id}/connect`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal terhubung");
      }
      startPolling(s.id);
    } catch (err) {
      toast.error("Gagal", (err as Error).message);
      setQrInfo(null);
    }
  }

  async function doRemove() {
    if (!removing) return;
    const id = removing.id;
    const res = await fetch(`/api/dashboard/wa-sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSessions((prev) => prev.filter((x) => x.id !== id));
      if (qrInfo?.sessionId === id) setQrInfo(null);
      toast.success("Sesi dihapus");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error("Gagal hapus", data.error || "Coba lagi.");
    }
  }

  function closeQr() {
    stopPolling();
    setQrInfo(null);
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
                  <button onClick={() => reconnect(s)} className="btn-outline">
                    Hubungkan / QR
                  </button>
                  <button onClick={() => setRemoving(s)} className="btn-danger">
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: QR Code */}
      <Modal
        open={!!qrInfo}
        onClose={closeQr}
        size="lg"
        title={`Hubungkan ${qrInfo?.sessionName ?? ""}`}
        description={
          qrInfo?.status === "CONNECTED"
            ? "Sesi berhasil terhubung."
            : "Scan QR code di bawah dengan WhatsApp di HP Anda."
        }
        variant={qrInfo?.status === "CONNECTED" ? "success" : "default"}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-navy-700/60">
              Status
            </span>
            <StatusBadge status={qrInfo?.status ?? "CONNECTING"} />
          </div>

          {qrInfo?.status === "QR" && qrInfo.qr ? (
            <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
              <div className="rounded-xl border-2 border-gold-300 bg-white p-3 shadow-soft">
                {qrInfo.qr.startsWith("data:image") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrInfo.qr} alt="QR Code" className="h-56 w-56" />
                ) : (
                  <pre className="codeblock max-w-full break-all">{qrInfo.qr}</pre>
                )}
              </div>
              <div className="space-y-3 text-sm text-navy-800">
                <div className="font-semibold text-navy-900">Cara scan:</div>
                <ol className="list-inside list-decimal space-y-1.5 leading-relaxed">
                  <li>Buka WhatsApp di HP</li>
                  <li>
                    <strong>Settings &rarr; Linked Devices</strong>
                  </li>
                  <li>Tap <strong>Link a Device</strong></li>
                  <li>Arahkan kamera ke QR di samping</li>
                </ol>
                <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">
                  QR refresh otomatis setiap beberapa detik. Begitu HP terhubung,
                  status akan jadi <strong>CONNECTED</strong>.
                </p>
              </div>
            </div>
          ) : qrInfo?.status === "CONNECTED" ? (
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-4 text-emerald-900">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 flex-shrink-0 text-emerald-600"
                fill="currentColor"
              >
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 14.5L6.5 12l1.4-1.4 3.1 3 6.6-6.6 1.4 1.4z" />
              </svg>
              <div>
                <div className="font-semibold">Berhasil terhubung</div>
                <div className="text-sm opacity-85">
                  Sesi siap dipakai untuk kirim OTP.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg bg-navy-50 px-4 py-6 text-sm text-navy-800">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-gold-400" />
              Menyiapkan QR... biasanya butuh 2-5 detik.
            </div>
          )}
        </div>
      </Modal>

      {/* Confirm dialog: hapus sesi */}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={doRemove}
        variant="danger"
        title={`Hapus sesi "${removing?.name}"?`}
        description="Sesi WhatsApp akan logout. Untuk pakai lagi, perlu scan QR ulang."
        confirmLabel="Ya, hapus"
        cancelLabel="Batal"
      />
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
