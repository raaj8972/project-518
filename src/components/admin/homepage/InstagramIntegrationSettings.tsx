import type { HomepageDraft, HomepageDraftSetter } from './homepageForm';
import { StudioField, StudioGroup, StudioToggle } from './StudioControls';

export function InstagramIntegrationSettings({ form, setForm }: { form: HomepageDraft; setForm: HomepageDraftSetter }) {
  return <>{(['trailer', 'aftermovie'] as const).map(kind => {
    const enabled = form[`instagram_${kind}_enabled`] ?? false;
    return <StudioGroup key={kind}>
      <StudioToggle label={kind === 'trailer' ? 'Festival trailer' : 'Festival aftermovie'} description={kind === 'trailer' ? 'Build anticipation with your latest reel.' : 'Keep the memories on your homepage.'} checked={enabled} onChange={value => setForm(previous => ({ ...previous, [`instagram_${kind}_enabled`]: value }))} />
      <div className={`studio-dependent-fields${enabled ? '' : ' is-muted'}`}>
        <StudioField label={kind === 'trailer' ? 'Trailer Instagram URL' : 'Aftermovie Instagram URL'} type="url" value={form[`instagram_${kind}_url`] || ''} onChange={value => setForm(previous => ({ ...previous, [`instagram_${kind}_url`]: value }))} placeholder="https://www.instagram.com/reel/…" hint="Use the public link to your Instagram reel or post." />
        <StudioField label={kind === 'trailer' ? 'Trailer title' : 'Aftermovie title'} value={form[`instagram_${kind}_title`] || ''} onChange={value => setForm(previous => ({ ...previous, [`instagram_${kind}_title`]: value }))} />
        <StudioField label={kind === 'trailer' ? 'Trailer subtitle' : 'Aftermovie subtitle'} value={form[`instagram_${kind}_subtitle`] || ''} onChange={value => setForm(previous => ({ ...previous, [`instagram_${kind}_subtitle`]: value }))} />
      </div>
    </StudioGroup>;
  })}</>;
}
