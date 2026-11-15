import { resolveHomepageMedia } from '../../../utils/homepageMedia';
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { DesktopIcon, MobileIcon } from '@radix-ui/react-icons';
import { ImageUpload } from '../../ImageUpload';
import type { HeroMediaV2 } from '../../../services/heroMediaService';
import { StudioField, StudioGroup, StudioRange, StudioToggle } from './StudioControls';
interface Props { pageKey?: string; media: HeroMediaV2; setMedia: Dispatch<SetStateAction<HeroMediaV2>>; onProcessingChange: (busy: boolean) => void; }
function DeviceMedia({ mobile, media, setMedia, onBusy, pageKey = 'home' }: Omit<Props,'onProcessingChange'> & { mobile: boolean; onBusy: (key: string, busy: boolean) => void }) {
  const prefix = mobile ? 'mobile_' : '';
  const isVideo = media.background_type !== 'image';
  const assetKey = `${prefix}${isVideo ? 'video_url' : 'image_url'}` as keyof HeroMediaV2;
  const posterKey = `${prefix}poster_url` as keyof HeroMediaV2;
  const label = mobile ? 'Mobile' : 'Laptop / desktop';
  const current = resolveHomepageMedia(media, mobile);
  const inherited = current.kind === (isVideo ? 'video' : 'image') && !media[assetKey];
  const assetBusy = useCallback((busy: boolean) => onBusy(`${prefix}asset`, busy), [onBusy,prefix]);
  const posterBusy = useCallback((busy: boolean) => onBusy(`${prefix}poster`, busy), [onBusy,prefix]);
  return <section className="studio-device-card"><header>{mobile ? <MobileIcon /> : <DesktopIcon />}<div><h3>{label}</h3><p>{mobile ? 'Portrait · 9:16 recommended' : 'Landscape · 16:9 recommended'}</p></div></header>
    <div className="studio-field"><span className="studio-field-label">{label} {isVideo ? 'background video' : 'background image'}</span><ImageUpload key={assetKey} previewFallback={inherited ? current.src : undefined} currentImage={String(media[assetKey] || '')} onImageSelect={url => setMedia(previous => ({ ...previous, [assetKey]: url }))} bucket="hero_v2" folder={`${pageKey}/${mobile ? 'mobile' : 'desktop'}`} acceptedTypes={isVideo ? 'video/mp4,video/webm,video/quicktime' : 'image/*'} fileTypeLabel={isVideo ? 'MP4, WebM or MOV · muted looping background' : 'JPG, PNG or WebP'} enableCropper={!isVideo} preserveExistingMedia autoSave onProcessingChange={assetBusy} /></div>
    {inherited && <p className="studio-empty-note" data-media-source={current.origin}>{current.origin === 'default' ? 'Currently playing: existing website video' : 'Currently using the saved laptop media on mobile'}<br /><a href={current.src} target="_blank" rel="noreferrer">Open current {current.kind}</a> · Upload above to replace it.</p>}
    <StudioField label={`${label} ${isVideo ? 'video' : 'image'} URL`} type="url" value={String(media[assetKey] || '')} onChange={url => setMedia(previous => ({ ...previous, [assetKey]: url }))} placeholder="https://…" hint={inherited ? `Current source: ${current.src}. Paste a new hosted URL here to replace it.` : "Upload a file above or paste a hosted media URL."} />
    {isVideo && <details className="studio-advanced"><summary>Loading poster & crop</summary><StudioGroup><div className="studio-field"><span className="studio-field-label">{label} loading poster</span><ImageUpload currentImage={String(media[posterKey] || '')} onImageSelect={url => setMedia(previous => ({ ...previous, [posterKey]: url }))} bucket="hero_v2" folder={`${pageKey}/${mobile ? 'mobile' : 'desktop'}/posters`} acceptedTypes="image/*" preserveExistingMedia autoSave onProcessingChange={posterBusy} /></div><StudioField label={`${label} poster URL`} type="url" value={String(media[posterKey] || '')} onChange={url => setMedia(previous => ({ ...previous, [posterKey]: url }))} />
    <StudioRange label={`${label} zoom`} min={.25} max={3} step={.05} value={Number(media[mobile ? 'mobile_zoom' : 'desktop_zoom']) || 1} onChange={value => setMedia(previous => ({ ...previous, [mobile ? 'mobile_zoom' : 'desktop_zoom']: value }))} />
    {(['x','y'] as const).map(axis => { const key = `${mobile ? 'mobile' : 'desktop'}_offset_${axis}` as keyof HeroMediaV2; return <StudioRange key={axis} label={`${label} ${axis === 'x' ? 'horizontal' : 'vertical'} crop`} min={-50} max={50} value={Math.round(Number(media[key]) * 100) || 0} unit="%" onChange={value => setMedia(previous => ({ ...previous, [key]: value / 100 }))} />; })}</StudioGroup></details>}
  </section>;
}
export function HomepageMediaEditor({ media, setMedia, onProcessingChange, pageKey = 'home' }: Props) {
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const onBusy = useCallback((key: string, busy: boolean) => setBusyKeys(previous => { if (previous.has(key) === busy) return previous; const next = new Set(previous); if (busy) next.add(key); else next.delete(key); return next; }), []);
  // Keep the parent save action locked for every active upload, including poster uploads.
  // The callback is stable and the child remains mounted while editing this section.
  const busy = busyKeys.size > 0;
  useEffectReport(busy, onProcessingChange);
  return <>{!media.video_url && !media.mobile_video_url && !media.image_url && !media.mobile_image_url && <div className="studio-auto-notice"><strong>Existing website video is playing</strong><p>Both device previews below show the video currently used by the website. Upload separate laptop and mobile videos to replace it.</p></div>}<StudioGroup><StudioToggle label="Show hero background" description="Text stays visible when the background is switched off." checked={media.enabled} onChange={enabled => setMedia(previous => ({ ...previous, enabled }))} /><div className="studio-choice" role="group" aria-label="Hero background format">{(['video','image'] as const).map(type => <button type="button" disabled={busy} aria-pressed={type === 'video' ? media.background_type !== 'image' : media.background_type === type} key={type} onClick={() => setMedia(previous => ({ ...previous, background_type: type }))}>{type === 'video' ? 'Background video' : 'Background image'}</button>)}</div><p className="studio-empty-note">Add separate assets for phones and laptops. Replacing one will keep the other device’s media unchanged.</p></StudioGroup><div className="studio-device-grid"><DeviceMedia pageKey={pageKey} mobile={false} media={media} setMedia={setMedia} onBusy={onBusy} /><DeviceMedia pageKey={pageKey} mobile media={media} setMedia={setMedia} onBusy={onBusy} /></div><StudioGroup><StudioRange label="Background shading" value={Math.round(media.overlay_opacity * 100)} min={0} max={90} unit="%" onChange={value => setMedia(previous => ({ ...previous, overlay_opacity: value / 100 }))} /></StudioGroup></>;
}
function useEffectReport(busy: boolean, report: (busy: boolean) => void) { useEffect(() => { report(busy); return () => report(false); }, [busy, report]); }
