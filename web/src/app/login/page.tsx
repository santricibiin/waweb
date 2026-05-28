import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center">
      <div className="hidden md:block">
        <div className="card-dark relative overflow-hidden p-8">
          <div className="absolute inset-0 panel-batik-dark opacity-30 pointer-events-none" />
          <div className="relative">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold-300">
              Selamat datang kembali
            </div>
            <h2 className="h-display text-3xl font-bold leading-tight text-cream-50">
              Lanjutkan kelola sesi WA Anda
              <span className="block text-gold-300">dengan elegan.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cream-100/80">
              Masuk untuk mengakses dashboard, melihat statistik OTP, dan mengelola
              API key yang dipakai aplikasi Anda.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-cream-100/90">
              <Bullet>Multi sesi WhatsApp</Bullet>
              <Bullet>API key revocable</Bullet>
              <Bullet>Log OTP terenkripsi</Bullet>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h1 className="h-display mb-1 text-3xl font-bold text-navy-900">Masuk</h1>
        <p className="mb-6 text-sm text-navy-700/80">
          Belum punya akun?{" "}
          <a href="/register" className="font-semibold text-gold-700 underline-offset-2 hover:underline">
            Daftar di sini
          </a>
        </p>
        <LoginForm />
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold-300" fill="currentColor">
        <path d="M9 16.2 4.8 12l-1.4 1.4L9 19l12-12-1.4-1.4z" />
      </svg>
      <span>{children}</span>
    </li>
  );
}
