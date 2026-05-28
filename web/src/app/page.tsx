import Link from "next/link";
import { getBaseUrl } from "@/lib/base-url";

export default function HomePage() {
  const baseUrl = getBaseUrl();
  return (
    <div className="space-y-20">
      {/* HERO */}
      <section className="grid gap-10 md:grid-cols-2 md:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/60 bg-gold-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-700">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
            REST API &middot; v1
          </span>
          <h1 className="h-display text-4xl font-bold leading-[1.05] text-navy-900 md:text-6xl">
            Kirim OTP via{" "}
            <span className="gold-line text-navy-800">WhatsApp</span>,
            <br />
            tanpa biaya{" "}
            <span className="text-navy-700">SMS gateway.</span>
          </h1>
          <p className="text-lg leading-relaxed text-navy-700/80">
            Hubungkan nomor WhatsApp Anda, dapatkan API key, dan kirim kode OTP ke
            pengguna lewat REST API. Cocok untuk verifikasi pendaftaran, login,
            atau transaksi - dibungkus tampilan ber-aksen batik Nusantara.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-6 py-3 text-base">
              Mulai sekarang
            </Link>
            <Link href="/docs" className="btn-outline px-6 py-3 text-base">
              Lihat dokumentasi API
            </Link>
          </div>
          <div className="flex items-center gap-6 pt-2 text-xs text-navy-700/70">
            <Stat label="Endpoint" value="3" />
            <Stat label="Auth" value="API Key" />
            <Stat label="Format" value="JSON" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-3 rounded-2xl bg-gradient-to-tr from-gold-300 via-gold-200 to-cream-100 opacity-70 blur-2xl" />
          <div className="card-dark relative space-y-4 p-7">
            <div className="absolute inset-0 panel-batik-dark opacity-25 rounded-xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-gold-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gold-300">
                {baseUrl.replace(/^https?:\/\//, "")}/api/v1/otp/send
              </span>
            </div>
            <pre className="relative overflow-x-auto rounded-lg bg-navy-950/80 p-4 font-mono text-[12px] leading-relaxed text-cream-50">
{`POST /api/v1/otp/send
x-api-key: waotp_xxx_xxx
Content-Type: application/json

{
  "phone": "08123456789",
  "purpose": "login",
  "expiresInSeconds": 300
}`}
            </pre>
            <pre className="relative overflow-x-auto rounded-lg bg-navy-950/80 p-4 font-mono text-[12px] leading-relaxed text-gold-200">
{`{
  "ok": true,
  "requestId": "ck...",
  "phone": "628123456789",
  "expiresInSeconds": 300
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* FITUR */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="h-display text-3xl font-bold text-navy-900 md:text-4xl">
            Fitur lengkap untuk OTP
          </h2>
          <p className="mt-2 text-navy-700/70">
            Tiga hal pokok yang biasanya butuh tiga vendor berbeda - kini satu pintu.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            icon="qr"
            title="Hubungkan via QR"
            desc="Scan QR sekali, sesi WA tetap online di server. Bisa banyak nomor sekaligus."
          />
          <Feature
            icon="key"
            title="API key per project"
            desc="Buat dan revoke key kapan saja. Aman dengan header x-api-key."
          />
          <Feature
            icon="check"
            title="Verifikasi cepat"
            desc="Kode di-hash di database. Endpoint verify mengembalikan status real-time."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="card-dark relative overflow-hidden">
        <div className="absolute inset-0 panel-batik-dark opacity-30 pointer-events-none" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h3 className="h-display text-2xl font-bold text-cream-50 md:text-3xl">
              Siap integrasi dalam 5 menit.
            </h3>
            <p className="mt-2 text-cream-100/80">
              Buat akun, scan QR, generate API key, langsung pakai dari aplikasi Anda.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/register" className="btn-gold px-6 py-3 text-base">
              Daftar gratis
            </Link>
            <Link href="/demo.html" className="btn-outline border-cream-50 text-cream-50 hover:bg-cream-50 hover:text-navy-900 px-6 py-3 text-base">
              Coba demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-navy-500">{label}</div>
      <div className="font-display text-lg font-semibold text-navy-900">{value}</div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: "qr" | "key" | "check";
  title: string;
  desc: string;
}) {
  const icons: Record<string, JSX.Element> = {
    qr: (
      <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm9 0h2v2h-2v-2zm0 3h2v2h-2v-2zm3-3h2v2h-2v-2zm3 0h-2v-2h2v2zm-3 3h2v2h-2v-2zm3 0h-2v2h2v-2z" />
    ),
    key: (
      <path d="M14 6a4 4 0 1 0-3.88 4.99L4 17.12V20h3v-2h2v-2h2.12l1.88-1.88A4 4 0 0 0 14 6zm0 4a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
    ),
    check: (
      <path d="M12 2 4 5v6c0 5 3.4 9.5 8 11 4.6-1.5 8-6 8-11V5l-8-3zm-1.2 14L7 12.2l1.4-1.4 2.4 2.4 4.8-4.8L17 9.8 10.8 16z" />
    ),
  };
  return (
    <div className="card group transition hover:-translate-y-1 hover:shadow-navy-glow">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900 text-gold-300 shadow-soft">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          {icons[icon]}
        </svg>
      </div>
      <h3 className="h-display text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-navy-700/80">{desc}</p>
    </div>
  );
}
