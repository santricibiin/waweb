"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastType = "success" | "error" | "info" | "warn";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastCtx {
  push: (t: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warn: (title: string, message?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 10);
    setToasts((prev) => [...prev, { id, duration: 4000, ...t }]);
  }, []);

  const value: ToastCtx = {
    push,
    success: (title, message) => push({ type: "success", title, message }),
    error: (title, message) => push({ type: "error", title, message, duration: 6000 }),
    info: (title, message) => push({ type: "info", title, message }),
    warn: (title, message) => push({ type: "warn", title, message }),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, toast.duration ?? 4000);
    return () => clearTimeout(t);
  }, [toast.duration, onClose]);

  const styles: Record<ToastType, { bg: string; ring: string; icon: JSX.Element }> = {
    success: {
      bg: "bg-emerald-50",
      ring: "ring-emerald-200 text-emerald-900",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-600" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 14.5L6.5 12l1.4-1.4 3.1 3 6.6-6.6 1.4 1.4z" />
        </svg>
      ),
    },
    error: {
      bg: "bg-red-50",
      ring: "ring-red-200 text-red-900",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-600" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      ),
    },
    info: {
      bg: "bg-sky-50",
      ring: "ring-sky-200 text-sky-900",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-600" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      ),
    },
    warn: {
      bg: "bg-gold-50",
      ring: "ring-gold-200 text-gold-900",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-gold-600" fill="currentColor">
          <path d="M12 2 1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z" />
        </svg>
      ),
    },
  };

  const s = styles[toast.type];

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl ${s.bg} px-4 py-3 shadow-lg ring-1 ${s.ring} animate-toast`}
    >
      <span className="mt-0.5">{s.icon}</span>
      <div className="flex-1">
        <div className="text-sm font-semibold">{toast.title}</div>
        {toast.message && <div className="mt-0.5 text-xs opacity-85">{toast.message}</div>}
      </div>
      <button
        onClick={onClose}
        className="ml-2 rounded p-1 opacity-50 hover:bg-black/5 hover:opacity-100"
        aria-label="Tutup"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.41 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z" />
        </svg>
      </button>

      <style jsx>{`
        @keyframes toast {
          0% { opacity: 0; transform: translateY(-12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        :global(.animate-toast) { animation: toast 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}
