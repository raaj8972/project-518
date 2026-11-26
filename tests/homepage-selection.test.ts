import { expect,it } from 'vitest';
import { selectHomepageEvents, resolveHomepagePartners, indiaDayKey } from '../src/utils/homepageContent';
import type { Event,Sponsor } from '../src/types/data';
const event=(id:number,date:string,count:number,visible=true)=>({id,date,current_registrations:count,visible,featured:true,title:`Event ${id}`} as Event);
const sponsor=(id:number)=>({id,name:`Partner ${id}`,logo:`logo-${id}.png`,featured:true,order_position:id,website:null,category:'Partners',description:'',created_at:''} as Sponsor);
it('prioritizes today and upcoming dates, with registration totals breaking same-day ties',()=>{
 const result=selectHomepageEvents([event(1,'2026-11-08',10),event(2,'2026-11-08',60),event(3,'2026-11-09',900),event(4,'2026-11-07',5000),event(5,'2026-11-08',999,false)],new Date('2026-11-08T10:00:00Z'));
 expect(result.map(item=>item.id)).toEqual([2,1,3]);
});
it('rolls the featured day over at India midnight without mutating manual flags',()=>{
 const source=[event(1,'2026-11-08',20),event(2,'2026-11-09',10)];
 expect(indiaDayKey(new Date('2026-11-08T18:31:00Z'))).toBe('2026-11-09');
 expect(selectHomepageEvents(source,new Date('2026-11-08T18:31:00Z')).map(item=>item.id)).toEqual([2]); expect(source).toHaveLength(2);
});
it('follows the Events page featured flag without filling empty slots with unfeatured events',()=>{
 const now=new Date('2026-11-08T10:00:00Z');
 const selected=event(1,'2026-11-09',10);
 const unfeatured={...event(2,'2026-11-08',900),featured:false};
 const hidden=event(3,'2026-11-08',1000,false);
 const past=event(4,'2026-11-07',1000);
 const undated={...event(5,'',20),date:null} as unknown as Event;
 expect(selectHomepageEvents([unfeatured,hidden,past,undated,selected],now).map(item=>item.id)).toEqual([1,5]);
 expect(selectHomepageEvents([{...selected,featured:false},unfeatured,hidden,past],now)).toEqual([]);
 expect(selectHomepageEvents([{...unfeatured,featured:true}],now).map(item=>item.id)).toEqual([2]);
 expect(selected.featured).toBe(true);expect(unfeatured.featured).toBe(false);
});
it('uses previous logos until a complete enabled current partner is published',()=>{
 const previous={id:'old',name:'Previous supporter',logo_url:'old.png',enabled:true,order:1,period:'previous'};
 const current={id:'new',name:'New supporter',logo_url:'',enabled:true,order:1,period:'current'};
 expect(resolveHomepagePartners([sponsor(1)],[previous,current]).period).toBe('previous');
 const selected=resolveHomepagePartners([sponsor(1)],[previous,{...current,logo_url:'new.png'}]);
 expect(selected.period).toBe('current');expect(selected.partners.map(item=>item.logo)).toEqual(['new.png']);
 expect(resolveHomepagePartners([sponsor(1)],[previous,{...current,logo_url:'new.png',enabled:false}]).partners.map(item=>item.logo)).toContain('old.png');
});
it('preserves existing sponsor records as previous partners before a display list is configured',()=>{
 const records=[sponsor(1),sponsor(2)];const result=resolveHomepagePartners(records,[]);
 expect(result.period).toBe('previous');expect(result.partners).toHaveLength(2);expect(records[0]).not.toHaveProperty('period');
});
it('respects explicitly hidden previous logos instead of leaking the fallback catalog back in',()=>{
 const result=resolveHomepagePartners([sponsor(1)],[{id:'old',sponsor_id:1,name:'Old',logo_url:'old.png',enabled:false,period:'previous'}]);expect(result.partners).toHaveLength(0);
});

it('uses catalog details and featured flags directly without stale copied logos',()=>{
 const records=[{...sponsor(1),name:'Updated company',logo:'updated.png',featured:false},sponsor(2)];
 const placements=[{id:'linked',sponsor_id:1,name:'Old company',logo_url:'old.png',enabled:true,period:'current'},{id:'linked2',sponsor_id:2,enabled:true,period:'current'}];
 expect(resolveHomepagePartners(records,placements).partners.map(item=>item.logo)).toEqual(['updated.png','logo-2.png']);
 expect(resolveHomepagePartners(records,placements,{featuredOnly:true}).partners.map(item=>item.id)).toEqual([2]);
});
it('does not resurrect deleted catalog records and keeps the same active edition when Home has no featured sponsors',()=>{
 const placements=[{id:'deleted',sponsor_id:99,name:'Deleted',logo_url:'deleted.png',enabled:true,period:'current'},{id:'old',name:'Previous',logo_url:'previous.png',period:'previous',enabled:true}];
 expect(resolveHomepagePartners([],placements).partners.map(item=>item.logo)).toEqual(['previous.png']);
 const current=[{...sponsor(1),featured:false}];const selection=[{id:'new',sponsor_id:1,period:'current',enabled:true}];
 expect(resolveHomepagePartners(current,selection,{featuredOnly:true})).toEqual({period:'current',partners:[]});
});
