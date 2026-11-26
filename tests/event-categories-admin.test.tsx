// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {EventCategoriesManagement} from '../src/components/admin/EventCategoriesManagement';
const mocks=vi.hoisted(()=>({add:vi.fn(),update:vi.fn(),remove:vi.fn(),order:vi.fn()}));
vi.mock('../src/context/DataContext',()=>({useData:()=>({events:[],eventCategories:[{id:1,name:'Cultural',description:'Live performances',color:'#426b52',display_order:1},{id:2,name:'Academic',description:'Learning events',color:'#637f9a',display_order:2}],addEventCategory:mocks.add,updateEventCategory:mocks.update,deleteEventCategory:mocks.remove,reorderEventCategories:mocks.order})}));
vi.mock('../src/hooks/useApprovals',()=>({useApprovals:()=>({checkRequiresApproval:async()=>false,submitForApproval:vi.fn()})}));
vi.mock('../src/components/ImageUpload',()=>({ImageUpload:()=>null}));
vi.mock('../src/components/VideoUpload',()=>({VideoUpload:()=>null}));
vi.mock('../src/components/admin/InlineDescriptionAI',()=>({InlineDescriptionAI:()=>null}));
let host:HTMLDivElement,root:Root;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{fn(0);return 1;});vi.stubGlobal('cancelAnimationFrame',vi.fn());mocks.add.mockReset().mockResolvedValue(undefined);mocks.order.mockReset().mockResolvedValue(true);host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function click(name:string){const button=[...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.trim()===name||b.getAttribute('aria-label')===name)!;expect(button,name).toBeTruthy();await act(async()=>button.click());}
async function change(label:string,value:string){const node=[...document.querySelectorAll('label')].find(n=>n.querySelector('span')?.textContent===label)!.querySelector('input,textarea')!;await act(async()=>{Object.getOwnPropertyDescriptor(node.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')!.set!.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));});}
it('keeps failed category drafts and validates required fields before creating',async()=>{await act(async()=>root.render(<EventCategoriesManagement/>));await click('Add category');await click('Save category');expect(document.querySelector('[role=alert]')?.textContent).toContain('name and description');await change('Category name','Workshop');await change('Description','Practical sessions');mocks.add.mockRejectedValueOnce(new Error('offline'));await click('Save category');expect(document.querySelector('[role=alert]')?.textContent).toContain('offline');await click('Save category');expect(mocks.add).toHaveBeenLastCalledWith({name:'Workshop',description:'Practical sessions',color:'#426b52'});expect(document.querySelector('[role=dialog]')).toBeNull();});
it('retains reordered categories when saving fails',async()=>{await act(async()=>root.render(<EventCategoriesManagement/>));await click('Arrange categories');await click('Move Academic up');mocks.order.mockResolvedValueOnce(false);await click('Save order');expect(document.querySelector('[role=alert]')?.textContent).toContain('kept for retry');await click('Save order');expect(mocks.order).toHaveBeenLastCalledWith([2,1]);});
