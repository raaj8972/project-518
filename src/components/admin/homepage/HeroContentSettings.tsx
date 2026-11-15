import type { HomepageDraft, HomepageDraftSetter } from './homepageForm';
import { StudioField, StudioGroup } from './StudioControls';

export function HeroContentSettings({ form, setForm }: { form: HomepageDraft; setForm: HomepageDraftSetter }) {
  return <StudioGroup>
    <StudioField label="Festival title" value={form.hero_title} onChange={value => setForm(previous => ({ ...previous, hero_title: value }))} placeholder="RICORRENZA" required count hint="The first thing visitors see on your homepage." />
    <StudioField label="Tagline" value={form.hero_subtitle} onChange={value => setForm(previous => ({ ...previous, hero_subtitle: value }))} placeholder="Your campus. Your stage." count hint="One short line that sets the mood." />
    <StudioField label="Introduction" value={form.hero_description} onChange={value => setForm(previous => ({ ...previous, hero_description: value }))} multiline count placeholder="Tell visitors what the festival is about." hint="A little context before visitors explore your events." />
  </StudioGroup>;
}
