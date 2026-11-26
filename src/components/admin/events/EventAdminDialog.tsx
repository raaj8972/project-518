import { createPortal } from 'react-dom';
import { useId, type ReactNode } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';
import { useFestivalDialog } from '../../../hooks/useFestivalDialog';

export function EventAdminDialog({ title, eyebrow = 'Events workspace', description, onClose, busy = false, wide = false, children, footer }: {
  title: string; eyebrow?: string; description?: string; onClose: () => void; busy?: boolean; wide?: boolean; children: ReactNode; footer?: ReactNode;
}) {
  const id = useId();
  const ref = useFestivalDialog(true, () => { if (!busy) onClose(); });
  return createPortal(<div className="event-admin-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={ref} className={`event-admin-dialog${wide ? ' event-admin-dialog--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id} aria-describedby={description ? `${id}-description` : undefined} tabIndex={-1} data-lenis-prevent>
      <header className="event-admin-dialog__header"><div><p>{eyebrow}</p><h2 id={id}>{title}</h2>{description && <span id={`${id}-description`}>{description}</span>}</div><button type="button" className="event-admin-icon" aria-label="Close dialog" disabled={busy} onClick={onClose}><Cross2Icon /></button></header>
      {children}
      {footer && <footer className="event-admin-dialog__footer">{footer}</footer>}
    </div>
  </div>, document.body);
}
