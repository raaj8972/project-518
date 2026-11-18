import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';

it('keeps the Vercel deployment compatible with daily-only Hobby cron scheduling',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 expect(config.crons.map((job:{path:string})=>job.path)).toEqual(['/api/r2-garbage-collector','/api/heartbeat-schedule','/api/broadcast-schedule']);
 for(const job of config.crons){
  const [minute,hour,day,month,weekday]=job.schedule.split(' ');
  expect(minute).toMatch(/^\d+$/);expect(Number(minute)).toBeLessThan(60);
  expect(hour).toMatch(/^\d+$/);expect(Number(hour)).toBeLessThan(24);
  expect([day,month,weekday]).toEqual(['*','*','*']);
 }
});
