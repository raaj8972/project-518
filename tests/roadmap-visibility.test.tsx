// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {Roadmap} from '../src/components/Roadmap';
import {isHomepageRoadmapVisible,publicRoadmapMilestones} from '../src/utils/homepageRoadmap';
const state=vi.hoisted(()=>({records:[] as any[]}));
vi.mock('../src/context/DataContext',()=>({useData:()=>({roadmapMilestones:state.records})}));
let root:Root,container:HTMLDivElement;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;state.records=[];vi.stubGlobal('matchMedia',()=>({matches:false}));vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();});
it('treats a missing visibility flag as visible and preserves an explicit off setting',()=>{expect(isHomepageRoadmapVisible(undefined)).toBe(true);expect(isHomepageRoadmapVisible(null)).toBe(true);expect(isHomepageRoadmapVisible(false)).toBe(false);});
it('shows saved milestone text before the observer or vehicle animation runs',async()=>{
 state.records=[{id:1,year:2026,title:'Visible immediately',points:['Saved detail'],enabled:true,order_position:1,side:'right'}];
 await act(async()=>root.render(<Roadmap/>));expect(container.querySelector('#roadmap')).not.toBeNull();expect(container.textContent).toContain('Visible immediately');expect(container.textContent).toContain('Saved detail');
 const card=container.querySelector('article[aria-label="Ricorrenza 2026"]')!;expect(card.textContent).toContain('Visible immediately');expect(card.textContent).toContain('Saved detail');expect(card.closest('[aria-hidden="true"]')).toBeNull();
});
it('renders the built-in road without SVG measurement or IntersectionObserver support',async()=>{
 vi.stubGlobal('IntersectionObserver',undefined);await act(async()=>root.render(<Roadmap/>));expect(container.querySelectorAll('h3').length).toBeGreaterThan(0);expect(container.querySelector('svg path')).not.toBeNull();
});
it('does not replace deliberately disabled milestones with fallback history',async()=>{
 state.records=[{id:1,year:2026,title:'Hidden milestone',points:[],enabled:false,order_position:1,side:'left'}];await act(async()=>root.render(<Roadmap/>));expect(container.querySelector('#roadmap')).toBeNull();
});
it('keeps saved text-side metadata with its milestone after filtering and sorting',()=>{
 const result=publicRoadmapMilestones([{id:1,year:2020,title:'Hidden',points:[],enabled:false,order_position:1,side:'left'},{id:2,year:2026,title:'Shown',points:[],enabled:true,order_position:2,side:'right'}] as any);
 expect(result).toHaveLength(1);expect(result[0].side).toBe('right');expect(result[0].lines).toEqual(['Shown']);
});
it('alternates automatic card positions after saved explicit sides in latest-first order',async()=>{
 state.records=[
  {id:1,year:2019,points:['Old'],enabled:true,order_position:1,side:'auto'},
  {id:2,year:2022,points:['Return'],enabled:true,order_position:2,side:'auto'},
  {id:3,year:2023,points:['Recent'],enabled:true,order_position:3,side:'right'},
  {id:4,year:2026,points:['Latest'],enabled:true,order_position:4,side:'left'},
 ];
 await act(async()=>root.render(<Roadmap/>));
 const cards=[...container.querySelectorAll('.chronicle-stop')];
 expect(cards.map(card=>card.querySelector('h3')?.textContent)).toEqual(['2026','2023','2022','2019']);
 expect(cards.map(card=>card.classList.contains('chronicle-stop--left'))).toEqual([true,false,true,false]);
});
it('extends the road and retains earlier history when future editions are published',async()=>{
 state.records=[{id:1,year:2026,title:'Current edition',points:[],enabled:true,order_position:1,side:'auto'}];
 await act(async()=>root.render(<Roadmap/>));
 const originalRoad=container.querySelector('.chronicles__bridge path')?.getAttribute('d');
 state.records=[...state.records,{id:2,year:2027,title:'Next edition',points:[],enabled:true,order_position:2,side:'auto'},{id:3,year:2028,title:'Another edition',points:[],enabled:true,order_position:3,side:'auto'}];
 await act(async()=>root.render(<Roadmap/>));
 expect([...container.querySelectorAll('article h3')].map(node=>node.textContent)).toEqual(['2028','2027','2026']);
 expect(container.querySelector('.chronicles__bridge path')?.getAttribute('d')).not.toBe(originalRoad);
});
it('pauses the energy cycle offscreen, in hidden tabs and when reduced motion is requested',async()=>{
 let intersection:IntersectionObserverCallback=()=>{};let mediaChange:()=>void=()=>{};const disconnect=vi.fn();
 const motion={matches:false,addEventListener:vi.fn((_:string,callback:()=>void)=>{mediaChange=callback;}),removeEventListener:vi.fn()};
 const hidden=vi.spyOn(document,'hidden','get').mockReturnValue(false);
 vi.stubGlobal('matchMedia',()=>motion);
 vi.stubGlobal('IntersectionObserver',class{constructor(callback:IntersectionObserverCallback){intersection=callback;}observe(){}disconnect=disconnect;});
 try{
  await act(async()=>root.render(<Roadmap/>));
  const journey=container.querySelector<HTMLElement>('.chronicles__journey')!;
  expect(journey.dataset.energyActive).toBe('false');
  intersection([{isIntersecting:true}] as IntersectionObserverEntry[],{} as IntersectionObserver);expect(journey.dataset.energyActive).toBe('true');
  hidden.mockReturnValue(true);document.dispatchEvent(new Event('visibilitychange'));expect(journey.dataset.energyActive).toBe('false');
  hidden.mockReturnValue(false);document.dispatchEvent(new Event('visibilitychange'));expect(journey.dataset.energyActive).toBe('true');
  motion.matches=true;mediaChange();expect(journey.dataset.energyActive).toBe('false');
  motion.matches=false;mediaChange();intersection([{isIntersecting:false}] as IntersectionObserverEntry[],{} as IntersectionObserver);expect(journey.dataset.energyActive).toBe('false');
  await act(async()=>root.render(null));expect(disconnect).toHaveBeenCalled();expect(motion.removeEventListener).toHaveBeenCalledWith('change',expect.any(Function));
 }finally{hidden.mockRestore();}
});
