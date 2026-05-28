"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export default function ApiKeysClient({ initialKeys }: { initialKeys: ApiKey[] }) {
  const toast = useToast();
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ id: string; key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat key");
      setRevealed({ id: data.apiKey.id, key: data.apiKey.key, name: data.apiKey.name });
      setKeys((prev) => [
        {
          id: data.apiKey.id,
          name: data.apiKey.name,
          prefix: data.apiKey.prefix,
          lastUsedAt: null,
          revokedAt: null,
          createdAt: data.apiKey.createdAt,
        },
        ...prev,
      ]);
      setName("");
      toast.success("API key dibuat", "Salin sekarang sebelum hilang!");
    } catch (err) {
      toast.error("Gagal membuat key", (err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function doRevoke() {
    if (!revoking) return;
    const id = revoking.id;
    const res = await fetch(`/api/dashboard/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k))
      );
      toast.success("Key dicabut", `${revoking.name} tidak bisa dipakai lagi.`);
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error("Gagal cabut", data.error || "Coba lagi.");
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Tersalin ke clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin", "Salin manual dari kolom di atas.");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createKey} className="card flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="label">Nama key</label>
          <input
            className="input"
            placeholder="Misal: Production, Staging, App XYZ"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
        </div>
        <button type="submit" disabled={creating} className="btn-primary py-2.5">
          {creating ? "Membuat..." : "Buat key"}
        </button>
      </form>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-[11px] font-semibold uppercase tracking-wider text-navy-700">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Prefix</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Dibuat</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-navy-700/60">
                  Belum ada API key.
                </td>
              </tr>
            )}
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-navy-100 hover:bg-navy-50/50">
                <td className="px-4 py-3 font-medium text-navy-900">{k.name}</td>
                <td className="px-4 py-3">
                  <code className="code">waotp_{k.prefix}_***</code>
                </td>
                <td className="px-4 py-3">
                  {k.revokedAt ? (
                    <span className="pill pill-danger">Dicabut</span>
                  ) : (
                    <span className="pill pill-success">Aktif</span>
                  )}
                </td>
                <td className="px-4 py-3 text-navy-700/80">
                  {new Date(k.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {!k.revokedAt && (
                    <button onClick={() => setRevoking(k)} className="btn-danger">
                      Cabut
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: API key reveal */}
      <Modal
        open={!!revealed}
        onClose={() => setRevealed(null)}
        size="lg"
        variant="warn"
        title="API key dibuat"
        description="Ini satu-satunya kesempatan untuk menyalin key ini. Setelah ditutup, key tidak akan ditampilkan lagi."
        footer={
          <>
            <button onClick={() => copy(revealed?.key ?? "")} className="btn-gold">
              {copied ? "Tersalin" : "Salin key"}
            </button>
            <button onClick={() => setRevealed(null)} className="btn-primary">
              Sudah disimpan, tutup
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-navy-700">
              Nama key
            </div>
            <div className="text-sm text-navy-900">{revealed?.name}</div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-navy-700">
              Key (gunakan di header <code className="code">x-api-key</code>)
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-gold-300 bg-cream-50 px-3 py-3 shadow-soft">
              <code className="flex-1 break-all font-mono text-xs text-navy-900">
                {revealed?.key}
              </code>
              <button
                onClick={() => copy(revealed?.key ?? "")}
                className="btn-ghost flex-shrink-0 text-xs"
              >
                {copied ? "OK" : "Salin"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <strong>Tips keamanan:</strong> Simpan di environment variable aplikasi
            (mis. <code className="code">.env</code>). Jangan hardcode di source
            code yang di-commit ke git.
          </div>
        </div>
      </Modal>

      {/* Confirm dialog: revoke */}
      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={doRevoke}
        variant="danger"
        title={`Cabut "${revoking?.name}"?`}
        description="Aplikasi yang masih pakai key ini akan langsung tidak bisa kirim OTP. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, cabut sekarang"
        cancelLabel="Batal"
      />
    </div>
  );
}
