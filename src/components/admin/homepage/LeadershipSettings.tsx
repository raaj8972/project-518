import { Link } from 'react-router-dom';
import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import type { HomepageDraft, HomepageDraftSetter } from './homepageForm';
import { StudioDirection, StudioGroup, StudioRange, StudioToggle } from './StudioControls';

export function LeadershipSettings({ form, setForm }: { form: HomepageDraft; setForm: HomepageDraftSetter }) {
  return <>
    <StudioGroup title="People on your homepage" description="Choose which leadership groups visitors see.">
      <StudioToggle label="Faculty leadership" description="Show faculty profiles on the homepage." checked={form.show_faculty_heads} onChange={value => setForm(previous => ({ ...previous, show_faculty_heads: value }))} />
      <StudioToggle label="Committee heads" description="Show the people leading your festival teams." checked={form.show_committee_heads} onChange={value => setForm(previous => ({ ...previous, show_committee_heads: value }))} />
    </StudioGroup>
    <StudioGroup title="Movement & timing">
      <StudioRange label="Time between profiles" min={1000} max={10000} step={100} value={Number(form.leadership_carousel_speed_ms) || 2500} unit=" ms" onChange={value => setForm(previous => ({ ...previous, leadership_carousel_speed_ms: value }))} />
      <StudioRange label="Committee scroll speed" min={1} max={800} value={Number(form.committee_marquee_speed_px_per_sec) || 75} unit=" px/s" onChange={value => setForm(previous => ({ ...previous, committee_marquee_speed_px_per_sec: value }))} />
      <StudioDirection value={form.committee_marquee_direction} onChange={value => setForm(previous => ({ ...previous, committee_marquee_direction: value }))} />
    </StudioGroup>
    <Link to="/admin/rico-family" className="studio-resource-link"><span>Edit people & profiles<small>Names, photos and committee details</small></span><ArrowTopRightIcon /></Link>
  </>;
}
