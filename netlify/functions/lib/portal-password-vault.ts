import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
const key=()=>{
 const secret=process.env.PORTAL_PASSWORD_VAULT_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE;
 if(!secret)throw new Error('Credential storage unavailable');
 return Buffer.from(hkdfSync('sha256',secret.trim(),'ricorrenza-portal-vault-v1','aes-256-gcm',32));
};
export function sealPortalPassword(identity:string,password:string){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(identity));
 const encrypted=Buffer.concat([cipher.update(password,'utf8'),cipher.final()]);
 return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');
}
export function openPortalPassword(identity:string,value:string){
 const [version,iv,tag,encrypted,...extra]=value.split('.');
 if(version!=='v1'||!iv||!tag||!encrypted||extra.length)throw new Error('Saved copy unavailable');
 const cipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64url'));cipher.setAAD(Buffer.from(identity));cipher.setAuthTag(Buffer.from(tag,'base64url'));
 return Buffer.concat([cipher.update(Buffer.from(encrypted,'base64url')),cipher.final()]).toString('utf8');
}
