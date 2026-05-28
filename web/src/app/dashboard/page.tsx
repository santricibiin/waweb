import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, apiKeyCount, sessionCount, otpCount, otpVerified, templateCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.uid },
      select: { name: true, email: true },
    }),
    prisma.apiKey.count({ where: { userId: session.uid, revokedAt: null } }),
    prisma.waSession.count({ where: { userId: session.uid } }),
    prisma.otpRequest.count({ where: { userId: session.uid } }),
    prisma.otpRequest.count({ where: { userId: session.uid, status: "VERIFIED" } }),
    prisma.messageTemplate.count({ where: { userId: session.uid } }),
  ]);

  const successRate = otpCount > 0 ? Math.round((otpVerified / otpCount) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="card-dark relative overflow-hidden">
        <div className="absolute inset-0 panel-batik-dark opacity-25 pointer-events-none" />
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold-300">
            Selamat datang
          </div>
          <h1 className="h-display mt-1 text-3xl font-bold text-cream-50">
            Halo, {user?.name || user?.email?.split("@")[0]}
          </h1>
          <p className="mt-1 text-sm text-cream-100/80">{user?.email}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="API Keys aktif" value={apiKeyCount} href="/dashboard/api-keys" icon="key" />
        <Stat label="Sesi WhatsApp" value={sessionCount} href="/dashboard/wa-sessions" icon="wa" />
        <Stat label="Template pesan" value={templateCount} href="/dashboard/templates" icon="paper" />
        <Stat label="Berhasil verify" value={`${successRate}%`} icon="check" hint={`${otpVerified} / ${otpCount}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ActionCard
          title="Hubungkan WhatsApp"
          desc="Scan QR untuk mengaktifkan nomor pengirim OTP."
          href="/dashboard/wa-sessions"
          cta="Kelola sesi WA"
        />
        <ActionCard
          title="Buat API Key"
          desc="Dapatkan kunci untuk dipakai di program Anda."
          href="/dashboard/api-keys"
          cta="Kelola API key"
        />
      </div>

      <div className="card">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-100 text-gold-700">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M11 17h2v-6h-2v6zm1-15a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-11h2V7h-2v2z" />
            </svg>
          </span>
          <h2 className="h-display text-lg font-semibold text-navy-900">Cara cepat memulai</h2>
        </div>
        <ol className="mt-4 space-y-2.5 text-sm text-navy-800">
          <Step n={1}>
            Buka{" "}
            <Link href="/dashboard/wa-sessions" className="font-semibold text-gold-700 underline-offset-2 hover:underline">
              Sesi WhatsApp
            </Link>{" "}
            &rarr; tambah sesi &rarr; scan QR.
          </Step>
          <Step n={2}>
            Buka{" "}
            <Link href="/dashboard/api-keys" className="font-semibold text-gold-700 underline-offset-2 hover:underline">
              API Keys
            </Link>{" "}
            &rarr; buat key baru, simpan baik-baik.
          </Step>
          <Step n={3}>
            Cek{" "}
            <Link href="/docs" className="font-semibold text-gold-700 underline-offset-2 hover:underline">
              Dokumentasi API
            </Link>{" "}
            atau{" "}
            <a href="/demo.html" className="font-semibold text-gold-700 underline-offset-2 hover:underline">
              halaman demo
            </a>{" "}
            untuk uji coba.
          </Step>
        </ol>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  icon,
  hint,
}: {
  label: string;
  value: number | string;
  href?: string;
  icon: "key" | "wa" | "paper" | "check";
  hint?: string;
}) {
  const icons: Record<string, JSX.Element> = {
    key: <path d="M14 6a4 4 0 1 0-3.88 4.99L4 17.12V20h3v-2h2v-2h2.12l1.88-1.88A4 4 0 0 0 14 6z" />,
    wa: <path d="M12 2a10 10 0 1 0 5 18.7L22 22l-1.3-5A10 10 0 0 0 12 2z" />,
    paper: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM8 18h8v-2H8v2zm0-4h8v-2H8v2zm5-7V3.5L18.5 9H13z" />,
    check: <path d="M12 2 4 5v6c0 5 3.4 9.5 8 11 4.6-1.5 8-6 8-11V5l-8-3zm-1.2 14L7 12.2l1.4-1.4 2.4 2.4 4.8-4.8L17 9.8 10.8 16z" />,
  };
  const body = (
    <div className="card transition hover:-translate-y-0.5 hover:shadow-navy-glow">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-700/60">
          {label}
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-navy-900 text-gold-300">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            {icons[icon]}
          </svg>
        </span>
      </div>
      <div className="mt-2 font-display text-3xl font-bold text-navy-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-navy-700/60">{hint}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function ActionCard({
  title,
  desc,
  href,
  cta,
}: {
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="card flex flex-col">
      <h3 className="h-display text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-navy-700/80">{desc}</p>
      <Link href={href} className="btn-primary mt-4 self-start">
        {cta}
      </Link>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-gold-300">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
