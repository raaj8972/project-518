// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {SponsorsManagement} from '../src/components/admin/SponsorsManagement';
import {resolveHomepagePartners} from '../src/utils/homepageContent';
const mocks=vi.hoisted(()=>({place:vi.fn(),feature:vi.fn(),add:vi.fn(),update:vi.fn(),approval:vi.fn(),requires:false,snapshot:null as any,legacy:[] as any[]}));
vi.mock('../src/context/DataContext',()=>({useData:()=>{
 const [sponsors,setSponsors]=React.useState([{id:1,name:'Old Partner',logo:'old.png',category:'Title Sponsor',description:'',website:'https://old.example',featured:true,order_position:1},{id:2,name:'New Partner',logo:'new.png',category:'Co Sponsor',description:'',website:'',featured:false,order_position:2}]);
 const [homepage,setHomepage]=React.useState({sponsor_logos:mocks.legacy});mocks.snapshot={sponsors,homepage};
 return {sponsors,homepageSettings:homepage,sponsorshipPackages:[],sponsorshipSettings:{page_title:'Sponsors',intro_text:'Introduction',brochure_title:'Brochure',contactSections:[]},sanitizeUrl:(url:string)=>url,
 updateHomepageSettings:async(patch:any)=>{await mocks.place(patch);setHomepage(previous=>({...previous,...patch}));},
 toggleSponsorFeatured:async(id:number)=>{await mocks.feature(id);setSponsors(previous=>previous.map(sponsor=>sponsor.id===id?{...sponsor,featured:!sponsor.featured}:sponsor));},
 addSponsor:async(record:any)=>{const created={...record,id:3};await mocks.add(record);setSponsors(previous=>[...previous,created]);return created;},
 updateSponsor:async(id:number,record:any)=>{await mocks.update(id,record);setSponsors(previous=>previous.map(sponsor=>sponsor.id===id?{...sponsor,...record}:sponsor));},
 deleteSponsor:vi.fn(),addSponsorshipPackage:vi.fn(),updateSponsorshipPackage:vi.fn(),deleteSponsorshipPackage:vi.fn(),toggleSponsorshipPackageEnabled:vi.fn(),updateSponsorshipSettings:vi.fn(),addContactSection:vi.fn(),updateContactSection:vi.fn(),deleteContactSection:vi.fn()};
}}));
vi.mock('../src/hooks/useApprovals',()=>({useApprovals:()=>({checkRequiresApproval:async()=>mocks.requires,submitForApproval:mocks.approval})}));
vi.mock('../src/context/SavingProgressContext',()=>({useSavingProgress:()=>({withSteps:()=>({next:vi.fn()}),done:vi.fn()})}));
vi.mock('../src/components/ToastProvider',()=>({useToast:()=>({push:vi.fn()})}));
vi.mock('../src/components/ImageUpload',()=>({ImageUpload:({onImageSelect}:any)=><button type="button" aria-label="Upload sponsor logo" onClick={()=>onImageSelect('uploaded.png')}>Upload</button>}));
vi.mock('../src/components/admin/InlineDescriptionAI',()=>({InlineDescriptionAI:()=>null}));
vi.mock('../src/components/admin/sponsors/AISponsorScanner',()=>({AISponsorScanner:()=>null}));
vi.mock('../src/components/admin/sponsors/AITierScanner',()=>({AITierScanner:()=>null}));
let host:HTMLDivElement,root:Root;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear();mocks.requires=false;mocks.legacy=[];for(const mock of [mocks.place,mocks.feature,mocks.add,mocks.update])mock.mockReset().mockResolvedValue(undefined);mocks.approval.mockReset().mockResolvedValue({success:true});vi.spyOn(window,'alert').mockImplementation(()=>{});host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
const mount=async()=>{await act(async()=>root.render(<SponsorsManagement/>));};
function button(label:string){return [...host.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.getAttribute('aria-label')===label||node.textContent?.trim()===label)!;}
async function click(label:string){expect(button(label),label).toBeTruthy();await act(async()=>button(label).click());}
async function select(label:string,value:string){const target=host.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)!;expect(target,label).toBeTruthy();await act(async()=>{target.value=value;target.dispatchEvent(new Event('change',{bubbles:true}));});}
async function input(target:HTMLInputElement,value:string){await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(target,value);target.dispatchEvent(new Event('input',{bubbles:true}));});}
function home(){return resolveHomepagePartners(mocks.snapshot.sponsors,mocks.snapshot.homepage.sponsor_logos,{featuredOnly:true});}
it('publishes editions and homepage featured selection from the same sponsor card',async()=>{
 await mount();expect(home().partners.map(item=>item.id)).toEqual([1]);
 await select('Edition for New Partner','current');expect(home()).toEqual({period:'current',partners:[]});
 await click('Show New Partner on homepage');expect(home().partners.map(item=>item.id)).toEqual([2]);
 expect(mocks.feature).toHaveBeenCalledWith(2);expect(mocks.place.mock.calls[0][0]).toEqual({sponsor_logos:[expect.objectContaining({sponsor_id:2,period:'current'})]});
 await select('Edition for New Partner','previous');expect(home().period).toBe('previous');expect(home().partners.map(item=>item.id)).toEqual([1,2]);
 await click('Current partners');expect(host.querySelector('select[aria-label="Edition for Old Partner"]')).toBeNull();await click('All sponsors');expect(host.querySelector('select[aria-label="Edition for Old Partner"]')).not.toBeNull();
});
it('keeps failed edition writes unchanged and offers retry on the same card',async()=>{
 await mount();mocks.place.mockRejectedValueOnce(new Error('offline'));await select('Edition for New Partner','current');
 expect(home().period).toBe('previous');expect(host.querySelector('[role="status"]')?.textContent).toContain('Could not save');
 await select('Edition for New Partner','current');expect(home().period).toBe('current');expect(mocks.place).toHaveBeenCalledTimes(2);
});
it('adds one sponsor and assigns its edition without sending unsupported fields to the sponsor table',async()=>{
 await mount();await click('Add sponsor');await input(host.querySelector<HTMLInputElement>('[placeholder="Company or organization name"]')!,'Created Partner');await click('Upload sponsor logo');
 const checkbox=[...host.querySelectorAll<HTMLLabelElement>('label')].find(label=>label.textContent?.trim()==='Show on homepage')!.querySelector<HTMLInputElement>('input')!;await act(async()=>checkbox.click());
 await click('Add Sponsor');expect(mocks.add).toHaveBeenCalledTimes(1);expect(mocks.add.mock.calls[0][0]).not.toHaveProperty('period');
 expect(home().period).toBe('current');expect(home().partners[0]).toMatchObject({id:3,name:'Created Partner',logo:'uploaded.png'});
});
it('retains a successfully created sponsor if edition save fails and retries placement without creating it again',async()=>{
 await mount();await click('Add sponsor');await input(host.querySelector<HTMLInputElement>('[placeholder="Company or organization name"]')!,'Created Partner');await click('Upload sponsor logo');mocks.place.mockRejectedValueOnce(new Error('offline'));await click('Add Sponsor');
 expect(host.textContent).toContain('Sponsor saved. Its edition could not be saved');expect(mocks.add).toHaveBeenCalledTimes(1);
 await select('Edition for Created Partner','current');expect(mocks.add).toHaveBeenCalledTimes(1);expect(home().period).toBe('current');
});
it('preserves approval requirements instead of changing editions or publishing directly',async()=>{
 mocks.requires=true;await mount();expect(host.querySelector<HTMLSelectElement>('[aria-label="Edition for New Partner"]')!.disabled).toBe(true);
 await click('Show New Partner on homepage');expect(mocks.approval).toHaveBeenCalledWith('sponsor','update',{featured:true},2);expect(mocks.feature).not.toHaveBeenCalled();expect(mocks.place).not.toHaveBeenCalled();
});
it('keeps earlier saved logos editable in Sponsors and respects their homepage visibility',async()=>{
 mocks.legacy=[{id:'legacy',name:'Earlier Partner',logo_url:'earlier.png',enabled:true,period:'previous'}];await mount();expect(home().partners.map(item=>item.name)).toContain('Earlier Partner');
 await click('Earlier Partnerprevious');const checkbox=[...host.querySelectorAll<HTMLLabelElement>('.sponsor-legacy-archive label')].find(label=>label.textContent==='Show on homepage')!.querySelector<HTMLInputElement>('input')!;
 await act(async()=>checkbox.click());await click('Save partner');expect(home().partners.map(item=>item.name)).not.toContain('Earlier Partner');
 expect(resolveHomepagePartners(mocks.snapshot.sponsors,mocks.snapshot.homepage.sponsor_logos).partners.map(item=>item.name)).toContain('Earlier Partner');
});

it('controls the entire homepage partner section here without replacing its logo selection',async()=>{
 await mount();const checkbox=host.querySelector<HTMLInputElement>('[aria-label="Show partner section on homepage"]')!;await act(async()=>checkbox.click());
 expect(mocks.place).toHaveBeenCalledWith({featured_partners_enabled:false});expect(mocks.snapshot.homepage.featured_partners_enabled).toBe(false);expect(host.textContent).toContain('Homepage section is switched off');
});
