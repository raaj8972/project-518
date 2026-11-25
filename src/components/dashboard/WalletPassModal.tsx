import { useEffect, useRef } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';
import EntryPass, { type StudentEntryPass } from './EntryPass';

export default function WalletPassModal({ pass, onClose }: { pass: StudentEntryPass; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className="sd-pass-modal" aria-label="Your festival entry pass" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="sd-pass-modal-heading">
      <span>YOUR DIGITAL PASS</span>
      <button className="sd-icon-button" aria-label="Close entry pass" onClick={onClose}>
        <Cross2Icon />
      </button>
    </div>
    <EntryPass pass={pass} />
  </dialog>;
}
