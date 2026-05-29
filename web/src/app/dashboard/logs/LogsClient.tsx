"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";

type Status = "PENDING" | "SENT" | "VERIFIED" | "EXPIRED" | "FAILED";

interface ApiKeyOption {
  id: string;
  label: string;
}

interface LogRow {
  id: string;
  phone: string;
  purpose: string | null;
  status: Status;
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  sentAt: string | null;
  verifiedAt: string | null;
  failedAt: string | null;
  errorMsg: string | null;
  createdAt: string;
  apiKey: { name: string; prefix: string } | null;
  waSession: { name: string; phoneNumber: string | null } | null;
}

interface LogsResponse {
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  stats: Record<Status, number>;
  logs: LogRow[];
}

const STATUS_OPTIONS: { value: "" | Status; label: string }[] = [
  { value: "", label: "Semua status" },
  { value: "SENT", label: "SENT" },
  { value: "VERIFIED", label: "VERIFIED" },
  { value: "EXPIRED", label: "EXPIRED" },
  { value: "FAILED", label: "FAILED" },
  { value: "PENDING", label: "PENDING" },
];

export default function LogsClient({ apiKeys }: { apiKeys: ApiKeyOption[] }) {
  const [filters, setFilters] = useState({
    status: "" as "" | Status,
    phone: "",
    purpose: "",
    apiKeyId: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<LogRow | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (filters.status) sp.set("status", filters.status);
      if (filters.phone) sp.set("phone", filters.phone);
      if (filters.purpose) sp.set("purpose", filters.purpose);
      if (filters.apiKeyId) sp.set("apiKeyId", filters.apiKeyId);
      if (filters.from) sp.set("from", filters.from);
      if (filters.to) sp.set("to", filters.to);
      sp.set("page", String(page));

      const res = await fetch(`/api/dashboard/otp-logs?${sp.toString()}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  }

  function reset() {
    setFilters({
      status: "",
      phone: "",
      purpose: "",
      apiKeyId: "",
      from: "",
      to: "",
    });
    setPage(1);
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Sent" value={stats.SENT} pill="pill-info" />
          <StatCard label="Verified" value={stats.VERIFIED} pill="pill-success" />
          <StatCard label="Expired" value={stats.EXPIRED} pill="pill-warn" />
          <StatCard label="Failed" value={stats.FAILED} pill="pill-danger" />
          <StatCard label="Pending" value={stats.PENDING} pill="pill-mute" />
        </div>
      )}

      {/* FILTERS */}
      <form onSubmit={applyFilter} className="card space-y-3">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value as "" | Status })
              }
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nomor (phone)</label>
            <input
              className="input"
              value={filters.phone}
              onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
              placeholder="08123 atau 6281..."
            />
          </div>
          <div>
            <label className="label">Purpose</label>
            <input
              className="input"
              value={filters.purpose}
              onChange={(e) => setFilters({ ...filters, purpose: e.target.value })}
              placeholder="login, register, ..."
            />
          </div>
          <div>
            <label className="label">API Key</label>
            <select
              className="input"
              value={filters.apiKeyId}
              onChange={(e) => setFilters({ ...filters, apiKeyId: e.target.value })}
            >
              <option value="">Semua</option>
              {apiKeys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Dari tanggal</label>
            <input
              type="date"
              className="input"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Sampai tanggal</label>
            <input
              type="date"
              className="input"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-primary">
            {loading ? "Memuat..." : "Terapkan filter"}
          </button>
          <button type="button" onClick={reset} className="btn-ghost">
            Reset
          </button>
          {data && (
            <span className="ml-auto text-sm text-navy-700/70">
              {data.total} record &middot; halaman {data.page} dari{" "}
              {data.totalPages}
            </span>
          )}
        </div>
      </form>

      {/* TABLE */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
            <thead className="bg-navy-50 text-left text-[11px] font-semibold uppercase tracking-wider text-navy-700">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">API Key</th>
                <th className="px-4 py-3">Sesi WA</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {!data ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-navy-700/60">
                    Memuat...
                  </td>
                </tr>
              ) : data.logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-navy-700/60">
                    Tidak ada log yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                data.logs.map((l) => (
                  <tr
                    key={l.id}
                    className="border-t border-navy-100 hover:bg-navy-50/50"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-navy-700">
                      {new Date(l.createdAt).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-navy-900">
                      {l.phone}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={l.status} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-navy-700">
                      {l.purpose || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-navy-700">
                      {l.apiKey?.name || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-navy-700">
                      {l.waSession?.name || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setDetail(l)}
                        className="btn-ghost text-xs"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-navy-100 px-4 py-3 text-sm">
            <span className="text-navy-700/70">
              Halaman {data.page} dari {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="btn-ghost text-xs disabled:opacity-40"
              >
                &larr; Sebelumnya
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(data.totalPages, p + 1))
                }
                disabled={data.page >= data.totalPages}
                className="btn-ghost text-xs disabled:opacity-40"
              >
                Selanjutnya &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        size="lg"
        title="Detail OTP Request"
        description={detail?.id}
        variant={
          detail?.status === "VERIFIED"
            ? "success"
            : detail?.status === "FAILED" || detail?.status === "EXPIRED"
            ? "danger"
            : "default"
        }
        footer={
          <button onClick={() => setDetail(null)} className="btn-primary">
            Tutup
          </button>
        }
      >
        {detail && (
          <dl className="grid gap-x-6 gap-y-3 md:grid-cols-2">
            <Field label="Status">
              <StatusPill status={detail.status} />
            </Field>
            <Field label="Phone" mono>
              {detail.phone}
            </Field>
            <Field label="Purpose">{detail.purpose || "-"}</Field>
            <Field label="Attempts">
              {detail.attempts} / {detail.maxAttempts}
            </Field>
            <Field label="API Key">{detail.apiKey?.name || "-"}</Field>
            <Field label="Sesi WA">{detail.waSession?.name || "-"}</Field>
            <Field label="Dibuat">
              {new Date(detail.createdAt).toLocaleString("id-ID")}
            </Field>
            <Field label="Kedaluwarsa">
              {new Date(detail.expiresAt).toLocaleString("id-ID")}
            </Field>
            <Field label="Sent at">
              {detail.sentAt
                ? new Date(detail.sentAt).toLocaleString("id-ID")
                : "-"}
            </Field>
            <Field label="Verified at">
              {detail.verifiedAt
                ? new Date(detail.verifiedAt).toLocaleString("id-ID")
                : "-"}
            </Field>
            {detail.failedAt && (
              <Field label="Failed at">
                {new Date(detail.failedAt).toLocaleString("id-ID")}
              </Field>
            )}
            {detail.errorMsg && (
              <div className="md:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wider text-navy-700/60">
                  Error
                </dt>
                <dd className="mt-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {detail.errorMsg}
                </dd>
              </div>
            )}
            <div className="md:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-navy-700/60">
                Request ID
              </dt>
              <dd className="mt-1 break-all rounded-md bg-navy-50 px-3 py-2 font-mono text-xs text-navy-800">
                {detail.id}
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}

function Field({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-navy-700/60">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-navy-900 ${mono ? "font-mono text-xs" : ""}`}
      >
        {children}
      </dd>
    </div>
  );
}

function StatCard({
  label,
  value,
  pill,
}: {
  label: string;
  value: number;
  pill: string;
}) {
  return (
    <div className="card p-4">
      <span className={`pill ${pill}`}>{label}</span>
      <div className="mt-2 font-display text-2xl font-bold text-navy-900">
        {value}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    SENT: "pill pill-info",
    VERIFIED: "pill pill-success",
    EXPIRED: "pill pill-warn",
    FAILED: "pill pill-danger",
    PENDING: "pill pill-mute",
  };
  return <span className={`${map[status]} font-mono`}>{status}</span>;
}
