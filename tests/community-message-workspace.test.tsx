// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {ShoutoutManagement} from '../src/components/admin/ShoutoutManagement';
import {getAdminSections} from '../src/constants/adminSections';
import {WEBSITE_PAGES,websitePageForSection,websitePageTools} from '../src/constants/websitePages';
const mocks=vi.hoisted(()=>({read:vi.fn(),update:vi.fn(),changeSettings:vi.fn(),removeChannel:vi.fn()}));
vi.mock('../src/context/DataContext',()=>({useData:()=>({siteSettings:{shoutouts_enabled:false,shoutouts_daily_limit:81,shoutouts_expiry_hours:24},updateSiteSettings:mocks.changeSettings})}));
vi.mock('../src/lib/supabase',()=>({supabase:{from:()=>({select:()=>({order:mocks.read}),update:mocks.update}),channel:()=>({on:()=>({subscribe:()=>({})})}),removeChannel:mocks.removeChannel}}));
vi.mock('react-hot-toast',()=>({default:{success:vi.fn(),error:vi.fn()}}));
let root:Root,host:HTMLDivElement;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.clearAllMocks();mocks.read.mockResolvedValue({data:[{id:'current',message:'Welcome everyone',created_at:new Date().toISOString(),profiles:null,is_approved:false},{id:'old',message:'Earlier festival message',created_at:new Date(Date.now()-48*3600000).toISOString(),profiles:{full_name:'Festival participant'},is_approved:true}],error:null});host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
const click=async(label:string)=>{const button=[...host.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent?.trim()===label)!;expect(button,label).toBeTruthy();await act(async()=>button.click());};
it('places community messages in Workspace and removes them from Home editing tools',()=>{
 const section=getAdminSections(true).find(section=>section.id==='shoutouts')!;expect(section).toMatchObject({name:'Community messages',group:'DASHBOARD',parent:undefined});expect(websitePageForSection('shoutouts')).toBeUndefined();const home=WEBSITE_PAGES.find(page=>page.id==='homepage')!;expect(websitePageTools(home,new Set(['homepage','shoutouts'])).map(tool=>tool.href)).not.toContain('/admin/shoutouts');
});
it('shows posted message age instead of an approval queue or manual approval actions',async()=>{
 await act(async()=>root.render(<ShoutoutManagement/>));expect(host.textContent).toContain('No approval is needed');expect(host.textContent).not.toMatch(/Pending Review|Approved|Pending/);expect(host.textContent).toContain('Welcome everyone');expect(host.textContent).toContain('Earlier festival message');
 await click('recent');expect(host.textContent).toContain('Welcome everyone');expect(host.textContent).not.toContain('Earlier festival message');await click('expired');expect(host.textContent).not.toContain('Welcome everyone');expect(host.textContent).toContain('Earlier festival message');expect(mocks.update).not.toHaveBeenCalled();expect(mocks.read).toHaveBeenCalledTimes(1);
});
