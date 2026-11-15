import { ChevronDownIcon } from '@radix-ui/react-icons';
import { ImageUpload } from '../../ImageUpload';
import type { HomepageDraft, HomepageDraftSetter } from './homepageForm';
import { StudioField, StudioGroup, StudioRange } from './StudioControls';

export function BrandingSettings({ form, setForm, onProcessingChange }: { form: HomepageDraft; setForm: HomepageDraftSetter; onProcessingChange?: (busy: boolean) => void }) {
  return <>
    <StudioGroup title="Your festival identity" description="Your logo and edition, across the website.">
      <StudioField label="Festival year" type="number" value={form.brand_year ?? ''} min={2000} max={2999} onChange={value => setForm(previous => ({ ...previous, brand_year: value === '' ? '' : Number(value) }))} />
      <div className="studio-field"><span className="studio-field-label">Brand logo</span><div className="studio-logo-upload"><ImageUpload currentImage={form.brand_logo_url} onImageSelect={url => setForm(previous => ({ ...previous, brand_logo_url: url }))} bucket="hero-media" folder="brand" acceptedTypes="image/png,image/webp,image/jpeg" fileTypeLabel="PNG, JPG or WebP · up to 5 MB" enableCropper={false} autoSave preserveExistingMedia onProcessingChange={onProcessingChange} /></div><p>A transparent PNG looks best on both light and dark backgrounds.</p>{form.brand_logo_url && <button type="button" className="studio-text-button" onClick={() => setForm(previous => ({ ...previous, brand_logo_url: '' }))}>Remove logo from draft</button>}</div>
      <StudioRange label="Logo size" value={Number(form.brand_logo_size_px ?? 36)} min={16} max={256} unit=" px" onChange={value => setForm(previous => ({ ...previous, brand_logo_size_px: value }))} />
    </StudioGroup>
    <details className="studio-advanced"><summary>Position & effects<ChevronDownIcon /></summary><StudioGroup>
      <div className="studio-field"><label htmlFor="studio-logo-side">Logo position</label><select id="studio-logo-side" value={form.brand_logo_side || 'left'} onChange={event => setForm(previous => ({ ...previous, brand_logo_side: event.target.value as 'left' | 'right' }))}><option value="left">Before festival name</option><option value="right">After festival name</option></select></div>
      <StudioRange label="Horizontal offset" value={Number(form.brand_logo_offset_x_px ?? 0)} min={-200} max={200} unit=" px" onChange={value => setForm(previous => ({ ...previous, brand_logo_offset_x_px: value }))} />
      <StudioRange label="Vertical offset" value={Number(form.brand_logo_offset_y_px ?? 0)} min={-200} max={200} unit=" px" onChange={value => setForm(previous => ({ ...previous, brand_logo_offset_y_px: value }))} />
      <StudioRange label="Logo glow" value={Number(form.brand_logo_glow_strength ?? 1)} min={0} max={2} step={.1} onChange={value => setForm(previous => ({ ...previous, brand_logo_glow_strength: value }))} />
      <div className="studio-field studio-color"><label htmlFor="studio-logo-color">Glow color</label><div><input id="studio-logo-color" type="color" value={form.brand_logo_glow_color || '#ff00ff'} onChange={event => setForm(previous => ({ ...previous, brand_logo_glow_color: event.target.value }))} /><span>{form.brand_logo_glow_color}</span></div></div>
    </StudioGroup></details>
    <details className="studio-advanced"><summary>Responsive adjustments<ChevronDownIcon /></summary><StudioGroup description="Leave an override empty to use the default position.">{(['sm', 'md', 'lg'] as const).map(size => <div className="studio-responsive-row" key={size}><strong>{size === 'sm' ? 'Mobile' : size === 'md' ? 'Tablet' : 'Desktop'}</strong><div className="studio-two-fields">{(['x', 'y'] as const).map(axis => { const key = `brand_logo_offset_${axis}_${size}_px` as keyof HomepageDraft; return <StudioField key={axis} label={`${size === 'sm' ? 'Mobile' : size === 'md' ? 'Tablet' : 'Desktop'} offset ${axis.toUpperCase()}`} value={form[key] as number | '' ?? ''} type="number" placeholder="Default" onChange={value => setForm(previous => ({ ...previous, [key]: value === '' ? '' : Number(value) }))} />; })}</div></div>)}</StudioGroup></details>
  </>;
}
