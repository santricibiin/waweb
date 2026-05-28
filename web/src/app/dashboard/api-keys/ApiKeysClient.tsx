"use client";

import { useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export default function ApiKeysClient({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ id: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat key");
      setRevealed({ id: data.apiKey.id, key: data.apiKey.key });
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Cabut API key ini? Tindakan ini tidak bisa dibatalkan.")) return;
    const res = await fetch(`/api/dashboard/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k))
      );
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {revealed && (
        <div className="rounded-xl border-2 border-gold-300 bg-gold-50/60 p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold text-gold-800">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 2 1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z" />
            </svg>
            Salin key Anda sekarang. Key tidak akan ditampilkan lagi.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="flex-1 break-all rounded-md border border-gold-200 bg-white px-3 py-2.5 font-mono text-xs text-navy-900">
              {revealed.key}
            </code>
            <button onClick={() => copy(revealed.key)} className="btn-gold">
              {copied ? "Tersalin" : "Salin"}
            </button>
            <button onClick={() => setRevealed(null)} className="btn-ghost">
              Tutup
            </button>
          </div>
        </div>
      )}

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
                    <button onClick={() => revokeKey(k.id)} className="btn-danger">
                      Cabut
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
