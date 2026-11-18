import { useId, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { publicRoadmapMilestones } from '../utils/homepageRoadmap';
import TimelineBridge from './Timeline/TimelineBridge';
import TimelinePhotos from './Timeline/TimelinePhotos';
import ChronicleSky from './Timeline/ChronicleSky';
import '../styles/Chronicles.css';

const CHAPTERS:Record<string,string>={2015:'The beginning',2017:'The cultural surge',2019:'Rising horizons',2022:'The comeback',2023:'A new benchmark',2026:'The next chapter'};

function ChronicleCrest(){return <svg viewBox="0 0 90 48" fill="none" aria-hidden="true"><path d="m16 13 13 11L45 5l16 19 13-11-8 27H24Z" stroke="currentColor" strokeWidth="2"/><path d="m26 33 19-18 19 18M24 44h42" stroke="currentColor"/><circle cx="16" cy="11" r="3" fill="currentColor"/><circle cx="45" cy="5" r="3" fill="currentColor"/><circle cx="74" cy="11" r="3" fill="currentColor"/></svg>;}

export function Roadmap() {
  const {roadmapMilestones}=useData();
  const id=useId();
  const milestones=useMemo(()=>{
    let previousSide:'left'|'right'='left';
    return publicRoadmapMilestones(roadmapMilestones||[]).slice().reverse().map(item=>{
      const layoutSide:'left'|'right'=item.side==='left'||item.side==='right'?item.side:previousSide==='left'?'right':'left';
      previousSide=layoutSide;return {...item,layoutSide};
    });
  },[roadmapMilestones]);
  if(!milestones.length)return null;
  return <section id="roadmap" className="chronicles" aria-labelledby={`${id}-title`}>
    <div className="chronicles__atmosphere" aria-hidden="true"/><ChronicleSky/>
    <header className="chronicles__heading"><ChronicleCrest/><p className="chronicles__eyebrow">The Ricorrenza</p>
      <h2 id={`${id}-title`}>Chronicles</h2><p className="chronicles__subtitle">A journey through time</p>
      <div className="chronicles__flourish" aria-hidden="true"><span/><svg viewBox="0 0 36 28" fill="none"><path d="m3 3 15 10L33 3 18 25ZM3 3l8 15 7 7 7-7L33 3" stroke="currentColor" strokeWidth="1.5"/></svg><span/></div>
    </header>
    <TimelineBridge signature={milestones.map(item=>`${item.key}:${item.layoutSide}`).join('|')}>
      <ol className="chronicles__years" aria-label="Ricorrenza timeline, latest edition first">
        {milestones.map(milestone=>{
          return <li key={milestone.key} className={`chronicle-stop chronicle-stop--${milestone.layoutSide}`} data-chronicle-row>
            <article className={`chronicle-card ${milestone.images.length?'has-photos':''}`} aria-label={`Ricorrenza ${milestone.year}`}>
              <div className="chronicle-card__inner">
                <header className="chronicle-card__year" data-chronicle-node><h3>{milestone.year}</h3><p>{milestone.title||CHAPTERS[milestone.year]||'A year to remember'}</p><span aria-hidden="true"/></header>
                <div className="chronicle-card__story">
                  {milestone.images.length>0?<TimelinePhotos images={milestone.images} year={milestone.year}/>:<div className="chronicle-card__memory" aria-hidden="true"><img src="/images/ricorrenza-medical-mark.svg" alt=""/><span>RICORRENZA</span></div>}
                  {milestone.points.length>0&&<ul>{milestone.points.map((point,pointIndex)=><li key={`${pointIndex}-${point}`}>{point}</li>)}</ul>}
                </div>
              </div>
              <span className="chronicle-card__glint" aria-hidden="true"/>
            </article>
          </li>;
        })}
      </ol>
    </TimelineBridge>
    <div className="chronicles__ending"><span/><p>The story continues</p><span/></div>
  </section>;
}
export default Roadmap;
