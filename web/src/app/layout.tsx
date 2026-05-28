import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "WA OTP Platform - Verifikasi via WhatsApp",
  description:
    "Platform OTP via WhatsApp dengan sentuhan batik Nusantara. API siap pakai untuk login, registrasi, dan verifikasi.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="id">
      <body>
        <header className="relative border-b border-gold-400/30 bg-navy-900 text-cream-50 shadow-navy-glow">
          <div className="absolute inset-0 panel-batik-dark opacity-40 pointer-events-none" />
          <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-3 font-display text-lg font-bold tracking-wide"
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-md bg-gold-400 text-navy-900 shadow">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 2 L14 9 L21 9 L15.5 13 L17.5 20 L12 16 L6.5 20 L8.5 13 L3 9 L10 9 Z" />
                </svg>
              </span>
              <span>
                WA <span className="text-gold-300">OTP</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/docs"
                className="rounded-md px-3 py-2 text-cream-50/90 hover:bg-white/10 hover:text-cream-50"
              >
                Dokumentasi
              </Link>
              {session ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-md px-3 py-2 text-cream-50/90 hover:bg-white/10 hover:text-cream-50"
                  >
                    Dashboard
                  </Link>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-md px-3 py-2 text-cream-50/90 hover:bg-white/10 hover:text-cream-50"
                  >
                    Masuk
                  </Link>
                  <Link href="/register" className="btn-gold ml-1">
                    Daftar
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="h-1 bg-gradient-to-r from-gold-400 via-gold-300 to-gold-400" />
        </header>

        <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-10">
          {children}
        </main>

        <footer className="relative mt-12">
          <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 text-center">
            <div className="mx-auto mb-4 h-px w-32 bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
            <div className="font-display text-sm font-semibold text-navy-800">
              WA OTP Platform
            </div>
            <div className="mt-1 text-xs text-navy-700/60">
              Built with Next.js, Baileys & Prisma &middot; Nusantara batik aesthetic
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
