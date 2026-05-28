"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "danger" | "warn" | "success";
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
  hideClose?: boolean;
}

const SIZES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const VARIANT_ACCENT: Record<NonNullable<ModalProps["variant"]>, string> = {
  default: "from-navy-700 to-navy-900",
  danger: "from-red-600 to-red-800",
  warn: "from-gold-500 to-gold-700",
  success: "from-emerald-600 to-emerald-800",
};

const VARIANT_ICON: Record<NonNullable<ModalProps["variant"]>, JSX.Element | null> = {
  default: null,
  danger: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2 1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z" />
    </svg>
  ),
  warn: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2 1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19l12-12-1.4-1.4z" />
    </svg>
  ),
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  variant = "default",
  children,
  footer,
  closeOnBackdrop = true,
  hideClose = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm animate-fade-in"
        onClick={() => closeOnBackdrop && onClose()}
      />

      {/* Dialog */}
      <div
        className={`relative w-full ${SIZES[size]} animate-pop overflow-hidden rounded-2xl bg-cream-50 shadow-2xl ring-1 ring-navy-900/10`}
      >
        {/* Top accent bar with batik */}
        <div className={`relative h-1.5 bg-gradient-to-r ${VARIANT_ACCENT[variant]}`}>
          <div className="absolute inset-0 panel-batik-dark opacity-25 pointer-events-none" />
        </div>

        {/* Header */}
        {(title || description) && (
          <div className="flex items-start gap-3 px-6 pb-2 pt-5">
            {VARIANT_ICON[variant] && (
              <span
                className={`mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                  variant === "danger"
                    ? "bg-red-100 text-red-700"
                    : variant === "warn"
                    ? "bg-gold-100 text-gold-700"
                    : variant === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-navy-100 text-navy-700"
                }`}
              >
                {VARIANT_ICON[variant]}
              </span>
            )}
            <div className="flex-1">
              {title && (
                <h3 className="h-display text-lg font-bold text-navy-900">{title}</h3>
              )}
              {description && (
                <p className="mt-1 text-sm text-navy-700/80">{description}</p>
              )}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                className="ml-2 rounded-md p-1.5 text-navy-700/60 hover:bg-navy-100 hover:text-navy-900"
                aria-label="Tutup"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.41 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 pb-5 pt-3">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-navy-100 bg-navy-50/50 px-6 py-3">
            {footer}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pop {
          0% { opacity: 0; transform: translateY(8px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        :global(.animate-fade-in) { animation: fade-in 0.18s ease-out; }
        :global(.animate-pop) { animation: pop 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}
