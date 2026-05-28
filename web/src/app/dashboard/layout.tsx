import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ToastProvider } from "@/components/Toast";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <ToastProvider>
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-navy-700/50">
            Dashboard
          </div>
          <NavLink href="/dashboard" icon="home">Ringkasan</NavLink>
          <NavLink href="/dashboard/wa-sessions" icon="wa">Sesi WhatsApp</NavLink>
          <NavLink href="/dashboard/api-keys" icon="key">API Keys</NavLink>
          <NavLink href="/dashboard/templates" icon="chat">Template Pesan</NavLink>
          <div className="my-3 h-px bg-navy-100" />
          <NavLink href="/docs" icon="book">Dokumentasi</NavLink>
          <NavLink href="/demo.html" icon="play">Halaman Demo</NavLink>
        </aside>
        <div>{children}</div>
      </div>
    </ToastProvider>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: "home" | "wa" | "key" | "book" | "play" | "chat";
  children: React.ReactNode;
}) {
  const icons: Record<string, JSX.Element> = {
    home: <path d="M12 3 4 9v12h6v-7h4v7h6V9z" />,
    wa: <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm5.4 14.2c-.2.6-1.3 1.2-1.8 1.3-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.7-1.2-4.5-3.9-4.6-4.1-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4.2.5.7 1.7.7 1.9.1.1.1.3 0 .5-.1.2-.1.3-.3.4-.1.2-.3.3-.4.5-.1.2-.3.3-.1.6.2.4.9 1.4 1.9 2.3 1.3 1.1 2.4 1.5 2.7 1.6.3.1.5.1.7-.1.2-.2.7-.9.9-1.2.2-.3.4-.2.7-.2.3.1 1.7.8 2 1 .3.1.5.2.6.3.1.2.1.9-.1 1.5z" />,
    key: <path d="M14 6a4 4 0 1 0-3.88 4.99L4 17.12V20h3v-2h2v-2h2.12l1.88-1.88A4 4 0 0 0 14 6zm0 4a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />,
    chat: <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />,
    book: <path d="M5 3h11a3 3 0 0 1 3 3v15l-7-3-7 3V3z" />,
    play: <path d="M8 5v14l11-7z" />,
  };
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-navy-800 transition hover:bg-navy-900 hover:text-cream-50"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 text-navy-500 group-hover:text-gold-300"
        fill="currentColor"
      >
        {icons[icon]}
      </svg>
      {children}
    </Link>
  );
}
