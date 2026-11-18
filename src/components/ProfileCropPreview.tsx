import { useEffect, useRef, useState } from 'react';
import { PortraitFrame } from './RicoFamily/PortraitFrame';
import { drawImageCrop, type PixelCrop, type ProfileCropKind } from '../utils/imageCrop';
import '../styles/FamilyTeams.css';

export function ProfileCropPreview({ source, crop, rotation, kind }: { source: string; crop: PixelCrop | null; rotation: number; kind: ProfileCropKind }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true; setImage(null); setError('');
    const next = new Image(); next.onload = () => { if (active) setImage(next); };
    next.onerror = () => { if (active) setError('Could not load the crop preview.'); }; next.src = source;
    return () => { active = false; next.onload = null; next.onerror = null; };
  }, [source]);
  useEffect(() => {
    if (!image || !crop) return;
    const frame = requestAnimationFrame(() => {
      try {
        const output = drawImageCrop(image, crop, rotation, 300);
        if (!canvas.current) return;
        canvas.current.width = output.width; canvas.current.height = output.height;
        canvas.current.getContext('2d')?.drawImage(output, 0, 0); setError('');
      } catch { setError('Could not render the crop preview.'); }
    });
    return () => cancelAnimationFrame(frame);
  }, [image, crop, rotation]);
  return <section className="profile-crop-preview" aria-label="Live website crop preview">
    <h4>Live website preview</h4><p>The selected crop, as it will appear on the website.</p>
    <div className="family-teams"><article className={`family-person family-person--${kind}`}><PortraitFrame kind={kind}><canvas ref={canvas} aria-label="Selected image crop" /></PortraitFrame></article></div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
