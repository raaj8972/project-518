import { Link } from 'react-router-dom';
import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import type { HomepageDraft, HomepageDraftSetter } from './homepageForm';
import { StudioDirection, StudioField, StudioGroup, StudioRange } from './StudioControls';

export function PartnersSectionSettings({ form, setForm }: { form: HomepageDraft; setForm: HomepageDraftSetter }) {
  return <>
    <div className="studio-auto-notice"><strong>Partners are managed in Sponsors</strong><p>Add and edit each sponsor once there. Choose Previous or Current, switch on Show on homepage and control the section’s visibility there. This section automatically displays that selection; the controls below only change its appearance.</p><Link className="studio-resource-link" to="/admin/sponsors">Manage previous & current sponsors<ArrowTopRightIcon /></Link></div>
    <StudioGroup>
      <StudioField label="Partner section title" value={form.sponsor_section_title || ''} onChange={value => setForm(previous => ({ ...previous, sponsor_section_title: value }))} placeholder="Our partners" />
      <StudioField label="Partner section subtitle" value={form.sponsor_section_subtitle || ''} onChange={value => setForm(previous => ({ ...previous, sponsor_section_subtitle: value }))} multiline />
    </StudioGroup>
    <StudioGroup title="Logo strip movement">
      <StudioRange label="Scroll speed" min={20} max={60} value={Math.min(60, Math.max(20, Number(form.sponsors_belt_speed_px_per_sec) || 44))} unit=" px/s" onChange={value => setForm(previous => ({ ...previous, sponsors_belt_speed_px_per_sec: value }))} />
      <StudioDirection value={form.sponsors_belt_direction} onChange={value => setForm(previous => ({ ...previous, sponsors_belt_direction: value }))} />
    </StudioGroup>

  </>;
}
