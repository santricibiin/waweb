"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

interface Template {
  id: string;
  name: string;
  body: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_BODY =
  "Kode OTP Anda adalah: *{code}*\nBerlaku {minutes} menit. Jangan bagikan kode ini ke siapa pun.";

const PLACEHOLDERS: { tag: string; desc: string }[] = [
  { tag: "{code}", desc: "Kode OTP yang di-generate" },
  { tag: "{otp}", desc: "Alias dari {code}" },
  { tag: "{minutes}", desc: "Menit masa berlaku" },
  { tag: "{seconds}", desc: "Detik masa berlaku" },
  { tag: "{phone}", desc: "Nomor tujuan (sudah dinormalisasi)" },
  { tag: "{purpose}", desc: "Label tujuan dari API call" },
  { tag: "{var:NAMA}", desc: "Variabel custom dari field 'variables'" },
];

export default function TemplatesClient({
  initialTemplates,
}: {
  initialTemplates: Template[];
}) {
  const toast = useToast();
  const [templates, setTemplates] = useState(initialTemplates);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState<Template | null>(null);

  const [form, setForm] = useState({
    name: "",
    body: DEFAULT_BODY,
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setEditing(null);
    setForm({ name: "", body: DEFAULT_BODY, isDefault: false });
  }

  function startEdit(t: Template) {
    setEditing(t);
    setForm({ name: t.name, body: t.body, isDefault: t.isDefault });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function insertPlaceholder(tag: string) {
    const ta = document.getElementById("tpl-body") as HTMLTextAreaElement | null;
    if (!ta) {
      setForm((f) => ({ ...f, body: f.body + tag }));
      return;
    }
    const start = ta.selectionStart ?? form.body.length;
    const end = ta.selectionEnd ?? form.body.length;
    const next = form.body.slice(0, start) + tag + form.body.slice(end);
    setForm((f) => ({ ...f, body: next }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + tag.length;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/dashboard/templates/${editing.id}`
        : "/api/dashboard/templates";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      const t: Template = data.template;

      setTemplates((prev) => {
        let next = editing
          ? prev.map((x) => (x.id === t.id ? t : x))
          : [t, ...prev];
        if (t.isDefault) {
          next = next.map((x) => (x.id === t.id ? x : { ...x, isDefault: false }));
        }
        return next;
      });
      setEditing(null);
      setForm({ name: "", body: DEFAULT_BODY, isDefault: false });
      toast.success(editing ? "Template diperbarui" : "Template dibuat", t.name);
    } catch (err) {
      toast.error("Gagal", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(id: string, name: string) {
    try {
      const res = await fetch(`/api/dashboard/templates/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal");
      }
      setTemplates((prev) =>
        prev.map((x) => ({ ...x, isDefault: x.id === id }))
      );
      toast.success("Template default diubah", name);
    } catch (err) {
      toast.error("Gagal", (err as Error).message);
    }
  }

  async function doDelete() {
    if (!deleting) return;
    const id = deleting.id;
    const res = await fetch(`/api/dashboard/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((x) => x.id !== id));
      if (editing?.id === id) {
        setEditing(null);
        setForm({ name: "", body: DEFAULT_BODY, isDefault: false });
      }
      toast.success("Template dihapus", deleting.name);
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error("Gagal hapus", data.error || "Coba lagi.");
    }
  }

  // Live preview
  const preview = form.body
    .replace(/\{code\}/gi, "123456")
    .replace(/\{otp\}/gi, "123456")
    .replace(/\{minutes\}/gi, "5")
    .replace(/\{seconds\}/gi, "300")
    .replace(/\{phone\}/gi, "628123456789")
    .replace(/\{purpose\}/gi, "login")
    .replace(/\{var:([a-zA-Z0-9_]+)\}/gi, (_, k) => `[${k}]`);

  return (
    <div className="space-y-8">
      {/* FORM */}
      <form onSubmit={save} className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="h-display text-lg font-semibold text-navy-900">
            {editing ? `Edit: ${editing.name}` : "Buat template baru"}
          </h2>
          {editing && (
            <button
              type="button"
              onClick={startCreate}
              className="btn-ghost text-xs"
            >
              Batal edit
            </button>
          )}
        </div>

        <div>
          <label className="label">Nama template</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Misal: OTP Login, OTP Registrasi"
            maxLength={60}
            required
          />
        </div>

        <div>
          <label className="label">Isi pesan</label>
          <textarea
            id="tpl-body"
            className="input min-h-[140px] font-mono text-[13px] leading-relaxed"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder={DEFAULT_BODY}
            maxLength={1000}
            required
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-xs font-semibold text-navy-700/70">
              Sisipkan:
            </span>
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.tag}
                type="button"
                onClick={() => insertPlaceholder(p.tag)}
                title={p.desc}
                className="rounded-md border border-navy-200 bg-white px-2 py-0.5 font-mono text-[11px] text-navy-800 hover:border-gold-400 hover:bg-gold-50"
              >
                {p.tag}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-navy-800">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            className="h-4 w-4 accent-navy-700"
          />
          Jadikan template default (dipakai jika API call tidak menentukan template)
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Buat template"}
          </button>
          <span className="text-xs text-navy-700/60">
            Wajib mengandung <code className="code">{"{code}"}</code> atau{" "}
            <code className="code">{"{otp}"}</code>.
          </span>
        </div>
      </form>

      {/* PREVIEW */}
      <div className="card">
        <h3 className="h-display mb-3 text-base font-semibold text-navy-900">
          Live preview
        </h3>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            Pesan WhatsApp (preview)
          </div>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm text-navy-900">
            {preview || "(kosong)"}
          </pre>
        </div>
        <p className="mt-2 text-xs text-navy-700/60">
          Nilai placeholder di preview di-mock: code=123456, minutes=5,
          phone=628123456789, dst.
        </p>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        <h3 className="h-display text-base font-semibold text-navy-900">
          Template tersimpan ({templates.length})
        </h3>
        {templates.length === 0 ? (
          <div className="card text-center text-sm text-navy-700/70">
            Belum ada template. Buat dulu di form di atas.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((t) => (
              <div key={t.id} className="card flex flex-col">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-display text-base font-semibold text-navy-900">
                      {t.name}
                    </h4>
                    <div className="mt-0.5 font-mono text-[10px] text-navy-700/50">
                      ID: {t.id}
                    </div>
                  </div>
                  {t.isDefault && (
                    <span className="pill pill-warn">Default</span>
                  )}
                </div>
                <pre className="flex-1 whitespace-pre-wrap break-words rounded-md bg-navy-50 p-3 font-mono text-xs text-navy-800">
                  {t.body}
                </pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => startEdit(t)} className="btn-ghost text-xs">
                    Edit
                  </button>
                  {!t.isDefault && (
                    <button
                      onClick={() => setDefault(t.id, t.name)}
                      className="btn-outline text-xs"
                    >
                      Jadikan default
                    </button>
                  )}
                  <button
                    onClick={() => setDeleting(t)}
                    className="btn-danger text-xs"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={doDelete}
        variant="danger"
        title={`Hapus template "${deleting?.name}"?`}
        description="Template akan hilang permanen. Aplikasi yang masih merefer ke template ID ini akan jatuh ke template default atau fallback."
        confirmLabel="Ya, hapus"
        cancelLabel="Batal"
      />
    </div>
  );
}
