// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import TeamGuideOverlay from '../src/components/dashboard/TeamGuideOverlay';
const mocks=vi.hoisted(()=>({rows:[] as any[],save:vi.fn()}));
vi.mock('../src/lib/supabase',()=>({supabase:{from:()=>({select:()=>({eq:()=>({in:async()=>({data:mocks.rows,error:null})})}),upsert:mocks.save})}}));
let root:Root,host:HTMLDivElement;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.clearAllMocks();localStorage.clear();mocks.rows=[];mocks.save.mockResolvedValue({error:null});HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();localStorage.clear();document.body.style.overflow='';});
async function render(){await act(async()=>root.render(<TeamGuideOverlay userId="student"/>));}
async function click(text:string){await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent===text)!.click());}
it('waits for the first-login overview, then shows an IQMG/team tour with Skip and replay',async()=>{await render();expect(host.querySelector('dialog')).toBeNull();await act(async()=>window.dispatchEvent(new CustomEvent('rico-student-tour-finished',{detail:'student'})));expect(host.querySelector('dialog[open]')).toBeTruthy();expect(host.textContent).toContain('Each number belongs to one account');await click('Next');expect(host.textContent).toContain('They must accept');await click('Skip guide');expect(localStorage.getItem('rico_team_guide_v1:student')).toBe('skipped');expect(mocks.save).toHaveBeenCalledWith({user_id:'student',tour_version:101,status:'skipped'});expect(host.querySelector('dialog')).toBeNull();await click('How teams work');expect(host.querySelector('dialog[open]')).toBeTruthy();});
it('explains captain approval and the separate event WhatsApp approval in all four steps',async()=>{mocks.rows=[{tour_version:1}];await render();await click('Next');await click('Next');expect(host.textContent).toContain('captain must approve');await click('Next');expect(host.textContent).toContain('WhatsApp group unlocks only after approval');await click('Got it');expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({status:'completed'}));});
