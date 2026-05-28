"use client";

import { useState } from "react";
import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger" | "warn";
  /** Kalau true, user wajib ketik teks ini sebelum bisa konfirmasi */
  typeToConfirm?: string;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "default",
  typeToConfirm,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const [typed, setTyped] = useState("");

  const canConfirm =
    !typeToConfirm || typed.trim().toLowerCase() === typeToConfirm.toLowerCase();

  async function handleConfirm() {
    if (!canConfirm) return;
    setLoading(true);
    try {
      await onConfirm();
      setTyped("");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setTyped("");
    onClose();
  }

  const btnClass =
    variant === "danger"
      ? "btn-danger"
      : variant === "warn"
      ? "btn-gold"
      : "btn-primary";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      size="sm"
      variant={variant === "default" ? "default" : variant}
      footer={
        <>
          <button onClick={handleClose} disabled={loading} className="btn-ghost">
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !canConfirm}
            className={btnClass}
          >
            {loading ? "Memproses..." : confirmLabel}
          </button>
        </>
      }
    >
      {typeToConfirm && (
        <div className="space-y-2">
          <p className="text-sm text-navy-700/85">
            Untuk mengkonfirmasi, ketik{" "}
            <code className="code">{typeToConfirm}</code> di bawah.
          </p>
          <input
            className="input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            disabled={loading}
            placeholder={typeToConfirm}
          />
        </div>
      )}
    </Modal>
  );
}
