import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface EntryPassDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
}

/**
 * Accessible native modal dialog for Entry Pass workflows.
 * Uses showModal() for built-in top-layer stacking, Esc dismissal, and focus return.
 */
export const EntryPassDialog: React.FC<EntryPassDialogProps> = ({
  open,
  title,
  subtitle,
  onClose,
  maxWidthClass = 'w-full max-w-lg',
  children,
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressedOutside = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const isOutside = (e: React.PointerEvent<HTMLDialogElement>) => {
    const dialog = ref.current;
    if (!dialog) return false;
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`ep-dialog ${maxWidthClass}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onPointerDown={(e) => {
        pressedOutside.current = isOutside(e);
      }}
      onPointerUp={(e) => {
        if (pressedOutside.current && isOutside(e)) {
          onClose();
        }
        pressedOutside.current = false;
      }}
    >
      {open && (
        <div className="flex flex-col max-h-[calc(100dvh-32px)]">
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#e2e8df]">
            <div>
              <h1 id={titleId} className="text-base font-semibold text-[#26352e] leading-snug">
                {title}
              </h1>
              {subtitle && <p className="text-xs text-[#65726a] mt-1">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close window"
              className="p-1.5 rounded-lg text-[#65726a] hover:text-[#26352e] hover:bg-[#eff4ed] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto">{children}</div>
        </div>
      )}
    </dialog>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Clean confirmation dialog replacing browser window.confirm() calls.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <EntryPassDialog open={open} title={title} onClose={onCancel} maxWidthClass="w-full max-w-md">
      <p className="text-sm text-[#4a5750] leading-relaxed">{message}</p>
      <div className="flex items-center justify-end gap-2.5 mt-6">
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-xs font-medium border border-[#e2e8df] bg-white text-[#26352e] hover:bg-[#f6f8f4] disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 ${
            tone === 'danger'
              ? 'bg-[#b43c48] hover:bg-[#9c323d]'
              : 'bg-[#426b52] hover:bg-[#365a44]'
          }`}
        >
          {busy ? 'Please wait...' : confirmLabel}
        </button>
      </div>
    </EntryPassDialog>
  );
};
