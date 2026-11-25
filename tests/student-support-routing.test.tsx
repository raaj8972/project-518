// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import Messages from '../src/pages/dashboard/Messages';
vi.mock('../src/context/EventsContext',()=>({useEventsData:()=>({events:[{id:'dance',title:'Dance Clash',visible:true},{id:'private',title:'Hidden event',visible:false}],loading:false})}));
vi.mock('../src/components/shared/ChatPanel',()=>({ChatPanel:({mode,eventId}:{mode:string;eventId?:string})=><div data-support-mode={mode} data-event={eventId||'technical'}>Connected support</div>}));
let root:Root,host:HTMLDivElement;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('sends event help to the selected event and technical help to its own inbox',async()=>{
 await act(async()=>root.render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Messages/></MemoryRouter>));
 expect(host.textContent).toContain('Event help');expect(host.textContent).toContain('Technical help');expect(host.textContent).not.toContain('Hidden event');
 expect(host.querySelector('[data-support-mode]')).toBeNull();
 const select=host.querySelector('select')!;
 await act(async()=>{select.value='dance';select.dispatchEvent(new Event('change',{bubbles:true}));});
 expect(host.querySelector('[data-support-mode]')?.getAttribute('data-event')).toBe('dance');
 await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.includes('Technical help'))!.click());
 expect(host.querySelector('[data-support-mode]')?.getAttribute('data-event')).toBe('technical');
 expect(host.querySelector('select')).toBeNull();
});
