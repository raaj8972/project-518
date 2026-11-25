import { expect, it } from 'vitest';
import { eventWindow, findScheduleClashes } from '../src/utils/scheduleClashes';
const event=(id:string,time:string,date='2026-11-23')=>({id,title:id,date,time});
it('detects actual overlaps, not adjacent slots, with both AM/PM and 24-hour schedules',()=>{
  expect(findScheduleClashes([event('band','10:00 AM - 12:00 PM')],[event('dance','11:30 - 13:00')])[0].definite).toBe(true);
  expect(findScheduleClashes([event('band','10:00 AM - 12:00 PM')],[event('dance','12:00 - 13:00')])).toEqual([]);
  expect(eventWindow(event('night','11 PM - 1 AM'))!.end!-eventWindow(event('night','11 PM - 1 AM'))!.start).toBe(7200000);
  expect(findScheduleClashes([event('early','00:30 - 01:30','2026-11-24')],[event('night','23:00 - 01:00')])).toHaveLength(1);
});
it('checks clashes between cart items and does not warn against the same existing event',()=>{
  expect(findScheduleClashes([event('band','10:00 - 12:00'),event('dance','11:00 - 13:00')],[])).toHaveLength(1);
  expect(findScheduleClashes([event('band','10:00 - 12:00')],[event('band','10:00 - 12:00')])).toEqual([]);
});
it('does not invent an end time and labels uncertain same-day schedules as possible conflicts',()=>{
  expect(findScheduleClashes([event('band','10:00')],[event('dance','17:00')])[0].definite).toBe(false);
  expect(findScheduleClashes([event('band','10:00 - 12:00')],[event('dance','17:00')])).toEqual([]);
  expect(findScheduleClashes([event('band','TBA')],[event('dance','17:00')])).toEqual([]);
  expect(eventWindow(event('bad','25:60'))).toBeNull();
  expect(eventWindow(event('bad','10:00','2026-02-31'))).toBeNull();
});
