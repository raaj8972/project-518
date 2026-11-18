'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from '@radix-ui/react-icons';

export default function TimelinePhotos({images,year}:{images:string[];year:string}) {
  const [slide,setSlide]=useState({previous:0,current:0});
  const [interacting,setInteracting]=useState(false);
  const [paused,setPaused]=useState(false);
  const [visible,setVisible]=useState(typeof IntersectionObserver==='undefined');
  const [reduced,setReduced]=useState(false);
  const [failed,setFailed]=useState<string[]>([]);
  const root=useRef<HTMLDivElement>(null),touch=useRef<{x:number;y:number}|null>(null);
  const count=images.length,index=slide.current%count;
  const move=(step:number)=>setSlide(previous=>({previous:previous.current%count,current:(previous.current+step+count)%count}));
  useEffect(()=>{
    const query=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReduced(query.matches);update();query.addEventListener?.('change',update);
    const element=root.current;const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'50px'});
    if(element)observer?.observe(element);
    const visibility=()=>{if(document.hidden)setVisible(false);else if(element){const rect=element.getBoundingClientRect();setVisible(rect.bottom>0&&rect.top<window.innerHeight);}};
    document.addEventListener('visibilitychange',visibility);
    return()=>{query.removeEventListener?.('change',update);observer?.disconnect();document.removeEventListener('visibilitychange',visibility);};
  },[]);
  const autoplay=count>1&&!paused&&!interacting&&!reduced&&visible;
  useEffect(()=>{
    if(!autoplay)return;
    const timer=window.setInterval(()=>setSlide(previous=>({previous:previous.current%count,current:(previous.current+1)%count})),4600+(Number(year)%3)*350);
    return()=>window.clearInterval(timer);
  },[autoplay,count,year,index]);
  return <div ref={root} className="chronicle-photo" role="region" aria-roledescription="carousel" aria-label={`${year} photos`}
    onMouseEnter={()=>setInteracting(true)} onMouseLeave={()=>setInteracting(false)}
    onFocusCapture={()=>setInteracting(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setInteracting(false);}}
    onTouchStart={event=>{const point=event.touches[0];if(point){touch.current={x:point.clientX,y:point.clientY};setInteracting(true);}}}
    onTouchEnd={event=>{const start=touch.current,point=event.changedTouches[0];if(start&&point){const dx=point.clientX-start.x,dy=point.clientY-start.y;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){move(dx<0?1:-1);setPaused(true);}}touch.current=null;setInteracting(false);}}
    onTouchCancel={()=>{touch.current=null;setInteracting(false);}}>
    {images.map((image,position)=>position===index||position===slide.previous?<img key={image} src={image} alt={`Ricorrenza ${year}, photo ${position+1}`} loading="lazy" decoding="async" draggable={false}
      className={`chronicle-photo__image ${position===index?'is-current':''}`} aria-hidden={position!==index} onError={()=>setFailed(previous=>previous.includes(image)?previous:[...previous,image])}/>:null)}
    {failed.includes(images[index])&&<span className="chronicle-photo__error">Photo unavailable</span>}
    {count>1&&<>
      <span className="chronicle-photo__counter" aria-live={autoplay?'off':'polite'}>{index+1} / {count}</span>
      <button className="chronicle-photo__arrow chronicle-photo__arrow--previous" type="button" aria-label={`Previous ${year} photo`} onClick={()=>{move(-1);setPaused(true);}}><ChevronLeftIcon/></button>
      <button className="chronicle-photo__arrow chronicle-photo__arrow--next" type="button" aria-label={`Next ${year} photo`} onClick={()=>{move(1);setPaused(true);}}><ChevronRightIcon/></button>
      {!reduced&&<button className="chronicle-photo__play" type="button" aria-label={`${paused?'Play':'Pause'} ${year} photos`} onClick={()=>setPaused(value=>!value)}>{paused?<PlayIcon/>:<PauseIcon/>}</button>}
    </>}
  </div>;
}
