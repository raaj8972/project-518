import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {beforeAll,afterAll,expect,it} from 'vitest';
const db=new PGlite();
beforeAll(async()=>{
 const source=await readFile(new URL('../supabase/migrations/20260326000000_baseline.sql',import.meta.url),'utf8');const table=source.match(/CREATE TABLE IF NOT EXISTS "public"\."shoutouts" \([\s\S]*?\n\);/);if(!table)throw new Error('Missing real shoutouts schema');await db.exec(table[0]);
 await db.exec("CREATE TABLE site_settings(id int,shoutouts_enabled boolean,shoutouts_daily_limit int,shoutouts_expiry_hours int);INSERT INTO site_settings VALUES(1,false,81,22);INSERT INTO shoutouts(user_id,message,is_approved)VALUES('00000000-0000-0000-0000-000000000001','Existing message',false);");
 await db.exec(await readFile(new URL('../supabase/migrations/20261109010000_shoutouts_auto_approve.sql',import.meta.url),'utf8'));
});
afterAll(()=>db.close());
it('publishes new messages automatically including requests from clients sending false/null',async()=>{
 for(const flag of [false,null,true]){const result=await db.query<{is_approved:boolean}>('INSERT INTO shoutouts(user_id,message,is_approved)VALUES($1,$2,$3)RETURNING is_approved',['00000000-0000-0000-0000-000000000001','Auto-publish test',flag]);expect(result.rows[0].is_approved).toBe(true);}
 const result=await db.query<{is_approved:boolean}>("INSERT INTO shoutouts(user_id,message)VALUES('00000000-0000-0000-0000-000000000001','Default publish')RETURNING is_approved");expect(result.rows[0].is_approved).toBe(true);
});
it('releases old queued messages and retains their actual content',async()=>{
 const result=await db.query<{message:string;is_approved:boolean}>("SELECT message,is_approved FROM shoutouts WHERE message='Existing message'");expect(result.rows).toEqual([{message:'Existing message',is_approved:true}]);
});
it('keeps message limits, visibility configuration and the maximum message length intact',async()=>{
 const settings=await db.query('SELECT * FROM site_settings');expect(settings.rows[0]).toMatchObject({shoutouts_enabled:false,shoutouts_daily_limit:81,shoutouts_expiry_hours:22});
 await expect(db.query('INSERT INTO shoutouts(user_id,message)VALUES($1,$2)',['00000000-0000-0000-0000-000000000001','x'.repeat(151)])).rejects.toThrow();
});
