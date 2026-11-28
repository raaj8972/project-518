import React, { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { CRStudentProfile } from '../../pages/CRDashboard';

export type CRIqmgActionMode = 'update' | 'correct';

export interface CRIqmgSubmitPayload {
  action: CRIqmgActionMode;
  iqmgNumber?: string;
  note: string;
}

interface CRIqmgModalProps {
  student: CRStudentProfile | null;
  saving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSubmit: (payload: CRIqmgSubmitPayload) => Promise<void>;
}

const IQMG_ALLOWED_PATTERN = /^[A-Z0-9 /_-]+$/;

function iqmgKeyLength(value: string): number {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').length;
}

export const CRIqmgModal: React.FC<CRIqmgModalProps> = ({
  student,
  saving,
  serverError,
  onClose,
  onSubmit,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const iqmgInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const [mode, setMode] = useState<CRIqmgActionMode>('update');
  const [iqmgNumber, setIqmgNumber] = useState('');
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const titleId = useId();
  const numberId = useId();
  const numberHintId = useId();
  const numberErrorId = useId();
  const noteId = useId();
  const noteHintId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (student) {
      setMode(student.iqmg_status === 'correction_required' && !student.iqmg_number ? 'correct' : 'update');
      setIqmgNumber(student.iqmg_number || '');
      setNote('');
      setValidationError(null);
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
  }, [student]);

  const activeError = validationError || serverError;

  const handleClose = () => {
    if (saving) return;
    const dialog = dialogRef.current;
    if (dialog) dialog.returnValue = '';
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!student || saving) return;

    const cleanNote = note.trim();
    if (mode === 'update') {
      const normalized = iqmgNumber.trim().toUpperCase();
      const keyLen = iqmgKeyLength(normalized);
      if (!normalized || !IQMG_ALLOWED_PATTERN.test(normalized) || keyLen < 3 || keyLen > 40) {
        setValidationError('Enter a valid IQMG number (3–40 letters or digits).');
        iqmgInputRef.current?.focus();
        return;
      }
      setValidationError(null);
      await onSubmit({ action: 'update', iqmgNumber: normalized, note: cleanNote });
      return;
    }

    setValidationError(null);
    await onSubmit({ action: 'correct', note: cleanNote });
  };

  const displayName = student?.full_name?.trim() || 'Unnamed student';
  const currentIqmgLabel = student?.iqmg_number?.trim()
    ? `Current: ${student.iqmg_number.trim()}`
    : student?.iqmg_status === 'correction_required'
      ? 'Current: Correction requested'
      : 'Current: No IQMG saved';

  return (
    <dialog
      ref={dialogRef}
      className="cr-dialog"
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault();
        handleClose();
      }}
    >
      {student && (
        <form className="cr-dialog-form" method="dialog" onSubmit={event => void handleSubmit(event)} noValidate>
          <div className="cr-dialog-header">
            <div>
              <p className="cr-dialog-eyebrow">College Identity Desk</p>
              <h1 id={titleId}>Edit or correct IQMG</h1>
            </div>
            <button
              type="button"
              className="cr-dialog-close"
              aria-label="Close IQMG dialog"
              disabled={saving}
              onClick={handleClose}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="cr-dialog-student-summary">
            <strong>{displayName}</strong>
            <small>{currentIqmgLabel}</small>
          </div>

          <fieldset className="cr-iqmg-mode-group">
            <legend>Action</legend>
            <label className={`cr-radio-option${mode === 'update' ? ' is-active' : ''}`}>
              <input
                type="radio"
                name="cr-iqmg-action"
                value="update"
                checked={mode === 'update'}
                disabled={saving}
                onChange={() => {
                  setMode('update');
                  setValidationError(null);
                }}
              />
              <span className="cr-radio-copy">
                <strong>Edit / save IQMG number</strong>
                <small>Update the student’s IQMG number and notify them with a profile popup.</small>
              </span>
            </label>

            <label className={`cr-radio-option${mode === 'correct' ? ' is-active' : ''}`}>
              <input
                type="radio"
                name="cr-iqmg-action"
                value="correct"
                checked={mode === 'correct'}
                disabled={saving}
                onChange={() => {
                  setMode('correct');
                  setValidationError(null);
                }}
              />
              <span className="cr-radio-copy">
                <strong>Request correction from student</strong>
                <small>Clear the invalid claim and prompt the student in their profile to re-enter it.</small>
              </span>
            </label>
          </fieldset>

          {mode === 'update' && (
            <div className="cr-dialog-field">
              <label htmlFor={numberId}>
                College IQMG number <span aria-hidden="true">*</span>
              </label>
              <p id={numberHintId} className="cr-field-hint">
                Format like IQMG6738 (3–40 letters or digits). Student receives an instant popup notice in their profile.
              </p>
              <input
                ref={iqmgInputRef}
                id={numberId}
                name="iqmg_number"
                type="text"
                required
                autoFocus
                maxLength={50}
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={iqmgNumber}
                disabled={saving}
                aria-invalid={Boolean(activeError)}
                aria-describedby={activeError ? `${numberHintId} ${numberErrorId}` : numberHintId}
                placeholder="e.g. IQMG6738"
                onChange={event => {
                  setIqmgNumber(event.target.value.toUpperCase());
                  if (validationError) setValidationError(null);
                }}
              />
            </div>
          )}

          <div className="cr-dialog-field">
            <label htmlFor={noteId}>
              {mode === 'update' ? 'Note for student (optional)' : 'Correction reason shown in student profile'}
            </label>
            <p id={noteHintId} className="cr-field-hint">
              {mode === 'update'
                ? 'Explains the edit inside the student’s profile popup and notification inbox.'
                : 'Leave blank to use a standard prompt asking for the exact college ID number.'}
            </p>
            <textarea
              ref={noteInputRef}
              id={noteId}
              name="iqmg_note"
              rows={2}
              maxLength={240}
              autoFocus={mode === 'correct'}
              value={note}
              disabled={saving}
              aria-describedby={noteHintId}
              placeholder={
                mode === 'update'
                  ? 'e.g. Corrected typo against batch attendance sheet'
                  : 'e.g. Entered roll number instead of IQMG number'
              }
              onChange={event => setNote(event.target.value)}
            />
          </div>

          {activeError && (
            <p id={numberErrorId} className="cr-dialog-error" role="alert">
              {activeError}
            </p>
          )}

          <div className="cr-dialog-actions">
            <button type="button" className="cr-icon-btn" disabled={saving} onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="cr-approve-btn" disabled={saving}>
              {saving
                ? 'Saving…'
                : mode === 'update'
                  ? 'Save IQMG number'
                  : 'Send correction popup'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
};
