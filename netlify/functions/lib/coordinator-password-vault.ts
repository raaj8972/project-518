import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

const key = () => {
  const secret=process.env.COORDINATOR_PASSWORD_VAULT_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if(!secret)throw new Error('Credential storage is unavailable.');
  return Buffer.from(hkdfSync('sha256',secret.trim(),'ricorrenza-coordinator-vault-v1','aes-256-gcm',32));
};
export function sealCoordinatorPassword(eventId:string,password:string){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
  cipher.setAAD(Buffer.from(`coordinator:${eventId}`));
  const encrypted=Buffer.concat([cipher.update(password,'utf8'),cipher.final()]);
  return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');
}
export function openCoordinatorPassword(eventId:string,sealed:string){
  const [version,iv,tag,encrypted,...extra]=sealed.split('.');
  if(version!=='v1'||!iv||!tag||!encrypted||extra.length)throw new Error('Saved password copy is unavailable.');
  const decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64url'));
  decipher.setAAD(Buffer.from(`coordinator:${eventId}`));decipher.setAuthTag(Buffer.from(tag,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted,'base64url')),decipher.final()]).toString('utf8');
}
