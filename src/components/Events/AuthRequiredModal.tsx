import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightIcon, Cross2Icon, PersonIcon } from '@radix-ui/react-icons';
import { useFestivalDialog } from '../../hooks/useFestivalDialog';

interface Props { isOpen: boolean; onClose: () => void; onConfirm: () => void; eventTitle: string }
export const AuthRequiredModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, eventTitle }) => {
  const titleId = useId();
  const dialogRef = useFestivalDialog(isOpen, onClose);
  if (!isOpen) return null;
  return createPortal(<div className="arena-dialog-layer arena-auth-layer"><div className="arena-dialog-backdrop" onClick={onClose} /><div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="arena-dialog arena-auth-dialog"><div className="arena-web-corner" aria-hidden="true" /><button type="button" className="arena-close" aria-label="Close sign in prompt" onClick={onClose}><Cross2Icon /></button><span className="arena-auth-emblem"><PersonIcon /></span><p className="arena-eyebrow">YOUR PASS TO THE ARENA</p><h2 id={titleId}>Make your entry.</h2><p>Sign in or create your student account to register for <strong>{eventTitle}</strong>.</p><button type="button" className="arena-gold-button" onClick={onConfirm}>Sign up / Log in <ArrowRightIcon /></button><button type="button" className="arena-text-button" onClick={onClose}>Back to the event</button><small>Your entry and payment status will appear in your dashboard.</small></div></div>, document.body);
};
