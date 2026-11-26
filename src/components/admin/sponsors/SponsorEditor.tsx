import { useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Cross2Icon, ImageIcon, ArrowTopRightIcon } from '@radix-ui/react-icons';
import { useFestivalDialog } from '../../../hooks/useFestivalDialog';
import { ImageUpload } from '../../ImageUpload';
import { InlineDescriptionAI } from '../InlineDescriptionAI';
import { safeSponsorLink } from '../../../utils/sponsorPresentation';

export function SponsorLogo({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState('');
  return <div className="partner-logo">{src && failed !== src ? <img src={src} alt={name} loading="lazy" onError={() => setFailed(src)} /> : <span title={src ? 'Logo could not load' : 'No logo added'}><ImageIcon /><small>{name.slice(0, 2).toUpperCase()}</small></span>}</div>;
}

export function SponsorDialog({ title, description, children, footer, onClose, busy = false }: { title: string; description?: string; children: ReactNode; footer?: ReactNode; onClose: () => void; busy?: boolean }) {
  const id = useId();
  const ref = useFestivalDialog(true, () => { if (!busy) onClose(); });
  return createPortal(<div className="partner-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="partner-dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} aria-describedby={description ? `${id}-description` : undefined} tabIndex={-1} data-lenis-prevent>
      <header><div><span className="partner-eyebrow">PARTNERS / RICORRENZA</span><h2 id={id}>{title}</h2>{description && <p id={`${id}-description`}>{description}</p>}</div><button className="partner-icon" type="button" aria-label="Close sponsor panel" disabled={busy} onClick={onClose}><Cross2Icon /></button></header>
      <div className="partner-dialog-body">{children}</div>{footer && <footer>{footer}</footer>}
    </div>
  </div>, document.body);
}

export type SponsorDraft = { name: string; category: string; logo: string; description: string; website: string; featured: boolean; order_position: number };
export function SponsorEditor({ form, onChange, categories, edition, onEditionChange, locked, busy, uploading, onUploading, error, editing, onClose, onSave }: {
  form: SponsorDraft; onChange: (draft: SponsorDraft) => void; categories: string[]; edition: 'current' | 'previous'; onEditionChange: (value: 'current' | 'previous') => void; locked: boolean; busy: boolean; uploading: boolean; onUploading: (value: boolean) => void; error: string; editing: boolean; onClose: () => void; onSave: () => void;
}) {
  const id = useId();
  const link = safeSponsorLink(form.website);
  return <SponsorDialog title={editing ? 'Edit sponsor' : 'Add a sponsor'} description="Save the details once. Use the same logo on Sponsors and Home." onClose={onClose} busy={busy || uploading}
    footer={<><span className="partner-save-note">{uploading ? 'Finishing logo upload…' : 'Name, tier and logo are required.'}</span><button className="partner-button" type="button" disabled={busy || uploading} onClick={onClose}>Cancel</button><button className="partner-button partner-button-primary" type="submit" form={`${id}-form`} disabled={locked || busy || uploading}>{busy ? 'Saving sponsor…' : uploading ? 'Uploading logo…' : editing ? 'Save Changes' : 'Add Sponsor'}</button></>}>
    <form id={`${id}-form`} className="partner-editor" onSubmit={event => { event.preventDefault(); onSave(); }}>
      <div className="partner-editor-fields">
        <label htmlFor={`${id}-name`}>Sponsor name <span>*</span><input id={`${id}-name`} required maxLength={160} value={form.name} onChange={event => onChange({ ...form, name: event.target.value })} placeholder="Company or organization name" /></label>
        <div className="partner-field-pair"><label htmlFor={`${id}-tier`}>Sponsorship tier <span>*</span><select id={`${id}-tier`} required value={form.category} onChange={event => onChange({ ...form, category: event.target.value })}><option value="">Select a tier</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label htmlFor={`${id}-order`}>Display order<input id={`${id}-order`} type="number" min="1" step="1" required value={form.order_position} onChange={event => onChange({ ...form, order_position: Number(event.target.value) })} /></label></div>
        {!editing && <label>New sponsor edition<select aria-label="New sponsor edition" value={edition} onChange={event => onEditionChange(event.target.value as 'current' | 'previous')} disabled={locked}><option value="current">Current partner</option><option value="previous">Previous partner</option></select><small>You can change the edition under Display settings later.</small></label>}
        <label htmlFor={`${id}-website`}>Website<input id={`${id}-website`} value={form.website} onChange={event => onChange({ ...form, website: event.target.value })} placeholder="https://brand.com" /><small>Optional. Add the brand’s official website.</small></label>
        <div><div className="partner-description-label"><label htmlFor={`${id}-description`}>About the sponsor</label><InlineDescriptionAI contextName={form.name} contextType="sponsor" onDescriptionGenerated={description => onChange({ ...form, description })} /></div><textarea id={`${id}-description`} rows={4} maxLength={3000} value={form.description} onChange={event => onChange({ ...form, description: event.target.value })} placeholder="A short introduction to this partner" /></div>
        <label className="partner-check"><input type="checkbox" checked={form.featured} onChange={event => onChange({ ...form, featured: event.target.checked })} />Show on homepage</label>
      </div>
      <aside className="partner-editor-preview"><label>Sponsor logo <span>*</span></label><ImageUpload currentImage={form.logo} onImageSelect={logo => onChange({ ...form, logo })} bucket="sponsor-logos" folder="sponsors" preserveExistingMedia onProcessingChange={onUploading} />
        <span className="partner-eyebrow">LOGO PREVIEW</span><div className="partner-preview-brand"><SponsorLogo src={form.logo} name={form.name || 'Sponsor'} /><strong>{form.name || 'Your partner’s name'}</strong><small>{form.category || 'Sponsorship tier'}</small>{link && <a href={link} target="_blank" rel="noopener noreferrer">Visit website <ArrowTopRightIcon /></a>}</div>
      </aside>
      {error && <p className="partner-feedback partner-feedback-error" role="alert">{error}</p>}
    </form>
  </SponsorDialog>;
}
