import { useCallback, useId, useRef, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, Cross2Icon, ImageIcon } from '@radix-ui/react-icons';
import { ImageUpload } from '../ImageUpload';
import { normalizeRoadmapImages } from '../../utils/homepageRoadmap';
import '../../styles/RoadmapPhotoEditor.css';

interface Props { images:string[]; year:number; onChange:(images:string[])=>void; onProcessingChange?:(busy:boolean)=>void; }

export function RoadmapPhotoEditor({images,year,onChange,onProcessingChange}:Props) {
  const [replacing,setReplacing]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);
  const [url,setUrl]=useState('');
  const [error,setError]=useState('');
  const id=useId();
  const current=useRef(images); current.current=images;
  const commit=(next:string[])=>{const normalized=normalizeRoadmapImages(next);current.current=normalized;onChange(normalized);};
  const upload=(urls:string[])=>{
    if(replacing!=null){const next=current.current.slice();next[replacing]=urls[0];commit(next);setReplacing(null);}
    else commit([...current.current,...urls]);
  };
  const processing=useCallback((value:boolean)=>{setBusy(value);onProcessingChange?.(value);},[onProcessingChange]);
  const move=(index:number,step:number)=>{const next=current.current.slice();[next[index],next[index+step]]=[next[index+step],next[index]];commit(next);};

  return <div className="roadmap-photo-editor" role="group" aria-label={`Photos for ${year}`}>
    <div className="roadmap-photo-editor__heading"><span><ImageIcon />Year photos</span><small>{images.length} {images.length===1?'photo':'photos'}</small></div>
    <p>Add multiple photos. They change automatically on the timeline. The first photo appears first.</p>
    {images.length>0&&<ol className="roadmap-photo-editor__list">{images.map((image,index)=><li key={`${image}-${index}`}>
      <img src={image} alt={`${year} photo ${index+1}`} /><div><strong>{index===0?'Cover photo':`Photo ${index+1}`}</strong>
      <div className="roadmap-photo-editor__actions">
        <button type="button" disabled={busy} onClick={()=>setReplacing(index)} aria-label={`Replace photo ${index+1}`}>Replace</button>
        <button type="button" disabled={busy} onClick={()=>commit(current.current.filter((_,position)=>position!==index))} aria-label={`Delete photo ${index+1}`}><Cross2Icon />Delete</button>
        <button type="button" disabled={busy||index===0} onClick={()=>move(index,-1)} aria-label={`Move photo ${index+1} earlier`}><ArrowLeftIcon /></button>
        <button type="button" disabled={busy||index===images.length-1} onClick={()=>move(index,1)} aria-label={`Move photo ${index+1} later`}><ArrowRightIcon /></button>
      </div></div>
    </li>)}</ol>}
    <div className="roadmap-photo-editor__upload" aria-label={replacing==null?'Add photos':`Replace photo ${replacing+1}`}>
      <strong>{replacing==null?'Upload photos':`Choose a replacement for photo ${replacing+1}`}</strong>
      {replacing!=null&&<button type="button" disabled={busy} onClick={()=>setReplacing(null)}>Cancel replacement</button>}
      <ImageUpload key={replacing==null?'add':`replace-${replacing}`} bucket="roadmap-images" folder={`roadmap/${year}`}
        onImageSelect={selected=>upload([selected])} onBatchComplete={results=>upload(results.map(item=>item.url))}
        onProcessingChange={processing} enableCropper={false} preserveExistingMedia autoSave hideControls allowMultiple={replacing==null}
        optimizeOptions={{maxWidth:1800,maxHeight:1200,quality:.9}} />
    </div>
    <div className="roadmap-photo-editor__url"><label htmlFor={id}>Or add a photo URL</label><div><input id={id} type="url" value={url} placeholder="https://…" disabled={busy} onChange={event=>setUrl(event.target.value)} />
      <button type="button" disabled={busy||!url.trim()} onClick={()=>{if(!normalizeRoadmapImages([url]).length){setError('Enter a valid image URL.');return;}upload([url]);setUrl('');setError('');}}>Add photo</button></div></div>
    {error&&<p role="alert">{error}</p>}
    <p className="roadmap-photo-editor__save-hint">Save the milestone to publish photo changes. Removing a photo here leaves the current website unchanged until you save.</p>
  </div>;
}
