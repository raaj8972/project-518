import{beforeEach,afterEach,expect,it,vi}from'vitest';
import{openCoordinatorPassword,sealCoordinatorPassword}from'../netlify/functions/lib/coordinator-password-vault';
beforeEach(()=>vi.stubEnv('COORDINATOR_PASSWORD_VAULT_KEY','fixture-vault-key-with-sufficient-entropy'));
afterEach(()=>vi.unstubAllEnvs());
it('encrypts recoverable copies with randomized authenticated encryption',()=>{const first=sealCoordinatorPassword('event-1','fixture-password'),second=sealCoordinatorPassword('event-1','fixture-password');expect(first).not.toContain('fixture-password');expect(second).not.toBe(first);expect(openCoordinatorPassword('event-1',first)).toBe('fixture-password');});
it('rejects tampering, moving the copy to another event, or using a different key',()=>{const sealed=sealCoordinatorPassword('event-1','fixture-password');expect(()=>openCoordinatorPassword('event-2',sealed)).toThrow();const pieces=sealed.split('.');pieces[3]=Buffer.from('modified').toString('base64url');expect(()=>openCoordinatorPassword('event-1',pieces.join('.'))).toThrow();vi.stubEnv('COORDINATOR_PASSWORD_VAULT_KEY','a-different-fixture-key');expect(()=>openCoordinatorPassword('event-1',sealed)).toThrow();});
