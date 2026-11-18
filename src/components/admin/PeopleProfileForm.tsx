import { ImageUpload } from '../ImageUpload';
import type { ProfileCropKind } from '../../utils/imageCrop';
import '../../styles/PeopleEditor.css';

export interface PeopleProfileDraft { name: string; image: string; instagram: string; phone: string; batch: string; facebook?: string; title?: string; committee_id?: number | null; }
export function PeopleProfileForm({ kind, form, onChange, departments = [], onProcessingChange }: {
  kind: ProfileCropKind; form: PeopleProfileDraft; onChange: (patch: Partial<PeopleProfileDraft>) => void;
  departments?: { id: number; name: string }[]; onProcessingChange: (busy: boolean) => void;
}) {
  const faculty = kind === 'faculty';
  const prefix = faculty ? 'faculty-person' : 'family-person';
  return <div className="people-editor-layout">
    <aside className="people-photo-panel"><span className="people-section-label">Profile photo</span><p>Choose a clear portrait, then adjust the crop.</p>
      <ImageUpload className="people-upload" currentImage={form.image} onImageSelect={image => onChange({ image })} bucket={faculty ? 'faculty-images' : 'team-images'} folder={faculty ? 'faculty' : 'team'} profileCrop={kind} preserveExistingMedia onProcessingChange={onProcessingChange} />
    </aside>
    <div className="people-form-fields">
      <section className="people-form-section"><h3>Profile details</h3><div className="people-field"><label htmlFor={`${prefix}-name`}>Name *</label><input id={`${prefix}-name`} value={form.name} onChange={event => onChange({ name: event.target.value })} autoComplete="name" placeholder={faculty ? 'Name with title' : 'Full name'} maxLength={120} /></div>
        {faculty ? <div className="people-field"><label htmlFor={`${prefix}-title`}>Position</label><input id={`${prefix}-title`} value={form.title || ''} onChange={event => onChange({ title: event.target.value })} placeholder="Festival convenor" maxLength={120} /></div>
          : <div className="people-field"><label htmlFor="family-person-committee">{kind === 'council' ? 'Department (optional)' : 'Department *'}</label><select id="family-person-committee" value={form.committee_id || ''} onChange={event => onChange({ committee_id: Number(event.target.value) || null })}><option value="">Choose a department</option>{departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>}
        <div className="people-field"><label htmlFor={`${prefix}-batch`}>Batch <span>optional</span></label><input id={`${prefix}-batch`} value={form.batch || ''} onChange={event => onChange({ batch: event.target.value })} placeholder="2023–2028" maxLength={40} /></div>
      </section>
      <section className="people-form-section"><h3>Contact & social</h3>
        <div className="people-field"><label htmlFor={`${prefix}-phone`}>Phone <span>optional</span></label><input id={`${prefix}-phone`} type="tel" autoComplete="tel" value={form.phone || ''} onChange={event => onChange({ phone: event.target.value })} placeholder="+91 followed by the phone number" maxLength={30} /><small>{kind === 'member' ? 'Contact number for this profile.' : 'A call button will appear on the public profile.'}</small></div>
        <div className="people-field"><label htmlFor={`${prefix}-instagram`}>Instagram <span>optional</span></label><input id={`${prefix}-instagram`} value={form.instagram || ''} onChange={event => onChange({ instagram: event.target.value })} placeholder="@handle or profile URL" autoCapitalize="none" spellCheck={false} /></div>
        {faculty && <div className="people-field"><label htmlFor="faculty-person-facebook">Facebook <span>optional</span></label><input id="faculty-person-facebook" value={form.facebook || ''} onChange={event => onChange({ facebook: event.target.value })} placeholder="Username or profile URL" autoCapitalize="none" spellCheck={false} /></div>}
      </section>
    </div>
  </div>;
}
