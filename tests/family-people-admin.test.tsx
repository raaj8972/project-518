// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TeamMembersManagement } from '../src/components/admin/TeamMembersManagement';
import { CommitteesManagement } from '../src/components/admin/CommitteesManagement';
import { FacultyHeadsManagement } from '../src/components/admin/FacultyHeadsManagement';
import { CouncilManagement } from '../src/components/admin/CouncilManagement';
const mocks = vi.hoisted(() => ({ faculty: [] as any[], people: [] as any[], departments: [] as any[], addDepartment: vi.fn(), updateDepartment: vi.fn(), add: vi.fn(), update: vi.fn(), approval: vi.fn(), requiresApproval: false }));
vi.mock('../src/context/DataContext', () => ({ useData: () => ({ facultyHeads: mocks.faculty, addFacultyHead: mocks.add, updateFacultyHead: mocks.update, deleteFacultyHead: vi.fn(), toggleFacultyHeadEnabled: vi.fn(), sanitizeUrl: (url:string)=>url, coreTeamMembers: mocks.people, coreCommittees: mocks.departments, addCoreCommittee: mocks.addDepartment, updateCoreCommittee: mocks.updateDepartment, deleteCoreCommittee: vi.fn(), addCoreTeamMember: mocks.add, updateCoreTeamMember: mocks.update, deleteCoreTeamMember: vi.fn(), toggleCoreTeamMemberEnabled: vi.fn() }) }));
vi.mock('../src/context/SavingProgressContext', () => ({ useSavingProgress: () => ({ withSteps: () => ({ next() {} }), done() {} }) }));
vi.mock('../src/hooks/useApprovals', () => ({ useApprovals: () => ({ checkRequiresApproval: async () => mocks.requiresApproval, submitForApproval: mocks.approval }) }));
vi.mock('../src/components/ImageUpload', () => ({ ImageUpload: ({ onImageSelect }: any) => <button type="button" onClick={() => onImageSelect('/uploaded.jpg')}>Upload photo</button> }));
vi.mock('../src/components/admin/AICoreTeamScanner', () => ({ AICoreTeamScanner: () => <div>Scanner</div> }));
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; localStorage.clear(); vi.clearAllMocks(); mocks.faculty = []; mocks.people = []; mocks.departments = [{ id:1, name:'Tech Team', enabled:true, order_position:1 }]; mocks.requiresApproval = false;
  mocks.updateDepartment.mockImplementation(async (id, patch) => { mocks.departments = mocks.departments.map(department => department.id === id ? {...department,...patch} : department); });
  mocks.addDepartment.mockImplementation(async payload => { mocks.departments = [...mocks.departments,{...payload,id:99}]; });
  mocks.add.mockResolvedValue(undefined); mocks.update.mockResolvedValue(undefined); mocks.approval.mockResolvedValue({ success: true });
  vi.stubGlobal('alert', vi.fn()); container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function click(label: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.getAttribute('aria-label') === label || node.textContent?.trim() === label)!;
  expect(button, label).toBeTruthy(); await act(async () => button.click());
}
async function change(id: string, value: string) {
  const input = document.getElementById(id) as HTMLInputElement;
  const prototype = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
it('creates a committee head using only profile fields and normalized Instagram', async () => {
  await act(async () => root.render(<TeamMembersManagement isHeadMode />)); await click('Add Head');
  await change('family-person-name', 'Arjun Roy'); await change('family-person-committee', '1'); await change('family-person-instagram', '@arjun.roy'); await click('Upload photo'); await click('Save Changes');
  expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({ name: 'Arjun Roy', image: '/uploaded.jpg', committee_id: 1, is_head: true, is_council: false, social_links: expect.objectContaining({ instagram: 'https://www.instagram.com/arjun.roy/' }) }));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it('excludes council records from committee members and preserves unrelated metadata on edits', async () => {
  mocks.people = [{ id: 1, name: 'Ishita Sen', image: '/ishita.jpg', committee_id: 1, enabled: true, is_head: false, role: 'Existing designation', phone: '+91 98300 00011', social_links: { instagram: '@ishita', linkedin: 'https://linkedin.com/in/ishita' } }, { id: 2, name: 'Council Person', is_council: true, is_head: false }];
  await act(async () => root.render(<TeamMembersManagement />)); expect(container.textContent).not.toContain('Council Person');
  await click('Edit Ishita Sen'); expect(document.body.textContent).not.toContain('LinkedIn URL'); expect(document.querySelector('input[type="email"]')).toBeNull();
  await change('family-person-instagram', '@ishita.sen'); await click('Save Changes');
  const payload = mocks.update.mock.calls[0][1]; expect(payload.social_links.linkedin).toBe('https://linkedin.com/in/ishita'); expect(payload.phone).toBe('+91 98300 00011'); expect(payload.role).toBe('Existing designation');
});
it('creates a council profile with an optional department and saves inside the dialog', async () => {
  await act(async () => root.render(<CouncilManagement />)); await click('Add Council Person');
  expect(document.getElementById('family-person-committee')).not.toBeNull();
  await change('family-person-name', 'Aditi Das'); await click('Upload photo');
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Save Changes'); await click('Save Changes');
  expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({ committee_id: null, is_head: false, is_council: true }));
});
it('retains failed approval requests and offers a retry', async () => {
  mocks.requiresApproval = true; mocks.approval.mockResolvedValueOnce({ success: false, error: 'offline' });
  await act(async () => root.render(<CouncilManagement />)); await click('Add Council Person'); await change('family-person-name', 'Aditi Das'); await click('Upload photo'); await click('Save Changes');
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('Could not save'); expect(mocks.add).not.toHaveBeenCalled();
  expect((document.getElementById('family-person-name') as HTMLInputElement).value).toBe('Aditi Das'); await click('Save Changes'); expect(mocks.approval).toHaveBeenCalledTimes(2); expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it('keeps invalid Instagram input in the form without writing a broken profile', async () => {
  await act(async () => root.render(<CouncilManagement />)); await click('Add Council Person'); await change('family-person-name', 'Aditi Das'); await click('Upload photo'); await change('family-person-instagram', 'https://example.com'); await click('Save Changes');
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('valid Instagram'); expect(mocks.add).not.toHaveBeenCalled();
});

it('offers the requested profile, batch and contact fields without descriptions', async () => {
  await act(async () => root.render(<TeamMembersManagement isHeadMode />)); await click('Add Head');
  expect([...document.querySelectorAll('[role="dialog"] input,[role="dialog"] select,[role="dialog"] textarea')].map(node=>node.id)).toEqual(['family-person-name','family-person-committee','family-person-batch','family-person-phone','family-person-instagram']);
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Upload photo');
  expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('Description');
});
it('persists department order and visibility so Tech can appear first', async () => {
  mocks.departments = [{id:2,name:'Cultural Team',order_position:1,enabled:true},{id:1,name:'Tech Team',order_position:2,enabled:true}];
  await act(async () => root.render(<CommitteesManagement />));
  await click('Move Tech Team up');
  expect(mocks.updateDepartment).toHaveBeenCalledWith(1,{order_position:1});
  expect(mocks.updateDepartment).toHaveBeenCalledWith(2,{order_position:2});
  expect([...container.querySelectorAll('ol > li h3')].map(node=>node.textContent)).toEqual(['Tech Team','Cultural Team']);
  await click('Hide Tech Team'); expect(mocks.updateDepartment).toHaveBeenCalledWith(1,{enabled:false}); await act(async () => root.render(<CommitteesManagement />)); expect(container.querySelector('[aria-label="Show Tech Team"]')).not.toBeNull();
});
it('creates a department that can be selected for profiles without writing profile descriptions', async () => {
  await act(async () => root.render(<CommitteesManagement />)); await click('Create Department');
  await change('family-department-name','Media Team'); await change('family-department-subtitle','Photography · Design'); await click('Save Department');
  expect(mocks.addDepartment).toHaveBeenCalledWith(expect.objectContaining({name:'Media Team',description:'Photography · Design',order_position:2,enabled:true}));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it('submits department visibility changes for approval when the account requires it', async () => {
  mocks.requiresApproval=true;
  await act(async () => root.render(<CommitteesManagement />)); await click('Hide Tech Team');
  expect(mocks.approval).toHaveBeenCalledWith('core_committee','update',{enabled:false},1); expect(mocks.updateDepartment).not.toHaveBeenCalled();
});

it('saves phone and batch for heads and clears them without changing other social metadata',async()=>{
 mocks.people=[{id:1,name:'Neel',image:'/neel.jpg',enabled:true,is_head:true,committee_id:1,phone:'+91 98300 00011',social_links:{instagram:'@neel',batch:'2023–2028',linkedin:'https://linkedin.com/in/neel'},order_position:1}];
 await act(async()=>root.render(<TeamMembersManagement isHeadMode/>));await click('Edit Neel');
 expect((document.getElementById('family-person-batch') as HTMLInputElement).value).toBe('2023–2028');
 await change('family-person-phone','');await change('family-person-batch','');await click('Save Changes');
 expect(mocks.update).toHaveBeenCalledWith(1,expect.objectContaining({phone:null,social_links:expect.objectContaining({batch:'',linkedin:'https://linkedin.com/in/neel'})}));
});
it('simplifies faculty fields and saves normalized phone, batch and social links',async()=>{
 await act(async()=>root.render(<FacultyHeadsManagement/>));await click('Add Faculty Head');
 expect(document.querySelector('[role="dialog"] input[type="email"]')).toBeNull();expect(document.body.textContent).not.toMatch(/Display Order|LinkedIn|Spotify|YouTube/);
 await change('faculty-person-name','Dr. Sen');await change('faculty-person-title','Faculty convenor');await change('faculty-person-phone','+91 98300 00011');await change('faculty-person-batch','2006');await change('faculty-person-instagram','@faculty.sen');await change('faculty-person-facebook','faculty.sen');await click('Upload photo');await click('Save Changes');
 expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({name:'Dr. Sen',title:'Faculty convenor',phone:'+91 98300 00011',social_links:{instagram:'https://www.instagram.com/faculty.sen/',facebook:'https://www.facebook.com/faculty.sen/',batch:'2006'}}));expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it('preserves faculty legacy fields and keeps failed approval edits available for retry',async()=>{
 mocks.requiresApproval=true;mocks.approval.mockResolvedValueOnce({success:false,error:'offline'});
 mocks.faculty=[{id:9,name:'Dr. Roy',title:'Convenor',image:'/roy.jpg',phone:'+91 98300 00011',enabled:true,order_position:3,email:'retained@example.com',description:'Preserved biography',social_links:{instagram:'@roy',youtube:'https://youtube.com/@roy',batch:'2004'}}];
 await act(async()=>root.render(<FacultyHeadsManagement/>));await click('Edit faculty head');await change('faculty-person-phone','');await change('faculty-person-batch','2005');await click('Save Changes');
 expect(document.querySelector('[role="alert"]')?.textContent).toContain('Could not save');expect((document.getElementById('faculty-person-batch') as HTMLInputElement).value).toBe('2005');await click('Save Changes');
 const payload=mocks.approval.mock.calls[1][2];expect(payload.phone).toBeNull();expect(payload.social_links.youtube).toBe('https://youtube.com/@roy');expect(payload.social_links.batch).toBe('2005');expect(payload).not.toHaveProperty('email');expect(payload).not.toHaveProperty('description');expect(payload.order_position).toBe(3);expect(mocks.update).not.toHaveBeenCalled();
});
