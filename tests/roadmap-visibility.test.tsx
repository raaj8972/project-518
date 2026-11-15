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
 const item=[...container.querySelectorAll('li')].find(node=>node.textContent==='Visible immediately')!;expect(item.closest('div.transition-all')?.className).toContain('opacity-100');
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
