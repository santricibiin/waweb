import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center">
      <div className="hidden md:block">
        <div className="card-dark relative overflow-hidden p-8">
          <div className="absolute inset-0 panel-batik-dark opacity-30 pointer-events-none" />
          <div className="relative">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold-300">
              Mulai gratis
            </div>
            <h2 className="h-display text-3xl font-bold leading-tight text-cream-50">
              Bangun OTP via WhatsApp
              <span className="block text-gold-300">dalam hitungan menit.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cream-100/80">
              Daftar, hubungkan nomor WhatsApp Anda, lalu pakai REST API kami di
              aplikasi - tanpa SMS gateway, tanpa biaya per pesan.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-cream-100/90">
              <Bullet>3 endpoint REST sederhana</Bullet>
              <Bullet>OTP code di-hash bcrypt</Bullet>
              <Bullet>Multi tenant ready</Bullet>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h1 className="h-display mb-1 text-3xl font-bold text-navy-900">
          Daftar akun
        </h1>
        <p className="mb-6 text-sm text-navy-700/80">
          Sudah punya akun?{" "}
          <a
            href="/login"
            className="font-semibold text-gold-700 underline-offset-2 hover:underline"
          >
            Masuk di sini
          </a>
        </p>
        <RegisterForm />
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg
        viewBox="0 0 24 24"
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold-300"
        fill="currentColor"
      >
        <path d="M9 16.2 4.8 12l-1.4 1.4L9 19l12-12-1.4-1.4z" />
      </svg>
      <span>{children}</span>
    </li>
  );
}
