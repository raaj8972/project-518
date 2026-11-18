import { recordValue, textValue, finiteValue } from '../../../utils/studioData';
import type { Dispatch, SetStateAction } from 'react';
import { PlusIcon } from '@radix-ui/react-icons';
import { ImageUpload } from '../../ImageUpload';
import { StudioField, StudioToggle } from './StudioControls';

export interface LeadDraft { key: string; id?: number; kind: 'faculty' | 'head' | 'council'; name: string; image: string; role: string; description: string; instagram?: string; facebook?: string; phone?: string; batch?: string; enabled: boolean; committee_id: number | null; order_position: number; }
export type LeadEdits = Record<string, LeadDraft>;
export function normalizeLeadEdits(value: unknown): LeadEdits {
  return Object.fromEntries(Object.entries(recordValue(value)).flatMap(([key, candidate]) => {
    const row = recordValue(candidate);
    if (!['faculty','head','council'].includes(String(row.kind))) return [];
    const lead: LeadDraft = {key,kind:row.kind as LeadDraft['kind'],name:textValue(row.name),image:textValue(row.image),role:textValue(row.role),description:textValue(row.description),instagram:textValue(row.instagram),facebook:textValue(row.facebook),phone:textValue(row.phone),batch:textValue(row.batch),enabled:row.enabled !== false,committee_id:typeof row.committee_id === 'number' && Number.isFinite(row.committee_id) ? row.committee_id : null,order_position:finiteValue(row.order_position,0),...(typeof row.id === 'number' && Number.isFinite(row.id) ? {id:row.id} : {})};
    return [[key,lead]];
  }));
}
interface Props { leads: LeadDraft[]; edits: LeadEdits; setEdits: Dispatch<SetStateAction<LeadEdits>>; selected: string; onSelect: (key: string) => void; committees: { id: number; name: string }[]; onProcessingChange: (busy: boolean) => void; busy?: boolean; }
export function LeadEditor({ leads, edits, setEdits, selected, onSelect, committees, onProcessingChange, busy = false }: Props) {
  const all = [...leads.filter(lead => !edits[lead.key]), ...Object.values(edits)].sort((a,b) => a.order_position - b.order_position);
  const current = all.find(lead => lead.key === selected);
  const edit = (patch: Partial<LeadDraft>) => { if (current) setEdits(previous => ({ ...previous, [current.key]: { ...current, ...previous[current.key], ...patch } })); };
  const add = (kind: LeadDraft['kind']) => { const key = `new-${kind}-${crypto.randomUUID()}`; const lead: LeadDraft = { key, kind, name: '', image: '', role: '', description: '', instagram: '', phone: '', batch: '', enabled: true, committee_id: committees[0]?.id ?? null, order_position: all.length + 1 }; setEdits(previous => ({ ...previous, [key]: lead })); onSelect(key); };
  return <section className="studio-lead-editor">
    <div className="studio-subheading"><h3>Leadership profiles</h3><span>{all.length} profiles</span></div>
    <div className="studio-profile-grid">{all.map(lead => <button type="button" key={lead.key} disabled={busy} aria-pressed={current?.key === lead.key} onClick={() => onSelect(lead.key)}>{lead.image ? <img src={lead.image} alt="" /> : <span className="studio-profile-empty">{lead.name.charAt(0) || '+'}</span>}<span><strong>{lead.name || 'New profile'}</strong><small>{lead.kind === 'faculty' ? 'Faculty' : lead.kind === 'council' ? 'Council' : 'Committee head'} · {lead.enabled ? 'Shown' : 'Hidden'}</small></span>{edits[lead.key] && <i aria-label="Unsaved profile" />}</button>)}</div>
    <div className="studio-profile-actions">{(['faculty','head','council'] as const).map(kind => <button type="button" className="studio-button studio-button-secondary" key={kind} disabled={busy} onClick={() => add(kind)}><PlusIcon />{kind === 'faculty' ? 'Faculty' : kind === 'head' ? 'Head' : 'Council'}</button>)}</div>
    {!current ? <p className="studio-empty-note">Choose a profile to edit its details, or add a new lead.</p> : <div className="studio-field-group">
      <StudioField label="Lead name" value={current.name} required onChange={name => edit({ name })} />
      {current.kind === 'faculty' ? <StudioField label="Faculty title" value={current.role} onChange={role => edit({ role })} /> : <StudioField label="Instagram" value={current.instagram || ''} placeholder="@handle or Instagram profile URL" onChange={instagram => edit({ instagram })} />}
      {current.kind === 'faculty' && <><StudioField label="Instagram" value={current.instagram || ''} placeholder="@handle or Instagram profile URL" onChange={instagram => edit({ instagram })}/><StudioField label="Facebook" value={current.facebook || ''} placeholder="Facebook profile URL" onChange={facebook => edit({ facebook })}/></>}
      {current.kind !== 'faculty' && <div className="studio-field"><label htmlFor="studio-lead-committee">{current.kind === 'council' ? 'Department (optional)' : 'Department'}</label><select id="studio-lead-committee" value={current.committee_id ?? ''} onChange={event => edit({ committee_id: Number(event.target.value) || null })}><option value="">Choose a department</option>{committees.map(committee => <option key={committee.id} value={committee.id}>{committee.name}</option>)}</select></div>}
      <div className="studio-field"><span className="studio-field-label">Lead photo</span><ImageUpload currentImage={current.image} onImageSelect={image => edit({ image })} bucket={current.kind === 'faculty' ? 'faculty-images' : 'team-images'} folder="homepage-leads" acceptedTypes="image/*" profileCrop={current.kind === 'faculty' ? 'faculty' : current.kind === 'council' ? 'council' : 'head'} preserveExistingMedia autoSave onProcessingChange={onProcessingChange} /></div>
      <StudioField label="Phone" value={current.phone || ''} placeholder="Phone number with country code" onChange={phone => edit({ phone })} />
      <StudioField label="Batch" value={current.batch || ''} placeholder="2023–2028" onChange={batch => edit({ batch })} />
      <StudioToggle label="Show this profile" description="Visible profiles with a photo appear in leadership." checked={current.enabled} onChange={enabled => edit({ enabled })} />
    </div>}
  </section>;
}
