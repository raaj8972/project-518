import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, CreditCard, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { claimCollegeIdentity } from '../../services/studentTeams';

export interface IQMGPopupProfile {
  iqmg_number?: string | null;
  iqmg_status?: 'pending' | 'verified' | 'correction_required' | null;
  iqmg_note?: string | null;
  iqmg_updated_at?: string | null;
}

interface IQMGStatusPopupProps {
  userId?: string;
  profile: IQMGPopupProfile | null;
  onSaved: () => Promise<void>;
}

const IQMG_ALLOWED_PATTERN = /^[A-Z0-9 /_-]+$/;

function ackStorageKey(userId: string): string {
  return `rico_iqmg_popup_ack:${userId}`;
}

function readAck(userId: string): string | null {
  try {
    return localStorage.getItem(ackStorageKey(userId));
  } catch {
    return null;
  }
}

function writeAck(userId: string, signature: string) {
  try {
    localStorage.setItem(ackStorageKey(userId), signature);
  } catch {
    // Ignore storage errors in restricted environments; memory state still tracks dismissal.
  }
}

function pointerOutsideDialog(event: React.PointerEvent<HTMLDialogElement>, dialog: HTMLDialogElement): boolean {
  const rect = dialog.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
}

export const IQMGStatusPopup: React.FC<IQMGStatusPopupProps> = ({ userId, profile, onSaved }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pressedOutsideRef = useRef(false);
  const resolvedSignaturesRef = useRef<Set<string>>(new Set());

  const [open, setOpen] = useState(false);
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(null);
  const [draftIqmg, setDraftIqmg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleId = useId();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  const status = profile?.iqmg_status ?? null;
  const note = profile?.iqmg_note?.trim() || null;
  const currentNumber = profile?.iqmg_number?.trim() || null;

  const signature = useMemo(() => {
    const hasNotice = status === 'correction_required' || Boolean(note);
    if (!userId || !hasNotice) return null;
    return `${status || ''}:${currentNumber || ''}:${note || ''}:${profile?.iqmg_updated_at || ''}`;
  }, [userId, status, currentNumber, note, profile?.iqmg_updated_at]);

  useEffect(() => {
    resolvedSignaturesRef.current.clear();
    setDismissedSignature(null);
    setOpen(false);
    setError(null);
  }, [userId]);

  useEffect(() => {
    if (!userId || !signature) {
      setOpen(false);
      return;
    }
    const persisted = readAck(userId);
    if (
      persisted === signature ||
      dismissedSignature === signature ||
      resolvedSignaturesRef.current.has(signature)
    ) {
      return;
    }
    setDraftIqmg(status === 'correction_required' ? '' : currentNumber || '');
    setError(null);
    setOpen(true);
  }, [userId, signature, status, currentNumber, dismissedSignature]);

  useEffect(() => {
    if (!userId) return;
    const handleManualOpen = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail && detail !== userId) return;
      setDraftIqmg(status === 'correction_required' ? '' : currentNumber || '');
      setError(null);
      setOpen(true);
    };
    window.addEventListener('rico-open-iqmg-popup', handleManualOpen);
    return () => window.removeEventListener('rico-open-iqmg-popup', handleManualOpen);
  }, [userId, status, currentNumber]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
      return;
    }

    if (typeof dialog.close === 'function') {
      if (dialog.open) dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    dialog.returnValue = '';
  }, [open]);

  const dismiss = useCallback(() => {
    if (busy) return;
    if (userId && signature) {
      resolvedSignaturesRef.current.add(signature);
      writeAck(userId, signature);
      setDismissedSignature(signature);
    }
    const dialog = dialogRef.current;
    if (dialog) dialog.returnValue = '';
    setOpen(false);
  }, [busy, userId, signature]);

  const handleSubmitCorrection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const normalized = draftIqmg.trim().toUpperCase();
    const keyLength = normalized.replace(/[^A-Z0-9]/g, '').length;
    if (!normalized || !IQMG_ALLOWED_PATTERN.test(normalized) || keyLength < 3 || keyLength > 40) {
      setError('Enter the valid IQMG number printed on your college ID (3–40 letters or digits).');
      inputRef.current?.focus();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const saved = await claimCollegeIdentity(normalized);
      const nextSig = `${saved?.status || 'pending'}:${saved?.iqmg_number || normalized}:${saved?.note || ''}:${saved?.updated_at || ''}`;
      if (signature) resolvedSignaturesRef.current.add(signature);
      resolvedSignaturesRef.current.add(nextSig);
      if (userId) {
        writeAck(userId, nextSig);
        setDismissedSignature(signature || nextSig);
      }
      await onSaved();
      toast.success('College IQMG number updated!');
      const dialog = dialogRef.current;
      if (dialog) dialog.returnValue = '';
      setOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : 'Unable to save IQMG number right now.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  if (!open || !userId || !profile) return null;

  const isCorrection = status === 'correction_required';
  const isVerified = status === 'verified';
  const heading = isCorrection
    ? 'Action needed: Update your IQMG number'
    : isVerified
      ? 'College IQMG verified'
      : 'Your college IQMG was updated';

  return (
    <dialog
      ref={dialogRef}
      className="sd-iqmg-dialog"
      aria-labelledby={titleId}
      {...({ closedby: busy ? 'none' : 'any' } as Record<string, string>)}
      onCancel={event => {
        event.preventDefault();
        dismiss();
      }}
      onPointerDown={event => {
        const dialog = dialogRef.current;
        if (!dialog || busy) {
          pressedOutsideRef.current = false;
          return;
        }
        pressedOutsideRef.current = pointerOutsideDialog(event, dialog);
      }}
      onPointerUp={event => {
        const dialog = dialogRef.current;
        if (pressedOutsideRef.current && dialog && !busy && pointerOutsideDialog(event, dialog)) {
          dismiss();
        }
        pressedOutsideRef.current = false;
      }}
    >
      <div className="sd-iqmg-dialog-body">
        <div className="sd-iqmg-dialog-header">
          <span className={`sd-iqmg-badge${isCorrection ? ' is-warning' : isVerified ? ' is-verified' : ''}`}>
            {isCorrection ? (
              <AlertTriangle size={14} aria-hidden="true" />
            ) : isVerified ? (
              <BadgeCheck size={14} aria-hidden="true" />
            ) : (
              <CreditCard size={14} aria-hidden="true" />
            )}
            <span>{isCorrection ? 'Correction required' : isVerified ? 'Official roster' : 'IQMG update'}</span>
          </span>
          <button
            type="button"
            className="sd-icon-button"
            aria-label="Close IQMG popup"
            disabled={busy}
            onClick={dismiss}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <h1 id={titleId}>{heading}</h1>

        {note && (
          <p className={`sd-iqmg-note${isCorrection ? ' is-warning' : ''}`}>
            {note}
          </p>
        )}

        {currentNumber && !isCorrection && (
          <div className="sd-iqmg-current">
            <span>Current college IQMG on profile</span>
            <strong>{currentNumber}</strong>
          </div>
        )}

        {isVerified ? (
          <div className="sd-iqmg-actions">
            <button type="button" className="sd-button" autoFocus onClick={dismiss}>
              Got it
            </button>
          </div>
        ) : (
          <form className="sd-iqmg-form" onSubmit={event => void handleSubmitCorrection(event)} noValidate>
            <div className="sd-iqmg-field">
              <label htmlFor={inputId}>
                {isCorrection ? 'Enter corrected IQMG number' : 'College IQMG number'} <span aria-hidden="true">*</span>
              </label>
              <p id={hintId} className="sd-iqmg-hint">
                {isCorrection
                  ? 'Type the exact IQMG number printed on your college ID card (e.g. IQMG6738).'
                  : 'Keep this updated number, or enter your correct IQMG number (e.g. IQMG6738) if anything still looks wrong.'}
              </p>
              <input
                ref={inputRef}
                id={inputId}
                name="iqmg_number"
                type="text"
                required
                autoFocus
                maxLength={50}
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={draftIqmg}
                disabled={busy}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${hintId} ${errorId}` : hintId}
                placeholder="e.g. IQMG6738"
                onChange={event => {
                  setDraftIqmg(event.target.value.toUpperCase());
                  if (error) setError(null);
                }}
              />
            </div>

            {error && (
              <p id={errorId} className="sd-iqmg-error" role="alert">
                {error}
              </p>
            )}

            <div className="sd-iqmg-actions">
              <button type="button" className="sd-button sd-button-secondary" disabled={busy} onClick={dismiss}>
                {isCorrection ? 'Update later' : 'Keep & dismiss'}
              </button>
              <button type="submit" className="sd-button" disabled={busy}>
                {busy ? 'Saving…' : isCorrection ? 'Save corrected IQMG' : 'Update IQMG'}
              </button>
            </div>

            <Link to="/dashboard/messages?type=technical" className="sd-iqmg-help" onClick={dismiss}>
              IQMG issue or duplicate? Contact Technical Help
            </Link>
          </form>
        )}
      </div>
    </dialog>
  );
};
