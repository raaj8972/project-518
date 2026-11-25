import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const tracked=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean))];
const findings=[];
const patterns=[['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],['provider credential',/\b(?:sb_secret_[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-proj-[A-Za-z0-9_-]{25,})\b/g]];
const privateValues=new Map();
for(const name of ['.env','.env.local']) {
 if(!fs.existsSync(name))continue;
 for(const match of fs.readFileSync(name,'utf8').matchAll(/^([A-Z0-9_]+)\s*=\s*(.*)$/gm)) {
  const [,,raw]=match;const value=raw.trim().replace(/^(['"])(.*)\1$/,'$2');
  if(/(?:SECRET|PASSWORD|SERVICE_ROLE|R2_ACCESS_KEY_ID|BYPASS|PRIVATE_KEY|PASSCODE|MASTER|TOKEN|SMTP_PASS|GOOGLE_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY)/.test(match[1]) && value.length>=16 && !/your[-_]|replace|redact|placeholder|example|change.?me/i.test(value))privateValues.set(value,match[1]);
 }
}
function scan(file,artifact=false) {
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()||fs.statSync(file).size>20*1024*1024)return;
 const text=fs.readFileSync(file,'utf8');if(text.includes('\0'))return;
 for(const [kind,pattern] of patterns) for(const match of text.matchAll(pattern))findings.push({file,line:text.slice(0,match.index).split('\n').length,kind});
 for(const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
  try {if(JSON.parse(Buffer.from(match[1],'base64url').toString()).role==='service_role')findings.push({file,line:text.slice(0,match.index).split('\n').length,kind:'privileged Supabase key'});}catch{}
 }
 for(const [value,name] of privateValues)if(text.includes(value))findings.push({file,kind:`private environment value (${name})`});
 if(artifact&&/(?:^|\/)(?:\.env[^/]*|\.git|[^/]+\.(?:sql|pem|key|bak|map))$/.test(file))findings.push({file,kind:'private deployment artifact'});
}
for(const file of tracked){
 if(/^\.env(?:$|\.)/.test(file)&&!/^\.env(?:\.local)?\.example$/.test(file))findings.push({file,kind:'tracked credential file'});
 if(!/^tests\//.test(file))scan(file);
}
function walk(root) {
 if(!fs.existsSync(root))return;
 for(const entry of fs.readdirSync(root,{withFileTypes:true})){
  const file=path.join(root,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile())scan(file,true);
 }
}
walk('public');if(process.argv.includes('--dist'))walk('dist');
let historyBlobs=0;
if(process.argv.includes('--history')){
 const paths=new Map(execFileSync('git',['rev-list','--objects','--all'],{encoding:'utf8',maxBuffer:32*1024*1024}).trim().split('\n').map(line=>{const index=line.indexOf(' ');return[index<0?line:line.slice(0,index),index<0?'':line.slice(index+1)];}));
 const candidates=[...paths].filter(([,file])=>file&&(/\.(?:[cm]?[jt]sx?|json|sql|txt|md|ya?ml|toml|env)$/.test(file)||/(?:^|\/)\.env(?:[.][^/]*)?$/.test(file)));
 const check=execFileSync('git',['cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],{input:candidates.map(([oid])=>oid).join('\n')+'\n',encoding:'utf8',maxBuffer:16*1024*1024});
 const blobs=check.trim().split('\n').map(line=>line.split(' ')).filter(([,type,size])=>type==='blob'&&Number(size)<20*1024*1024).map(([oid])=>oid);
 if(blobs.length){
  const batch=execFileSync('git',['cat-file','--batch'],{input:blobs.join('\n')+'\n',maxBuffer:512*1024*1024});let offset=0;
  while(offset<batch.length){
   const end=batch.indexOf(10,offset);if(end<0)break;const[oid,,size]=batch.subarray(offset,end).toString().split(' ');offset=end+1;const content=batch.subarray(offset,offset+Number(size));offset+=Number(size)+1;
   if(content.includes(0))continue;historyBlobs++;
   const text=content.toString('utf8'),file='history:'+oid.slice(0,12)+':'+paths.get(oid);
   for(const[kind,pattern]of patterns)for(const match of text.matchAll(pattern))findings.push({file,line:text.slice(0,match.index).split('\n').length,kind});
   for(const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)){try{if(JSON.parse(Buffer.from(match[1],'base64url').toString()).role==='service_role')findings.push({file,kind:'historical privileged Supabase key'});}catch{}}
   for(const[value,name]of privateValues)if(text.includes(value))findings.push({file,kind:'historical private environment value ('+name+')'});
  }
 }
}
const unique=[...new Map(findings.map(f=>[JSON.stringify(f),f])).values()];
console.log(JSON.stringify({scannedTrackedFiles:tracked.length,distIncluded:process.argv.includes('--dist'),historyBlobs,findings:unique},null,2));
if(unique.length)process.exitCode=1;
