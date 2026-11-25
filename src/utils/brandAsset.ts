import DOMPurify from 'dompurify';

/** Keep SVG input convenient for staff, but store only passive raster images. */
export async function prepareBrandAsset(file: File): Promise<File> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');
  if (file.type === 'image/png') {
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (![137,80,78,71,13,10,26,10].every((byte,index)=>bytes[index]===byte)) throw new Error('The file is not a valid PNG image.');
    return file;
  }
  if (file.type !== 'image/svg+xml') throw new Error('Please upload a PNG or SVG image.');
  const safe = DOMPurify.sanitize(await file.text(), {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script','foreignObject','style','image','use','a'],
    FORBID_ATTR: ['href','xlink:href','style']
  });
  const objectUrl=URL.createObjectURL(new Blob([safe],{type:'image/svg+xml'}));
  try {
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
      const img=new Image();
      const timer=setTimeout(()=>reject(new Error('Image conversion timed out.')),10000);
      img.onload=()=>{clearTimeout(timer);resolve(img);};
      img.onerror=()=>{clearTimeout(timer);reject(new Error('The SVG could not be read.'));};
      img.src=objectUrl;
    });
    const width=image.naturalWidth||1024,height=image.naturalHeight||1024;
    const scale=Math.min(1,2048/Math.max(width,height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    const context=canvas.getContext('2d');if(!context)throw new Error('Image conversion unavailable.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Image conversion failed.')),'image/png'));
    if(blob.size>5*1024*1024)throw new Error('Converted image exceeds 5 MB.');
    return new File([blob],file.name.replace(/\.svg$/i,'')+'.png',{type:'image/png'});
  } finally { URL.revokeObjectURL(objectUrl); }
}
