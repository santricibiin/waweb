import Link from "next/link";
import { getBaseUrl } from "@/lib/base-url";

interface FieldRow {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  desc: string;
  example?: string;
}

export default function DocsPage() {
  const baseUrl = getBaseUrl();

  return (
    <div className="grid gap-10 md:grid-cols-[240px_1fr]">
      <aside className="sticky top-4 self-start space-y-1">
        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-navy-700/50">
          Pengenalan
        </div>
        <SideLink href="#intro">Pendahuluan</SideLink>
        <SideLink href="#auth">Autentikasi</SideLink>
        <SideLink href="#flow">Alur penggunaan</SideLink>

        <div className="mt-3 mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-gold-700">
          Endpoints
        </div>
        <SideLink href="#send">POST /otp/send</SideLink>
        <SideLink href="#verify">POST /otp/verify</SideLink>
        <SideLink href="#status">GET /otp/status</SideLink>

        <div className="mt-3 mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-gold-700">
          Referensi
        </div>
        <SideLink href="#status-codes">Kode status OTP</SideLink>
        <SideLink href="#errors">Kode error HTTP</SideLink>
        <SideLink href="#examples">Contoh integrasi</SideLink>
      </aside>

      <article className="space-y-16">
        {/* INTRO */}
        <section id="intro" className="space-y-4 scroll-mt-24">
          <span className="inline-block rounded-full border border-gold-400/60 bg-gold-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold-700">
            REST API v1
          </span>
          <h1 className="h-display text-4xl font-bold text-navy-900 md:text-5xl">
            Dokumentasi API
          </h1>
          <p className="text-lg leading-relaxed text-navy-700/85">
            REST API untuk mengirim dan memverifikasi kode OTP via WhatsApp.
            Semua request &amp; response dalam format JSON. Auth pakai header{" "}
            <code className="code">x-api-key</code>.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="card-dark relative overflow-hidden p-5">
              <div className="absolute inset-0 panel-batik-dark opacity-25 pointer-events-none" />
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-widest text-gold-300">
                  Base URL
                </div>
                <code className="mt-2 block break-all font-mono text-sm text-cream-50">
                  {baseUrl}/api/v1
                </code>
              </div>
            </div>
            <div className="card p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-navy-700/60">
                Format
              </div>
              <ul className="mt-2 space-y-1 text-sm text-navy-800">
                <li>
                  &middot; Request body:{" "}
                  <code className="code">application/json</code>
                </li>
                <li>
                  &middot; Response:{" "}
                  <code className="code">application/json</code>
                </li>
                <li>
                  &middot; Encoding:{" "}
                  <code className="code">UTF-8</code>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* AUTH */}
        <Section id="auth" title="Autentikasi">
          <p>
            Setiap request harus menyertakan API key di header{" "}
            <code className="code">x-api-key</code>. Buat key di{" "}
            <Link
              href="/dashboard/api-keys"
              className="font-semibold text-gold-700 underline-offset-2 hover:underline"
            >
              halaman API Keys
            </Link>
            . Format key: <code className="code">waotp_&lt;prefix&gt;_&lt;secret&gt;</code>
          </p>
          <pre className="codeblock">{`x-api-key: waotp_aB12cD34_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</pre>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Penting:</strong> Key hanya muncul sekali saat dibuat. Simpan
            di environment variable aplikasi Anda, jangan hardcode di repository.
          </div>
        </Section>

        {/* FLOW */}
        <Section id="flow" title="Alur penggunaan">
          <ol className="space-y-2 text-sm">
            <FlowStep n={1}>
              <strong>Aplikasi Anda</strong> memanggil{" "}
              <code className="code">POST /otp/send</code> dengan nomor tujuan.
            </FlowStep>
            <FlowStep n={2}>
              <strong>WA OTP Platform</strong> generate kode &amp; kirim ke WhatsApp
              tujuan, lalu kembalikan <code className="code">requestId</code>.
            </FlowStep>
            <FlowStep n={3}>
              <strong>User</strong> menerima kode di WhatsApp dan memasukkannya di form
              aplikasi Anda.
            </FlowStep>
            <FlowStep n={4}>
              <strong>Aplikasi Anda</strong> memanggil{" "}
              <code className="code">POST /otp/verify</code> dengan{" "}
              <code className="code">requestId</code> + kode. Jika valid, lanjutkan
              proses login/registrasi.
            </FlowStep>
          </ol>
        </Section>

        {/* SEND */}
        <Section id="send" title="Kirim OTP" badge="POST" path="/otp/send">
          <p>Membuat dan mengirim kode OTP ke nomor WhatsApp tujuan.</p>

          <H3>Request body</H3>
          <FieldsTable
            rows={[
              {
                name: "phone",
                type: "string",
                required: true,
                desc: "Nomor tujuan dalam format 0xxx, 62xxx, atau +62xxx. Akan dinormalisasi otomatis.",
                example: "08123456789",
              },
              {
                name: "purpose",
                type: "string",
                required: false,
                desc: "Label tujuan untuk audit trail.",
                example: "login",
              },
              {
                name: "length",
                type: "integer",
                required: false,
                default: "6",
                desc: "Panjang kode OTP (4 - 8 digit).",
                example: "6",
              },
              {
                name: "expiresInSeconds",
                type: "integer",
                required: false,
                default: "300",
                desc: "Masa berlaku OTP dalam detik (30 - 1800).",
                example: "300",
              },
              {
                name: "template",
                type: "string",
                required: false,
                desc: "Custom template pesan inline. Gunakan placeholder seperti {code}, {minutes}, dll.",
                example: "Kode verifikasi Anda: {code}",
              },
              {
                name: "templateId",
                type: "string",
                required: false,
                desc: "ID template yang sudah dibuat di dashboard. Jika kedua 'template' dan 'templateId' kosong, dipakai template default user (atau fallback bawaan).",
                example: "ck...",
              },
              {
                name: "variables",
                type: "object",
                required: false,
                desc: "Variabel custom untuk placeholder {var:NAMA} di template. Contoh: { \"merchant\": \"TokoXYZ\" } -> {var:merchant}.",
                example: '{"merchant":"TokoXYZ"}',
              },
              {
                name: "sessionId",
                type: "string",
                required: false,
                desc: "ID sesi WA tertentu. Jika kosong, otomatis pakai sesi yang CONNECTED.",
              },
            ]}
          />

          <H3>cURL</H3>
          <pre className="codeblock">{`curl -X POST ${baseUrl}/api/v1/otp/send \\
  -H "x-api-key: waotp_xxx_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "08123456789",
    "purpose": "login",
    "expiresInSeconds": 300
  }'`}</pre>

          <H3>Placeholder yang didukung di template</H3>
          <div className="overflow-hidden rounded-lg border border-navy-100 bg-white shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-[11px] font-semibold uppercase tracking-wider text-navy-700">
                <tr>
                  <th className="px-3 py-2.5 w-40">Placeholder</th>
                  <th className="px-3 py-2.5">Diganti dengan</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["{code}", "Kode OTP yang di-generate"],
                  ["{otp}", "Alias dari {code}"],
                  ["{minutes}", "Menit masa berlaku (round)"],
                  ["{seconds}", "Detik masa berlaku"],
                  ["{phone}", "Nomor tujuan setelah dinormalisasi"],
                  ["{purpose}", "Nilai field 'purpose' (atau kosong)"],
                  ["{var:NAMA}", "Diambil dari field 'variables', mis. {var:merchant} -> 'TokoXYZ'"],
                ].map(([k, v]) => (
                  <tr key={k} className="border-t border-navy-100">
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gold-700">{k}</td>
                    <td className="px-3 py-2.5 text-navy-800">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <H3>Contoh dengan template inline + variables</H3>
          <pre className="codeblock">{`curl -X POST ${baseUrl}/api/v1/otp/send \\
  -H "x-api-key: waotp_xxx_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "08123456789",
    "purpose": "login",
    "template": "Halo {var:nama}, kode OTP {var:merchant}: *{code}* (berlaku {minutes} menit)",
    "variables": {
      "nama": "Budi",
      "merchant": "TokoXYZ"
    }
  }'`}</pre>
          <p className="text-sm text-navy-700/85">
            Hasil pesan WhatsApp:{" "}
            <em>Halo Budi, kode OTP TokoXYZ: <strong>123456</strong> (berlaku 5 menit)</em>
          </p>

          <H3>Prioritas pemilihan template</H3>
          <ol className="list-inside list-decimal space-y-1 rounded-lg border border-navy-100 bg-white/80 p-4 text-sm text-navy-800">
            <li>Field <code className="code">template</code> di body request (paling tinggi)</li>
            <li>Field <code className="code">templateId</code> -&gt; ambil dari dashboard</li>
            <li>Template default user (yang dicentang &quot;Default&quot; di dashboard)</li>
            <li>Fallback bawaan: <code className="code">Kode OTP Anda adalah: *{"{code}"}*\nBerlaku {"{minutes}"} menit...</code></li>
          </ol>

          <H3>Response 200 OK</H3>
          <ResponseTable
            rows={[
              ["ok", "boolean", "Selalu true ketika sukses."],
              ["requestId", "string", "ID unik request. Simpan untuk verify/status."],
              ["phone", "string", "Nomor tujuan setelah dinormalisasi."],
              ["expiresAt", "string (ISO)", "Waktu kedaluwarsa."],
              ["expiresInSeconds", "integer", "Masa berlaku dalam detik."],
            ]}
          />
          <pre className="codeblock">{`{
  "ok": true,
  "requestId": "ckxxx1234567890abcdef",
  "phone": "628123456789",
  "expiresAt": "2026-05-28T15:00:00.000Z",
  "expiresInSeconds": 300
}`}</pre>
        </Section>

        {/* VERIFY */}
        <Section id="verify" title="Verifikasi OTP" badge="POST" path="/otp/verify">
          <p>Memverifikasi kode OTP yang diterima pengguna.</p>

          <H3>Request body</H3>
          <FieldsTable
            rows={[
              {
                name: "code",
                type: "string",
                required: true,
                desc: "Kode OTP yang dimasukkan pengguna.",
                example: "123456",
              },
              {
                name: "requestId",
                type: "string",
                required: false,
                desc: "ID dari response /otp/send (disarankan, lebih akurat).",
                example: "ckxxx1234567890abcdef",
              },
              {
                name: "phone",
                type: "string",
                required: false,
                desc: "Alternatif jika tidak menyimpan requestId. Akan dipakai OTP terbaru.",
                example: "08123456789",
              },
            ]}
          />
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <strong>Catatan:</strong> Minimal salah satu dari{" "}
            <code className="code">requestId</code> atau{" "}
            <code className="code">phone</code> wajib diisi.
          </div>

          <H3>cURL</H3>
          <pre className="codeblock">{`curl -X POST ${baseUrl}/api/v1/otp/verify \\
  -H "x-api-key: waotp_xxx_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "requestId": "ckxxx...",
    "code": "123456"
  }'`}</pre>

          <H3>Response 200 OK</H3>
          <ResponseTable
            rows={[
              ["ok", "boolean", "true jika kode valid."],
              ["verified", "boolean", "Selalu true di response 200."],
              ["requestId", "string", "ID request yang diverifikasi."],
              ["phone", "string", "Nomor terkait."],
              ["verifiedAt", "string (ISO)", "Waktu verifikasi sukses."],
            ]}
          />
          <pre className="codeblock">{`{
  "ok": true,
  "verified": true,
  "requestId": "ckxxx1234567890abcdef",
  "phone": "628123456789",
  "verifiedAt": "2026-05-28T14:55:30.000Z"
}`}</pre>

          <H3>Response error spesifik</H3>
          <ResponseTable
            rows={[
              ["400 + attemptsRemaining", "Kode salah", "{ error: 'Invalid OTP code', attemptsRemaining: 4 }"],
              ["404", "OTP tidak ditemukan", "{ error: 'No active OTP found...' }"],
              ["410", "Kedaluwarsa", "{ error: 'OTP expired' }"],
              ["429", "Terlalu banyak gagal", "{ error: 'Maximum verification attempts exceeded' }"],
            ]}
          />
        </Section>

        {/* STATUS */}
        <Section
          id="status"
          title="Cek status request"
          badge="GET"
          path="/otp/status/{requestId}"
        >
          <p>Mengembalikan detail terbaru sebuah request OTP.</p>

          <H3>Path parameter</H3>
          <FieldsTable
            rows={[
              {
                name: "requestId",
                type: "string",
                required: true,
                desc: "ID dari response /otp/send.",
                example: "ckxxx1234567890abcdef",
              },
            ]}
          />

          <H3>cURL</H3>
          <pre className="codeblock">{`curl ${baseUrl}/api/v1/otp/status/ckxxx... \\
  -H "x-api-key: waotp_xxx_xxx"`}</pre>

          <H3>Response 200</H3>
          <pre className="codeblock">{`{
  "ok": true,
  "request": {
    "id": "ckxxx...",
    "phone": "628123456789",
    "status": "SENT",
    "purpose": "login",
    "attempts": 0,
    "maxAttempts": 5,
    "expiresAt": "2026-05-28T15:00:00.000Z",
    "sentAt":     "2026-05-28T14:55:00.000Z",
    "verifiedAt": null,
    "failedAt":   null,
    "createdAt":  "2026-05-28T14:55:00.000Z"
  }
}`}</pre>
        </Section>

        {/* STATUS CODES */}
        <Section id="status-codes" title="Kode status OTP">
          <p>Field <code className="code">status</code> di setiap request OTP:</p>
          <div className="grid gap-3 md:grid-cols-2">
            <StatusCard pill="pill-mute" code="PENDING" desc="Baru dibuat, belum dikirim ke WA." />
            <StatusCard pill="pill-info" code="SENT" desc="Sudah dikirim ke WhatsApp dan menunggu verifikasi." />
            <StatusCard pill="pill-success" code="VERIFIED" desc="Kode telah diverifikasi dengan benar." />
            <StatusCard pill="pill-warn" code="EXPIRED" desc="Lewat masa berlaku tanpa diverifikasi." />
            <StatusCard pill="pill-danger" code="FAILED" desc="Gagal kirim atau melebihi max attempts." />
          </div>
        </Section>

        {/* ERRORS */}
        <Section id="errors" title="Kode error HTTP">
          <div className="overflow-hidden rounded-lg border border-navy-100 bg-white shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-[11px] font-semibold uppercase tracking-wider text-navy-700">
                <tr>
                  <th className="px-3 py-2.5 w-20">Status</th>
                  <th className="px-3 py-2.5 w-40">Nama</th>
                  <th className="px-3 py-2.5">Penyebab</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["400", "Bad Request", "Body tidak valid atau parameter kurang."],
                  ["401", "Unauthorized", "Header x-api-key tidak ada atau key tidak valid."],
                  ["404", "Not Found", "OTP request dengan id tersebut tidak ditemukan."],
                  ["409", "Conflict", "Tidak ada sesi WhatsApp yang berstatus CONNECTED."],
                  ["410", "Gone", "OTP sudah kedaluwarsa."],
                  ["429", "Too Many Requests", "Melebihi maksimum percobaan verifikasi (default 5)."],
                  ["502", "Bad Gateway", "Gagal mengirim pesan via WhatsApp (worker error)."],
                ].map(([code, name, desc]) => (
                  <tr key={code} className="border-t border-navy-100">
                    <td className="px-3 py-2.5 font-mono font-semibold text-red-700">{code}</td>
                    <td className="px-3 py-2.5 text-navy-900">{name}</td>
                    <td className="px-3 py-2.5 text-navy-700">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* EXAMPLES */}
        <Section id="examples" title="Contoh integrasi">
          <H3>Node.js (fetch)</H3>
          <pre className="codeblock">{`const API = "${baseUrl}/api/v1";
const KEY = process.env.WAOTP_KEY;

async function sendOtp(phone) {
  const r = await fetch(API + "/otp/send", {
    method: "POST",
    headers: {
      "x-api-key": KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({ phone, purpose: "login" }),
  });
  return r.json();
}

async function verifyOtp(requestId, code) {
  const r = await fetch(API + "/otp/verify", {
    method: "POST",
    headers: {
      "x-api-key": KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({ requestId, code }),
  });
  return r.json();
}`}</pre>

          <H3>PHP (cURL)</H3>
          <pre className="codeblock">{`<?php
$ch = curl_init("${baseUrl}/api/v1/otp/send");
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    "x-api-key: " . getenv("WAOTP_KEY"),
    "Content-Type: application/json"
  ],
  CURLOPT_POSTFIELDS => json_encode([
    "phone"   => "08123456789",
    "purpose" => "login"
  ]),
]);
$res = json_decode(curl_exec($ch), true);
curl_close($ch);`}</pre>

          <H3>Python (requests)</H3>
          <pre className="codeblock">{`import os, requests

API = "${baseUrl}/api/v1"
KEY = os.environ["WAOTP_KEY"]
H   = {"x-api-key": KEY, "content-type": "application/json"}

def send_otp(phone):
    r = requests.post(f"{API}/otp/send",
                      headers=H,
                      json={"phone": phone, "purpose": "login"})
    return r.json()

def verify_otp(req_id, code):
    r = requests.post(f"{API}/otp/verify",
                      headers=H,
                      json={"requestId": req_id, "code": code})
    return r.json()`}</pre>
        </Section>
      </article>
    </div>
  );
}

function SideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="block rounded-lg px-3 py-2 text-sm text-navy-800 transition hover:bg-navy-900 hover:text-cream-50"
    >
      {children}
    </a>
  );
}

function Section({
  id,
  title,
  badge,
  path,
  children,
}: {
  id: string;
  title: string;
  badge?: string;
  path?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-4 scroll-mt-24">
      <div className="flex flex-wrap items-center gap-3">
        {badge && (
          <span
            className={`pill font-mono ${
              badge === "POST" ? "pill-warn" : "pill-info"
            }`}
          >
            {badge}
          </span>
        )}
        <h2 className="h-display text-2xl font-bold text-navy-900 md:text-3xl">
          {title}
        </h2>
        {path && (
          <code className="rounded bg-navy-900 px-2 py-1 font-mono text-xs text-gold-200">
            {path}
          </code>
        )}
      </div>
      <div className="space-y-4 text-navy-800 leading-relaxed">{children}</div>
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="h-display mt-2 text-base font-semibold text-navy-900">
      {children}
    </h3>
  );
}

function FieldsTable({ rows }: { rows: FieldRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-navy-100 bg-white shadow-soft">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-navy-50 text-left text-[11px] font-semibold uppercase tracking-wider text-navy-700">
          <tr>
            <th className="px-3 py-2.5">Field</th>
            <th className="px-3 py-2.5">Tipe</th>
            <th className="px-3 py-2.5">Wajib</th>
            <th className="px-3 py-2.5">Default</th>
            <th className="px-3 py-2.5">Contoh</th>
            <th className="px-3 py-2.5">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-navy-100 align-top">
              <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gold-700">
                {r.name}
                {r.required && <span className="ml-0.5 text-red-600">*</span>}
              </td>
              <td className="px-3 py-2.5 font-mono text-xs text-navy-600">
                {r.type}
              </td>
              <td className="px-3 py-2.5">
                {r.required ? (
                  <span className="pill pill-danger">wajib</span>
                ) : (
                  <span className="pill pill-mute">opsional</span>
                )}
              </td>
              <td className="px-3 py-2.5 font-mono text-xs text-navy-600">
                {r.default ?? "-"}
              </td>
              <td className="px-3 py-2.5 font-mono text-xs text-navy-700">
                {r.example ?? "-"}
              </td>
              <td className="px-3 py-2.5 text-navy-800">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResponseTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-navy-100 bg-white shadow-soft">
      <table className="w-full text-sm">
        <thead className="bg-navy-50 text-left text-[11px] font-semibold uppercase tracking-wider text-navy-700">
          <tr>
            <th className="px-3 py-2.5">Field</th>
            <th className="px-3 py-2.5">Tipe</th>
            <th className="px-3 py-2.5">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([f, t, d]) => (
            <tr key={f} className="border-t border-navy-100">
              <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gold-700">
                {f}
              </td>
              <td className="px-3 py-2.5 font-mono text-xs text-navy-600">{t}</td>
              <td className="px-3 py-2.5 text-navy-800">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlowStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-navy-100 bg-white/80 p-3">
      <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-gold-300">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function StatusCard({
  pill,
  code,
  desc,
}: {
  pill: string;
  code: string;
  desc: string;
}) {
  return (
    <div className="card p-4">
      <span className={`pill ${pill} font-mono`}>{code}</span>
      <p className="mt-2 text-sm text-navy-700/85">{desc}</p>
    </div>
  );
}
