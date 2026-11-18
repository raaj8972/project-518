import { useId } from 'react';
import Cropper from 'react-easy-crop';
import { CheckIcon, Cross2Icon, ResetIcon, RotateCounterClockwiseIcon } from '@radix-ui/react-icons';
import { useFestivalDialog } from '../hooks/useFestivalDialog';
import { ProfileCropPreview } from './ProfileCropPreview';
import { PROFILE_CROP_ASPECTS, type PixelCrop, type ProfileCropKind } from '../utils/imageCrop';
import '../styles/PeopleEditor.css';

interface Props {
  source: string; kind?: ProfileCropKind; aspect: number; onAspect: (value: number) => void;
  ratios: {label: string; value: number | undefined}[];
  crop: {x:number; y:number}; onCrop: (value: {x:number; y:number}) => void;
  zoom: number; onZoom: (value: number) => void; rotation: number; onRotation: (value: number) => void;
  selected: PixelCrop | null; onSelect: (value: PixelCrop) => void; busy: boolean; error: string;
  onClose: () => void; onSave: () => void; onOriginal: () => void; onReset: () => void;
}
export function ImageCropDialog(props: Props) {
  const { source, kind, aspect, ratios, crop, zoom, rotation, selected, busy } = props;
  const id = useId(), ref = useFestivalDialog(true, () => { if (!busy) props.onClose(); });
  return <div className="people-crop-overlay" onClick={event => { if (event.target === event.currentTarget && !busy) props.onClose(); }}>
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} className="people-crop-dialog">
      <header className="people-crop-header"><div><h3 id={`${id}-title`}>Adjust photo</h3><p>Drag to position. Zoom for a closer crop.</p></div><button type="button" aria-label="Close photo crop" className="people-crop-close" disabled={busy} onClick={props.onClose}><Cross2Icon /></button></header>
      <div className="people-crop-body">
        <div className="people-crop-canvas"><Cropper objectFit={kind ? 'horizontal-cover' : 'contain'} image={source} crop={crop} zoom={zoom} rotation={rotation} aspect={kind ? PROFILE_CROP_ASPECTS[kind] : aspect || undefined} onCropChange={props.onCrop} onZoomChange={props.onZoom} onRotationChange={props.onRotation} onCropComplete={(_, pixels) => props.onSelect(pixels)} onCropAreaChange={kind ? (_, pixels) => props.onSelect(pixels) : undefined} cropShape={kind === 'member' ? 'round' : 'rect'} showGrid={!kind || kind === 'faculty'} /></div>
        <aside className="people-crop-settings">
          {kind && <ProfileCropPreview source={source} crop={selected} rotation={rotation} kind={kind} />}
          <div className="people-crop-controls">
            {!kind && <div className="people-field"><label htmlFor={`${id}-ratio`}>Crop shape</label><select id={`${id}-ratio`} value={aspect || 0} onChange={event => props.onAspect(Number(event.target.value))}>{ratios.map(ratio => <option key={ratio.label} value={ratio.value || 0}>{ratio.label}</option>)}</select></div>}
            <div className="people-crop-slider"><label htmlFor={`${id}-zoom`}>Zoom <output>{zoom.toFixed(1)}×</output></label><input id={`${id}-zoom`} type="range" min="1" max="3" step="0.05" value={zoom} disabled={busy} onChange={event => props.onZoom(Number(event.target.value))} /></div>
            <div className="people-crop-slider"><label htmlFor={`${id}-rotation`}>Rotation <output>{Math.round(rotation)}°</output></label><div className="people-rotation-controls"><button type="button" aria-label="Rotate photo left" disabled={busy} onClick={() => props.onRotation((rotation + 270) % 360)}><RotateCounterClockwiseIcon /></button><input id={`${id}-rotation`} type="range" min="0" max="360" step="1" value={rotation} disabled={busy} onChange={event => props.onRotation(Number(event.target.value))} /><button type="button" aria-label="Rotate photo right" disabled={busy} onClick={() => props.onRotation((rotation + 90) % 360)}><RotateCounterClockwiseIcon style={{ transform: 'scaleX(-1)' }} /></button></div></div>
            <button type="button" className="people-crop-reset" disabled={busy} onClick={props.onReset}><ResetIcon />Reset</button>
            {props.error && <p role="alert" className="people-error">{props.error}</p>}
          </div>
        </aside>
      </div>
      <footer className="people-crop-footer">{!kind && <button type="button" className="people-crop-original" disabled={busy} onClick={props.onOriginal}>Use Original</button>}<button type="button" className="people-button people-button-secondary" disabled={busy} onClick={props.onClose}>Cancel</button><button type="button" className="people-button people-button-primary" disabled={busy || !selected} onClick={props.onSave}><CheckIcon />{busy ? 'Applying…' : 'Save & Apply'}</button></footer>
    </div>
  </div>;
}
