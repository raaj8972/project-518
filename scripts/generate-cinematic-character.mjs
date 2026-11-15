/**
 * Original RICORRENZA gate warden. No third party models or textures.
 * Rebuild with: node scripts/generate-cinematic-character.mjs
 * Refined procedural prototype: sculpted mask, weighted cloth, 20 bones.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import sharp from 'sharp';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
};
const root = new THREE.Group(); root.name = 'Ricorrenza_Warden';
root.userData = { artist: 'Original procedural RICORRENZA warden', style: 'Sculpted masked emerald pilgrim, art pass 2', forward: '-Z', units: 'metres', version: 2 };
const bones = [], boneIndex = {}, bind = {};
function bone(name, position, parent) {
  const b = new THREE.Bone(); b.name = name; b.position.fromArray(position);
  if (parent) bones[boneIndex[parent]].add(b); else root.add(b);
  boneIndex[name] = bones.length; bones.push(b); return b;
}
bone('Hips', [0, 1.4, 0]); bone('Spine', [0,.38,0], 'Hips'); bone('Chest', [0,.43,0], 'Spine');
bone('Neck', [0,.22,0], 'Chest'); bone('Head', [0,.19,0], 'Neck');
for (const side of [-1,1]) {
  const s = side < 0 ? 'L' : 'R';
  bone(`${s}_UpperArm`, [side*.48,.08,0], 'Chest'); bone(`${s}_Forearm`, [side*.12,-.42,0], `${s}_UpperArm`); bone(`${s}_Hand`, [0,-.39,0], `${s}_Forearm`);
  bone(`${s}_Thigh`, [side*.22,-.03,0], 'Hips'); bone(`${s}_Shin`, [0,-.63,0], `${s}_Thigh`); bone(`${s}_Foot`, [0,-.6,0], `${s}_Shin`);
}
bone('Cape_Upper', [0,.12,.19], 'Chest'); bone('Cape_Middle', [0,-.72,.18], 'Cape_Upper'); bone('Cape_Lower', [0,-.8,.2], 'Cape_Middle');
root.updateMatrixWorld(true);
bones.forEach(b => { bind[b.name] = b.getWorldPosition(new THREE.Vector3()); });
const skeleton = new THREE.Skeleton(bones);
const mats = {
  armor: new THREE.MeshStandardMaterial({ name: 'Obsidian sculpted plate', color: '#3f4944', metalness:.8, roughness:.49 }),
  silver: new THREE.MeshStandardMaterial({ name: 'Forged silver mask', color:'#9baba5', metalness:.9, roughness:.4 }),
  gold: new THREE.MeshStandardMaterial({ name: 'Antique brushed gold', color:'#a88b50', metalness:.88, roughness:.48 }),
  cloth: new THREE.MeshStandardMaterial({ name: 'Emerald woven cloth', color:'#083b2a', metalness:.02, roughness:.94, side:THREE.DoubleSide }),
  dark: new THREE.MeshStandardMaterial({ name: 'Black leather and mask', color:'#09100e', metalness:.12, roughness:.88 }),
  glow: new THREE.MeshStandardMaterial({ name: 'Emerald eye slits', color:'#729889', emissive:'#45a784', emissiveIntensity:.65, roughness:.6 }),
};
const batches = Object.fromEntries(Object.keys(mats).map(key=>[key,[]]));
function add(geometry, mat, name, position=[0,0,0], scale=[1,1,1], rotation=[0,0,0]) {
  const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
  geometry.applyMatrix4(matrix);
  if (name === 'Head') {
    const pivot = bind.Head;
    geometry.translate(-pivot.x,-pivot.y,-pivot.z).scale(.92,.88,.94).translate(pivot.x,pivot.y,pivot.z);
  }
  if (geometry.index) geometry = geometry.toNonIndexed();
  const count = geometry.attributes.position.count;
  if(!geometry.attributes.uv) {
    const uv=[];const p=geometry.attributes.position;
    for(let i=0;i<count;i++)uv.push(p.getX(i)*1.5,p.getY(i)*1.5);
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  }
  const indices = new Uint16Array(count*4), weights = new Float32Array(count*4);
  for(let i=0;i<count;i++){indices[i*4]=boneIndex[name];weights[i*4]=1;}
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4)); geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  batches[mat].push(geometry);
}
function plate(points, depth=.12) {
  const shape = new THREE.Shape(); points.forEach(([x,y],i)=>i ? shape.lineTo(x,y) : shape.moveTo(x,y)); shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape,{ depth, bevelEnabled:true, bevelSegments:3, steps:1, bevelSize:.025, bevelThickness:.02, curveSegments:5 }); geom.center(); return geom;
}
function oval(mat, joint, p, s, segments=14) { add(new THREE.SphereGeometry(1,segments,10),mat,joint,p,s); }
function limb(joint, end, width, depth) {
  const p=bind[joint], q=bind[end], d=q.clone().sub(p), length=d.length();
  const g=new THREE.CylinderGeometry(width*.76,width,length,14,1); const quat=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()); g.applyQuaternion(quat); g.translate(...p.clone().add(q).multiplyScalar(.5).toArray());
  add(g,'dark',joint,[0,0,0],[1,1,depth/width]);
}
// Multi-layer torso silhouette: shield breastplate, rib plates, articulated fauld.
oval('dark','Spine',[0,1.78,.04],[.39,.5,.22]);
// Convex breastplate and an open neckline, rather than a flat shield at the throat.
function chestPoint(u,v) {
 const x=(u-.5)*.84,side=Math.abs(u*2-1);
 return [x,THREE.MathUtils.lerp(1.74+side*.15,2.28+side*.08,v),-.22-.16*Math.pow(1-side,.75)+Math.sin(v*Math.PI)*-.035];
}
{
 const p=[],uv=[],idx=[],cols=28,rows=22;
 for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){p.push(...chestPoint(c/cols,r/rows));uv.push(c/cols,r/rows);}
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(g,'armor','Chest');
 for(const [a,b] of [[[0,0],[1,0]],[[0,1],[1,1]],[[0,0],[0,1]],[[1,0],[1,1]]]){
  const points=Array.from({length:25},(_,i)=>{const f=i/24,p=chestPoint(THREE.MathUtils.lerp(a[0],b[0],f),THREE.MathUtils.lerp(a[1],b[1],f));p[2]-=.005;return new THREE.Vector3(...p);});
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.005,5,false),'gold','Chest');
 }
}
for(let i=0;i<4;i++) {
  const w=.34-i*.035;
  add(plate([[-w,.07],[w,.07],[w*.87,-.06],[0,-.11],[-w*.87,-.06]],.09),'armor','Spine',[0,1.84-i*.125,-.21]);
  add(new THREE.BoxGeometry(w*1.8,.015,.025),'gold','Spine',[0,1.83-i*.125,-.28]);
}
add(plate([[0,.15],[.11,0],[0,-.15],[-.11,0]],.03),'gold','Chest',[0,2.11,-.38]);
add(plate([[0,.1],[.065,0],[0,-.1],[-.065,0]],.03),'cloth','Chest',[0,2.11,-.41]);
add(new THREE.CylinderGeometry(.33,.35,.13,10),'gold','Hips',[0,1.46,0],[1,1,.7]);
for (const side of [-1,1]) {
 const s=side<0?'L':'R';
 limb(`${s}_UpperArm`,`${s}_Forearm`,.16,.15); limb(`${s}_Forearm`,`${s}_Hand`,.115,.12);
 limb(`${s}_Thigh`,`${s}_Shin`,.17,.16); limb(`${s}_Shin`,`${s}_Foot`,.12,.12);
 // Angular forged pauldrons: swept overlapping shells rather than spheres.
 function shoulderShell(rx,rz) {
  const p=[],uv=[],idx=[],segments=32;
  for(let r=0;r<4;r++)for(let c=0;c<=segments;c++){
   const f=[0,.34,.75,1][r],a=c/segments*Math.PI*2;
   const sculpt=Math.cos(a*4)*.014*f;
   p.push(Math.sin(a)*rx*f, [.165,.15,.055,-.04][r]+sculpt,Math.cos(a)*rz*f);
   uv.push(c/segments,r/3);
  }
  // Outward/upward winding: reversed faces previously hid the curved caps.
  for(let r=0;r<3;r++)for(let c=0;c<segments;c++){const a=r*(segments+1)+c,b=a+segments+1;idx.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
 }
 for(let i=0;i<3;i++) {
  const p=[side*(.51+i*.04),2.26-i*.103,.015];
  add(shoulderShell(.35-i*.035,.32-i*.02),'gold',`${s}_UpperArm`,p);
  add(shoulderShell(.346-i*.035,.316-i*.02),'armor',`${s}_UpperArm`,[p[0],p[1]+.006,p[2]]);
  for(let ridge=0;ridge<3;ridge++){
    const x=p[0]+side*(ridge-1)*.065;
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,p[1]+.10,-.21),new THREE.Vector3(x+side*.035,p[1]+.17,0),new THREE.Vector3(x,p[1]+.10,.22)]);
    add(new THREE.TubeGeometry(curve,12,.005,4,false),'gold',`${s}_UpperArm`);
  }
 }
 const arm=bind[`${s}_UpperArm`], fore=bind[`${s}_Forearm`], hand=bind[`${s}_Hand`], thigh=bind[`${s}_Thigh`], shin=bind[`${s}_Shin`], foot=bind[`${s}_Foot`];
 add(plate([[-.13,.19],[.13,.19],[.11,-.17],[0,-.24],[-.11,-.17]],.11),'armor',`${s}_UpperArm`,[arm.x+side*.07,arm.y-.21,-.12]);
 oval('gold',`${s}_Forearm`,[fore.x,fore.y,-.06],[.15,.15,.16]);
 add(plate([[-.13,.19],[.13,.19],[.09,-.2],[-.09,-.2]],.13),'armor',`${s}_Forearm`,[fore.x,fore.y-.2,-.08]);
 add(new THREE.CylinderGeometry(.13,.12,.045,8),'gold',`${s}_Forearm`,[hand.x,hand.y+.09,0]);
 oval('dark',`${s}_Hand`,[hand.x,hand.y-.09,-.04],[.115,.16,.1]);
 for(let k=0;k<4;k++) {
  const x=hand.x+(k-1.5)*.043;
  oval('armor',`${s}_Hand`,[x,hand.y-.06,-.118],[.024,.037,.025],10);
  oval('dark',`${s}_Hand`,[x,hand.y-.125,-.095],[.023,.06,.027],10);
 }
 oval('dark',`${s}_Hand`,[hand.x-side*.1,hand.y-.06,-.09],[.035,.075,.033],10);
 add(plate([[-.17,.2],[.17,.2],[.12,-.29],[0,-.34],[-.12,-.29]],.13),'armor',`${s}_Thigh`,[thigh.x,thigh.y-.27,-.15]);
 add(new THREE.BoxGeometry(.025,.37,.035),'gold',`${s}_Thigh`,[thigh.x,thigh.y-.25,-.245]);
 oval('gold',`${s}_Shin`,[shin.x,shin.y,-.09],[.16,.15,.16]);
 add(plate([[-.1,.12],[0,.19],[.1,.12],[.11,-.07],[0,-.14],[-.11,-.07]],.12),'armor',`${s}_Shin`,[shin.x,shin.y,-.2]);
 add(plate([[-.13,.23],[.13,.23],[.095,-.23],[-.095,-.23]],.1),'armor',`${s}_Shin`,[shin.x,shin.y-.29,-.11]);
 add(new THREE.BoxGeometry(.02,.42,.02),'gold',`${s}_Shin`,[shin.x,shin.y-.29,-.19]);
 oval('armor',`${s}_Foot`,[foot.x,.115,-.1],[.15,.115,.29]);
 add(new THREE.BoxGeometry(.27,.045,.47),'dark',`${s}_Foot`,[foot.x,.0225,-.09]);
 // Split hip guard and draped cloth tabard over each thigh.
 add(plate([[-.19,.2],[.19,.2],[.15,-.24],[0,-.33],[-.14,-.24]],.07),'gold',`${s}_Thigh`,[side*.25,1.25,-.1],[1.04,1.04,1]);
 add(plate([[-.19,.2],[.19,.2],[.15,-.24],[0,-.33],[-.14,-.24]],.09),'armor',`${s}_Thigh`,[side*.25,1.25,-.13]);
}
// The hood is an open sculpted shell, not a sphere with a painted face.
function hood() {
 const vertices=[], indices=[],uv=[],rings=24, columns=64;
 const levels=[[2.35,.3,.24],[2.46,.33,.28],[2.62,.32,.29],[2.81,.26,.24],[2.96,.12,.14],[3.025,.006,.01]];
 for(let r=0;r<=rings;r++) {
  const v=r/rings,level=v*(levels.length-1),lower=Math.min(levels.length-2,Math.floor(level)),f=level-lower;
  const l=levels[lower],h=levels[lower+1],y=THREE.MathUtils.lerp(l[0],h[0],f),rx=THREE.MathUtils.lerp(l[1],h[1],f),rz=THREE.MathUtils.lerp(l[2],h[2],f);
  for(let c=0;c<=columns;c++){
   const a=(c/columns)*Math.PI*2;
   const fold=Math.sin(a*9+v*.8)*.008*Math.sin(v*Math.PI);
   let z=Math.cos(a)*(rz+fold)+.035;
   let yy=y;
   if(Math.cos(a)<-.35 && v<.7){z=-.19-Math.pow(-Math.cos(a),3)*.045;yy+=Math.pow(-Math.cos(a),4)*.12;}
   vertices.push(Math.sin(a)*(rx+fold),yy,z);uv.push(c/columns,v);
  }
 }
 for(let r=0;r<rings;r++)for(let c=0;c<columns;c++){
  const a=r*(columns+1)+c,b=a+columns+1;
  const front=Math.cos((c+.5)/columns*Math.PI*2)<-.5;
  if(front && r<16)continue;
  indices.push(a,a+1,b,a+1,b+1,b);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
add(hood(),'cloth','Head');
// A single draped collar surface with irregular folds, not stacked neck rings.
{
 const p=[],uv=[],indices=[],columns=64,rings=10;
 for(let r=0;r<=rings;r++)for(let c=0;c<=columns;c++) {
  const v=r/rings,a=c/columns*Math.PI*2;
  const radius=.47-.2*v +Math.sin(v*Math.PI*2)*.012;
  const fold=Math.sin(a*7+v*2)*.012+Math.cos(a*3-v)*.009;
  p.push(Math.sin(a)*(radius+fold)*1.08,2.16+v*.26+Math.sin(a*3+.6)*.018*(1-v),Math.cos(a)*(radius+fold)*.72+.025);
  uv.push(c/columns,v);
 }
 for(let r=0;r<rings;r++)for(let c=0;c<columns;c++){const a=r*(columns+1)+c,b=a+columns+1;indices.push(a,a+1,b,a+1,b+1,b);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();add(g,'cloth','Chest');
}
for(const side of [-1,1]){
 const rim=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.26,2.37,-.16),new THREE.Vector3(side*.27,2.64,-.18),new THREE.Vector3(side*.18,2.82,-.21),new THREE.Vector3(0,2.94,-.23)]);
 add(new THREE.TubeGeometry(rim,32,.008,5,false),'gold','Head');
}
oval('dark','Head',[0,2.59,-.12],[.215,.28,.18]);
// A curved forged mask with real eye apertures, a raised nose and vented jaw.
const maskSections=[[2.36,.065,-.285],[2.43,.125,-.335],[2.53,.165,-.35],[2.64,.19,-.35],[2.73,.19,-.325],[2.81,.135,-.27],[2.84,.08,-.245]];
function maskSection(y) {
 let i=0;while(i<maskSections.length-2&&y>maskSections[i+1][0])i++;
 const a=maskSections[i],b=maskSections[i+1],f=THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
 return [THREE.MathUtils.lerp(a[1],b[1],f),THREE.MathUtils.lerp(a[2],b[2],f)];
}
function maskZ(x,y) {
 const [w,z]=maskSection(y);
 const nose=Math.max(0,1-Math.abs(x)/.046)*Math.max(0,1-Math.abs(y-2.605)/.15)*.075;
 return z+.105*Math.pow(Math.abs(x)/w,1.65)-nose;
}
{
 const shape=new THREE.Shape();
 const outline=[...maskSections.map(([y,w])=>[-w,y]),...maskSections.toReversed().map(([y,w])=>[w,y])];
 outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 for(const side of [-1,1]){
  const hole=new THREE.Path();hole.moveTo(side*.035,2.678);hole.quadraticCurveTo(side*.09,2.686,side*.161,2.703);
  hole.lineTo(side*.155,2.666);hole.quadraticCurveTo(side*.09,2.655,side*.038,2.66);hole.closePath();shape.holes.push(hole);
 }
 for(let i=0;i<7;i++){const hole=new THREE.Path();hole.absellipse((i-3)*.026,2.475,.004,.027,0,Math.PI*2,false);shape.holes.push(hole);}
 const solid=new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:2,curveSegments:12});
 const refined=new TessellateModifier(.028,5).modify(solid),g=mergeVertices(refined,1e-5);solid.dispose();refined.dispose();
 const positions=g.attributes.position;
 for(let i=0;i<positions.count;i++)positions.setZ(i,positions.getZ(i)+maskZ(positions.getX(i),positions.getY(i)));
 g.computeVertexNormals();add(g,'silver','Head');
}
for(const side of [-1,1]) {
 const brow=new THREE.CatmullRomCurve3([[.025,2.713],[.09,2.728],[.17,2.741]].map(([x,y])=>new THREE.Vector3(side*x,y,maskZ(side*x,y)-.012)));
 add(new THREE.TubeGeometry(brow,18,.007,6,false),'silver','Head');
 oval('glow','Head',[side*.096,2.679,-.305],[.009,.008,.007],12);
 for(const y of [2.75,2.59,2.44]){
  const x=side*maskSection(y)[0]*.9;
  oval('gold','Head',[x,y,maskZ(x,y)-.008],[.009,.009,.009],8);
 }
}
// Tailored, windswept cloth. Dense pleats, asymmetric leftward billow and an
// embroidered border all share the same skin weights, so the hem cannot drift.
function capePosition(u,v,offset=0) {
 const width=.49+.30*v-.06*Math.sin(v*Math.PI),center=.34*Math.pow(v,1.3);
 const x=center+(u-.5)*width*2+Math.sin(v*9+u*4)*.06*v;
 const lift=.45*Math.pow(u,3)*Math.sin(v*Math.PI*.5);
 const y=2.33-v*2.14+lift+Math.sin(u*37)*.018*Math.pow(v,8);
 const fold=Math.cos(u*Math.PI*11+v*4+Math.sin(u*Math.PI*3)*.7)*(.012+v*.05);
 const broadFold=Math.cos(u*Math.PI*5-v*2.7)*.1*v+Math.sin(v*Math.PI*3.8+u*7)*.04*v;
 const z=.23+v*.52+fold+broadFold+Math.sin(v*Math.PI)*Math.sin(u*Math.PI)*.18+u*v*.16+offset;
 return [x,y,z];
}
function capePatch(cols,rows,u0=0,u1=1,v0=0,v1=1,offset=0) {
 const p=[],idx=[],skin=[],weights=[],uv=[];
 for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++) {
  const v=v0+(v1-v0)*r/rows,u=u0+(u1-u0)*c/cols;p.push(...capePosition(u,v,offset));uv.push(u,v);
  const f=v*2,a=Math.min(1,Math.floor(f)),b=Math.min(2,a+1),blend=Math.min(1,f-a),ids=['Cape_Upper','Cape_Middle','Cape_Lower'];
  skin.push(boneIndex[ids[a]],boneIndex[ids[b]],0,0);weights.push(1-blend,blend,0,0);
 }
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skin,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));return g.toNonIndexed();
}
batches.cloth.push(capePatch(80,64));
for(const [u0,u1] of [[.006,.016],[.027,.031],[.984,.994],[.969,.973]])batches.gold.push(capePatch(2,70,u0,u1,0,1,.009));
batches.gold.push(capePatch(88,2,0,1,.975,.986,.009));
// Original winged staff embroidery follows the same deforming cape surface.
function embroideredLine(points,stroke=.0035) {
 const curve=new THREE.CatmullRomCurve3(points.map(([u,v])=>new THREE.Vector3(u,v,0)));
 const p=[],uv=[],skin=[],weights=[],idx=[],steps=40;
 for(let i=0;i<=steps;i++){
  const t=i/steps,q=curve.getPoint(t),d=curve.getTangent(t),len=Math.hypot(d.x,d.y)||1;
  for(const side of [-1,1]){
   const u=q.x-side*d.y/len*stroke,v=q.y+side*d.x/len*stroke;
   p.push(...capePosition(u,v,.014));uv.push(u,v);
   const f=v*2,a=Math.min(1,Math.floor(f)),b=Math.min(2,a+1),blend=f-a,ids=['Cape_Upper','Cape_Middle','Cape_Lower'];
   skin.push(boneIndex[ids[a]],boneIndex[ids[b]],0,0);weights.push(1-blend,blend,0,0);
  }
  if(i<steps){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skin,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));g.setIndex(idx);g.computeVertexNormals();batches.gold.push(g.toNonIndexed());
}
embroideredLine([[.5,.12],[.5,.25],[.5,.42]],.005);
for(const side of [-1,1]){
 const u=x=>.5+side*x;
 embroideredLine([[u(.015),.2],[u(.09),.205],[u(.19),.16],[u(.25),.125]],.005);
 for(let i=0;i<6;i++)embroideredLine([[u(.035+i*.027),.21-i*.008],[u(.08+i*.025),.24-i*.013],[u(.15+i*.021),.215-i*.017]],.003);
 embroideredLine([[u(.012),.235],[u(.065),.26],[u(.025),.305],[u(.055),.34],[u(.008),.375]],.003);
}
for(const side of [0,1])for(let i=0;i<21;i++){
 const v=.045+i*.043,edge=side?.958:.042;
 const uvPoints=[[edge,v-.011],[edge+(side?-.012:.012),v],[edge,v+.011],[edge+(side?.012:-.012),v],[edge,v-.011]];
 const points=uvPoints.map(([u,vv])=>new THREE.Vector3(...capePosition(u,vv,.011)));
 const geom=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,.0025,3,false);
 add(geom,'gold',v<.35?'Cape_Upper':v<.7?'Cape_Middle':'Cape_Lower');
}
for(const [key,geometries] of Object.entries(batches)) {
 const merged=mergeGeometries(geometries);
 // Index by the complete attribute tuple, preserving UV seams and skin weights.
 const g=mergeVertices(merged,1e-5);merged.dispose();g.computeBoundingSphere();
 const mesh=new THREE.SkinnedMesh(g,mats[key]);mesh.name=`Warden_${key}`;mesh.frustumCulled=false;root.add(mesh);mesh.bind(skeleton);
 geometries.forEach(geometry=>geometry.dispose());
}
const duration=1.18,frames=48,times=Array.from({length:frames+1},(_,i)=>i/frames*duration);
function quaternionTrack(name, fn) {
 const values=[];times.forEach(t=>{const a=fn(t/duration*Math.PI*2);const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...a));values.push(q.x,q.y,q.z,q.w);});
 return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`,times,values);
}
const walkTracks=[];
for(const side of [-1,1]) {
 const s=side<0?'L':'R', offset=side<0?0:Math.PI;
 // Analytic sagittal two-bone IK: planted feet move backward at root speed,
 // swing feet lift and pass forward. The 1.2m cycle matches runtime root travel.
 const legPose=a=>{
  const phase=((a+offset)/(Math.PI*2))%1, stance=phase<.6;
  const swing=(phase-.6)/.4;
  const eased=stance?0:THREE.MathUtils.smoothstep(swing,0,1);
  const z=stance?-.36+phase/.6*.72:.36-eased*.72;
  const footY=.14+(stance?0:Math.sin(swing*Math.PI)*.18);
  const hipY=1.3+Math.cos(a*2)*.012-.03;
  const down=hipY-footY, d=Math.min(1.229,Math.hypot(down,z)), upper=.63, lower=.6;
  const alpha=Math.acos(THREE.MathUtils.clamp((upper*upper+d*d-lower*lower)/(2*upper*d),-1,1));
  const knee=Math.PI-Math.acos(THREE.MathUtils.clamp((upper*upper+lower*lower-d*d)/(2*upper*lower),-1,1));
  const hip=Math.atan2(-z,down)+alpha;
  return {hip,knee:-knee,ankle:-(hip-knee)};
 };
 walkTracks.push(quaternionTrack(`${s}_Thigh`,a=>[legPose(a).hip,0,0]));
 walkTracks.push(quaternionTrack(`${s}_Shin`,a=>[legPose(a).knee,0,0]));
 walkTracks.push(quaternionTrack(`${s}_Foot`,a=>[legPose(a).ankle,0,0]));
 walkTracks.push(quaternionTrack(`${s}_UpperArm`,a=>[-Math.sin(a+offset)*.28,0,side*.06]));
 walkTracks.push(quaternionTrack(`${s}_Forearm`,a=>[-.16-Math.max(0,Math.sin(a+offset))*.18,0,0]));
}
walkTracks.push(quaternionTrack('Spine',a=>[.035,Math.sin(a)*.045,Math.sin(a)*.022]));
walkTracks.push(quaternionTrack('Chest',a=>[0,-Math.sin(a)*.07,0]));
walkTracks.push(quaternionTrack('Head',a=>[.025,Math.sin(a)*.025,0]));
for(let i=0;i<3;i++) walkTracks.push(quaternionTrack(['Cape_Upper','Cape_Middle','Cape_Lower'][i],a=>[.04+Math.sin(a-i*.5)*(.045+i*.025),Math.cos(a-i*.4)*.05,Math.sin(a-i*.8)*.035]));
const hipValues=[];times.forEach(t=>{const a=t/duration*Math.PI*2;hipValues.push(Math.sin(a)*.022,1.3+Math.cos(a*2)*.012,0);});
walkTracks.push(new THREE.VectorKeyframeTrack('Hips.position',times,hipValues));
const walk=new THREE.AnimationClip('Walk',duration,walkTracks);
const idleTracks=[quaternionTrack('Head',a=>[-.025,Math.sin(a)*.04,0]),quaternionTrack('Chest',a=>[Math.sin(a)*.008,0,0])];
for(let i=0;i<3;i++)idleTracks.push(quaternionTrack(['Cape_Upper','Cape_Middle','Cape_Lower'][i],a=>[Math.sin(a-i*.55)*(.025+i*.025),Math.sin(a-i*.45)*.045,Math.sin(a-i*.3)*.025]));
idleTracks.push(new THREE.VectorKeyframeTrack('Hips.position',[0,duration*.5,duration],[0,1.4,0,0,1.409,0,0,1.4,0]));
const idle=new THREE.AnimationClip('Idle',duration,idleTracks);
root.updateMatrixWorld(true);
const data=await new GLTFExporter().parseAsync(root,{binary:true,animations:[walk,idle],trs:true,onlyVisible:true});
// Pack original procedural PBR maps directly into the GLB. No runtime canvas,
// network textures, licenses, or external image dependencies are needed.
const raw=Buffer.from(data),jsonLength=raw.readUInt32LE(12),manifest=JSON.parse(raw.subarray(20,20+jsonLength).toString());
const pad=b=>Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]);
const chunks=[pad(raw.subarray(28+jsonLength))];let offset=chunks[0].length;
manifest.images=[];manifest.textures=[];manifest.samplers=[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}];
const size=512,hash=(x,y)=>{let n=(x*374761393+y*668265263)>>>0;n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/4294967295;};
async function texture(kind,channel) {
 const pixels=Buffer.alloc(size*size*3),height=(x,y)=>{
  x=(x+size)%size;y=(y+size)%size;
  if(kind==='cloth')return Math.sin(x*Math.PI/2)*.35+Math.sin(y*Math.PI/2)*.35+hash(x,y)*.12;
  return hash(x,y)*.07+(hash(Math.floor(x/21),Math.floor(y/2))>.96?.22:0);
 };
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*3,n=hash(x,y);
  if(channel==='albedo'){
   const weave=kind==='cloth'?((x%4===0?-.015:0)+(y%4===0?-.015:0)):0;
   const scratch=kind==='metal'&&hash(Math.floor(x/17),Math.floor(y/2))>.96?.09:0;
   const value=Math.round(255*Math.max(.45,Math.min(1,.89+weave+scratch+(n-.5)*(kind==='cloth'?.015:.08))));
   pixels[i]=value;pixels[i+1]=value;pixels[i+2]=value;
  } else if(channel==='normal'){
   const nx=(height(x-1,y)-height(x+1,y))*.3,ny=(height(x,y-1)-height(x,y+1))*.3,len=Math.hypot(nx,ny,1);
   pixels[i]=Math.round((nx/len*.5+.5)*255);pixels[i+1]=Math.round((ny/len*.5+.5)*255);pixels[i+2]=Math.round((1/len*.5+.5)*255);
  } else {pixels[i]=255;pixels[i+1]=Math.round(220+n*34);pixels[i+2]=255;}
 }
 const encoded=await sharp(pixels,{raw:{width:size,height:size,channels:3}}).png().toBuffer();
 const bufferView=manifest.bufferViews.length;manifest.bufferViews.push({buffer:0,byteOffset:offset,byteLength:encoded.length});
 manifest.images.push({bufferView,mimeType:'image/png'});manifest.textures.push({sampler:0,source:manifest.images.length-1});
 const bytes=pad(encoded);chunks.push(bytes);offset+=bytes.length;return manifest.textures.length-1;
}
const clothMaps={albedo:await texture('cloth','albedo'),normal:await texture('cloth','normal'),roughness:await texture('cloth','roughness')};
const metalMaps={albedo:await texture('metal','albedo'),normal:await texture('metal','normal'),roughness:await texture('metal','roughness')};
for(const mat of manifest.materials){
 const maps=mat.name==='Emerald woven cloth'?clothMaps:['Obsidian sculpted plate','Antique brushed gold','Forged silver mask'].includes(mat.name)?metalMaps:null;
 if(!maps)continue;
 mat.pbrMetallicRoughness.baseColorTexture={index:maps.albedo};mat.pbrMetallicRoughness.metallicRoughnessTexture={index:maps.roughness};mat.normalTexture={index:maps.normal,scale:mat.name==='Emerald woven cloth'?.13:.28};
}
const binary=Buffer.concat(chunks);manifest.buffers[0].byteLength=binary.length;
const encoded=Buffer.from(JSON.stringify(manifest)),json=Buffer.concat([encoded,Buffer.alloc((4-encoded.length%4)%4,32)]);
const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(binary.length,0);binHeader.writeUInt32LE(0x004e4942,4);
const packed=Buffer.concat([header,json,binHeader,binary]);
const output=path.resolve(process.argv[2] || 'public/models/cinematic/warden-v2.glb');await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,packed);
let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
console.log(JSON.stringify({output,bytes:packed.byteLength,triangles,bones:bones.length,meshes:Object.keys(mats).length,textures:6,clips:['Walk','Idle']},null,2));
