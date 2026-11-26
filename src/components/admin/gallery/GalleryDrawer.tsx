import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Cross2Icon } from '@radix-ui/react-icons';
import { useFestivalDialog } from '../../../hooks/useFestivalDialog';
export function GalleryDrawer({ title, description, children, footer, onClose, busy = false, wide = false }: { title: string; description?: string; children: ReactNode; footer?: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
  const id = useId(); const ref = useFestivalDialog(true, () => { if (!busy) onClose(); });
  return createPortal(<div className="gallery-drawer-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}><div className={`gallery-drawer${wide ? ' gallery-drawer--wide' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} aria-describedby={description ? `${id}-description` : undefined} tabIndex={-1} data-lenis-prevent><header><div><span>RICORRENZA / PHOTO LIBRARY</span><h2 id={id}>{title}</h2>{description && <p id={`${id}-description`}>{description}</p>}</div><button type="button" className="gallery-icon-button" aria-label="Close photo panel" disabled={busy} onClick={onClose}><Cross2Icon /></button></header><div className="gallery-drawer__body">{children}</div>{footer && <footer>{footer}</footer>}</div></div>, document.body);
}
