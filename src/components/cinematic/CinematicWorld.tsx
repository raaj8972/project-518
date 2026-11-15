import { useLayoutEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  AdditiveBlending, BackSide, BoxGeometry, BufferGeometry, CanvasTexture,
  CircleGeometry, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute,
  Group, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D,
  NoColorSpace, PlaneGeometry, RepeatWrapping, ShaderMaterial, SphereGeometry, Sprite,
  SpriteMaterial, SRGBColorSpace, TorusGeometry, TubeGeometry, CatmullRomCurve3,
  Vector3, type Texture,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface CinematicWorldProps {
  progress: { current: number };
  quality: 'high' | 'low';
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const noise = (x: number, y = 0) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };

const skyVertex = `varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const skyFragment = `
varying vec3 vWorld;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){vec3 d=normalize(vWorld);float cloud=0.;float a=.55;vec3 p=d*5.;for(int i=0;i<5;i++){cloud+=n(p)*a;p=p*2.08+vec3(1.,4.,7.);a*=.5;}float horizon=pow(1.-abs(d.y),5.);vec3 col=mix(vec3(.006,.019,.015),vec3(.045,.13,.087),smoothstep(.28,.72,cloud));col+=vec3(.018,.043,.03)*horizon;float silver=pow(max(0.,dot(d,normalize(vec3(25.,31.,-110.)))),20.);col+=vec3(.14,.25,.17)*silver*(.25+cloud);gl_FragColor=vec4(col,1.);}`;

const portalVertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const portalFragment = `
uniform float uProgress;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){float v=0.;float a=.5;for(int i=0;i<4;i++){v+=n(p)*a;p=p*2.02+3.;a*=.5;}return v;}
void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);float t=uProgress*27.;float activation=smoothstep(.55,.73,uProgress);float warp=fbm(p*4.+t*.22);float ring=exp(-abs(r-.88+sin(a*11.+t)*.012)*85.);float inner=exp(-abs(r-.72+warp*.08)*56.);float lightning=pow(max(0.,1.-abs(sin(a*9.+r*16.-warp*9.+t))),19.);float swirl=fbm(vec2(a*2.+t*.08,r*7.-t*.17));float rim=smoothstep(.55,.99,r);vec3 col=vec3(.009,.055,.026)*(1.-r)+vec3(.15,1.,.22)*(ring*3.+inner*.5+lightning*rim*1.3);col+=vec3(.025,.25,.08)*swirl*(.4+rim);float alpha=(1.-smoothstep(.96,1.,r))*activation;gl_FragColor=vec4(col,alpha);}`;

function rockGeometry(radius: number, depth: number, seed: number, zScale = 1, detailed = true) {
  const sides = detailed ? 96 : 64, levels = detailed ? 22 : 15;
  const positions: number[] = [], indices: number[] = [], colors: number[] = [], uv: number[] = [];
  for (let row = 0; row <= levels; row++) {
    const f = row / levels;
    for (let side = 0; side <= sides; side++) {
      const a = side / sides * Math.PI * 2;
      const taper = .11 + .89 * Math.pow(Math.sin(f * Math.PI * .5), .66);
      const strata = Math.sin(f * 52 + Math.sin(a * 7 + seed) * .7) * .035 + Math.sin(f * 113) * .018;
      const jag = 1 + Math.sin(a * 5 + seed) * .13 + Math.cos(a * 11 + seed * 2) * .072 + Math.sin(a * 23 + f * 10) * .037 + strata;
      const step = Math.sin(a * 13 + seed) * .17 + Math.sin(a * 31 + row * 3.1) * .11;
      positions.push(Math.cos(a) * radius * taper * jag, -depth * (1 - f) + step * Math.sin(f * Math.PI), Math.sin(a) * radius * zScale * taper * jag);
      const shade = .55 + noise(side, row + seed) * .3 + Math.sin(f * 58 + Math.sin(a * 4)) * .08;
      const moss = smooth(.79, 1, f) * (.25 + noise(side, seed) * .3);
      colors.push(shade * (1 - moss * .32), shade * (1 + moss * .18), shade * (1 - moss * .22));
      uv.push(side / sides * 5, f * 3);
      if (row < levels && side < sides) { const i = row * (sides + 1) + side; indices.push(i, i + sides + 1, i + 1, i + 1, i + sides + 1, i + sides + 2); }
    }
  }
  // Close the exposed upper surface with a rough triangulated disk.
  const center = positions.length / 3; positions.push(0, .02, 0); colors.push(.43, .63, .43); uv.push(.5, .5);
  for (let i = 0; i < sides; i++) indices.push(center, levels * (sides + 1) + i + 1, levels * (sides + 1) + i);
  const geo = new BufferGeometry(); geo.setAttribute('position', new Float32BufferAttribute(positions, 3)); geo.setAttribute('color', new Float32BufferAttribute(colors, 3)); geo.setAttribute('uv', new Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals();
  return geo;
}

function createStoneTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#899389'; ctx.fillRect(0, 0, 512, 512);
    const pixels = ctx.getImageData(0, 0, 512, 512);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const vein = Math.sin(x * .031 + Math.sin(y * .021) * 4 + Math.cos((x + y) * .01) * 6);
      const pits = noise(x, y) > .965 ? .28 : 0;
      const s = .78 + noise(x, y) * .14 + Math.sin(x * .11 + Math.cos(y * .03) * 2) * .035 + vein * .055 - pits;
      const damp = Math.pow(Math.max(0, Math.sin(x * .018) * Math.cos(y * .014)), 4) * .14;
      const i = (y * 512 + x) * 4; pixels.data.set([(s - damp) * 218, s * 222, (s - damp * .6) * 201, 255], i);
    }
    ctx.putImageData(pixels, 0, 0);
    ctx.strokeStyle = 'rgba(51,69,55,.3)'; ctx.lineWidth = .6;
    for (let i = 0; i < 24; i++) {
      let x = noise(i, 7) * 512, y = noise(i, 8) * 512;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 12; j++) { x += (noise(i, j + 20) - .5) * 18; y += noise(i, j + 40) * 12; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(2, 2);
  return texture;
}

function createCloudTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const pixels = ctx.createImageData(256, 256);
    const valueNoise = (x: number, y: number) => {
      const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      return (noise(ix, iy) * (1 - fx) + noise(ix + 1, iy) * fx) * (1 - fy) + (noise(ix, iy + 1) * (1 - fx) + noise(ix + 1, iy + 1) * fx) * fy;
    };
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const nx = (x - 128) / 128, ny = (y - 128) / 128;
      const radial = Math.max(0, 1 - nx * nx - ny * ny);
      const billow = valueNoise(x / 39, y / 39) * .6 + valueNoise(x / 16 + 4, y / 16) * .28 + valueNoise(x / 7, y / 7 + 6) * .12;
      const silver = Math.exp(-Math.abs(billow - .48) * 14) * Math.max(0, .8 - ny);
      const light = Math.min(255, 118 + billow * 100 + silver * 64);
      pixels.data.set([light * .94, light, light * .96, Math.pow(radial, 1.35) * Math.pow(billow, 1.15) * 255], (y * 256 + x) * 4);
    }
    ctx.putImageData(pixels, 0, 0);
  }
  return new CanvasTexture(canvas);
}

function createConcreteTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const pixels = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const fine = 237 + noise(x, y) * 11 + Math.sin(x * .027) * Math.cos(y * .02) * 3;
      pixels.data.set([fine, fine, fine * .98, 255], (y * 256 + x) * 4);
    }
    ctx.putImageData(pixels, 0, 0);
  }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(3, 3);
  return texture;
}

export function createCinematicWorld(quality: 'high' | 'low', maps?: { sky: Texture; stone: Texture; normal?: Texture }) {
  const root = new Group(); root.name = 'ricorrenza-cinematic-realm';
  const stoneMap = maps ? maps.stone.clone() : createStoneTexture(), cloudMap = createCloudTexture();
  stoneMap.colorSpace = SRGBColorSpace; stoneMap.wrapS = stoneMap.wrapT = RepeatWrapping; stoneMap.repeat.set(2, 2); stoneMap.needsUpdate = true;
  const concreteMap = createConcreteTexture();
  const textures: Texture[] = [stoneMap, cloudMap, concreteMap];
  const stone = new MeshStandardMaterial({ color: '#879184', roughness: .86, metalness: .12, map: stoneMap, bumpMap: stoneMap, bumpScale: .09 });
  const cliff = new MeshStandardMaterial({ color: '#9aab94', roughness: .96, metalness: .02, vertexColors: true, map: stoneMap, bumpMap: stoneMap, bumpScale: .24 });
  const facade = new MeshStandardMaterial({ color: '#c8c4a9', roughness: .77, metalness: .06, map: concreteMap, bumpMap: concreteMap, bumpScale: .006 });
  const gold = new MeshStandardMaterial({ color: '#e7c777', roughness: .26, metalness: .85 });
  const dark = new MeshStandardMaterial({ color: '#163527', roughness: .44, metalness: .4 });
  const floor = new MeshStandardMaterial({ color: '#45634e', roughness: .16, metalness: .72, map: concreteMap, bumpMap: concreteMap, bumpScale: .002 });
  const foliage = new MeshStandardMaterial({ color: '#286a40', roughness: .82, metalness: .03, side: DoubleSide });
  const bark = new MeshStandardMaterial({ color: '#8c8160', roughness: .96, map: concreteMap });
  const moss = new MeshStandardMaterial({ color: '#1d3927', roughness: 1, map: stoneMap });
  const green = new MeshBasicMaterial({ color: '#66e891', toneMapped: false });
  const warm = new MeshBasicMaterial({ color: '#e5bc68', toneMapped: false });
  const glass = new MeshStandardMaterial({ color: '#0c2822', roughness: .24, metalness: .7, emissive: '#2b713e', emissiveIntensity: .28 });
  if (maps?.normal) {
    const normal = maps.normal.clone(); normal.colorSpace = NoColorSpace; normal.wrapS = normal.wrapT = RepeatWrapping; normal.repeat.copy(stoneMap.repeat); normal.needsUpdate = true; textures.push(normal);
    for (const material of [stone, cliff, floor]) material.normalMap = normal;
    cliff.normalScale.set(1.4, 1.4); stone.normalScale.set(.7, .7); floor.normalScale.set(.06, .06);
  }
  const materials: Material[] = [stone, cliff, facade, gold, dark, floor, foliage, bark, moss, green, warm, glass];
  const parts = new Map<Material, BufferGeometry[]>();
  const dummy = new Object3D();
  const cube = new BoxGeometry(1, 1, 1);
  const cylinder = new CylinderGeometry(1, 1, 1, quality === 'low' ? 8 : 12);
  const add = (geometry: BufferGeometry, material: Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(rx, ry, rz); dummy.updateMatrix();
    const copy = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (!copy.getAttribute('uv')) {
      const p = copy.getAttribute('position'), uv: number[] = [];
      for (let i = 0; i < p.count; i++) uv.push(p.getX(i) * .12, (p.getY(i) + p.getZ(i)) * .12);
      copy.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    }
    if (!(material instanceof MeshStandardMaterial && material.vertexColors)) copy.deleteAttribute('color');
    else if (!copy.getAttribute('color')) {
      const position = copy.getAttribute('position'), colors: number[] = [];
      for (let i = 0; i < position.count; i++) { const shade = .65 + noise(i, 15) * .26; colors.push(shade, shade, shade); }
      copy.setAttribute('color', new Float32BufferAttribute(colors, 3));
    }
    copy.applyMatrix4(dummy.matrix);
    const list = parts.get(material) ?? []; list.push(copy); parts.set(material, list);
  };
  const box = (m: Material, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0) => add(cube, m, x, y, z, w, h, d, 0, ry);
  const tube = (points: Vector3[], m: Material, radius: number, closed = false) => {
    const geo = new TubeGeometry(new CatmullRomCurve3(points, closed), Math.max(16, points.length * 3), radius, 5, closed);
    add(geo, m, 0, 0, 0); geo.dispose();
  };
  const island = (x: number, y: number, z: number, r: number, depth: number, seed: number, zScale = 1) => {
    const geo = rockGeometry(r, depth, seed, zScale, quality === 'high'); add(geo, cliff, x, y, z); geo.dispose();
    // Ragged hanging outcrops break the mathematical cone silhouette in depth.
    const shard = new SphereGeometry(1, quality === 'low' ? 8 : 12, quality === 'low' ? 5 : 8);
    const pos = shard.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const k = 1 + Math.sin(pos.getX(i) * 13 + pos.getY(i) * 7 + pos.getZ(i) * 11) * .12;
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
    }
    shard.computeVertexNormals();
    for (let i = 0; i < (quality === 'low' ? 15 : 27); i++) {
      const a = i * 2.399 + seed; const rr = r * (.71 + noise(i, seed) * .26);
      add(shard, cliff, x + Math.cos(a) * rr, y - depth * (.1 + noise(i, 29) * .28), z + Math.sin(a) * rr * zScale, r * (.09 + noise(i, 31) * .1), depth * (.14 + noise(i, 30) * .23), r * (.07 + noise(i, 32) * .09), a * .08, a);
    }
    shard.dispose();
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + seed;
      tube([new Vector3(x + Math.cos(a) * r * .1, y - depth * .85, z + Math.sin(a) * r * .1 * zScale), new Vector3(x + Math.cos(a + .1) * r * .48, y - depth * .45, z + Math.sin(a + .1) * r * .48 * zScale), new Vector3(x + Math.cos(a) * r * .88, y - .4, z + Math.sin(a) * r * .88 * zScale)], green, .018 * Math.sqrt(r));
    }
  };
  const arch = (x: number, z: number, width: number, height: number, y = 0, ry = 0) => {
    // Pointed Gothic ribs have an open centre; the camera can travel through them.
    const path = [new Vector3(-width / 2, 0, 0), new Vector3(-width / 2, height * .55, 0), new Vector3(-width * .41, height * .76, 0), new Vector3(-width * .22, height * .91, 0), new Vector3(0, height, 0), new Vector3(width * .22, height * .91, 0), new Vector3(width * .41, height * .76, 0), new Vector3(width / 2, height * .55, 0), new Vector3(width / 2, 0, 0)];
    const transform = (v: Vector3) => new Vector3(v.x * Math.cos(ry) + v.z * Math.sin(ry), v.y + y, -v.x * Math.sin(ry) + v.z * Math.cos(ry)).add(new Vector3(x, 0, z));
    tube(path.map(transform), stone, width * .055);
    tube(path.map(p => transform(new Vector3(p.x * .93, p.y * .96 + .12, .14))), gold, width * .009);
    tube(path.map(p => transform(new Vector3(p.x * 1.035, p.y * 1.015, .03))), facade, width * .021);
    tube(path.map(p => transform(new Vector3(p.x * .99, p.y * .985, .2))), gold, width * .0035);
    const curve = new CatmullRomCurve3(path);
    for (let i = 1; i < 24; i++) {
      const at = curve.getPoint(i / 24), tangent = curve.getTangent(i / 24), point = transform(at);
      add(cube, i % 3 === 0 ? gold : facade, point.x, point.y, point.z + .04, width * .115, width * .065, width * .12, 0, ry, Math.atan2(tangent.y, tangent.x));
    }
    for (const side of [-1, 1]) {
      const xx = x + side * width / 2 * Math.cos(ry), zz = z - side * width / 2 * Math.sin(ry);
      box(stone, xx, y + .35, zz, 1.25, .7, 1.25, ry);
      box(gold, xx, y + .73, zz, 1.3, .09, 1.3, ry);
      add(cylinder, gold, xx, y + height * .24, zz, .06, height * .44, .06);
      for (const bandY of [.08, .19, .44, .54]) {
        box(gold, xx, y + height * bandY, zz, width * .13, .085, width * .13, ry);
        box(facade, xx, y + height * bandY + .1, zz, width * .15, .12, width * .15, ry);
      }
      const spire = new CylinderGeometry(0, width * .10, height * .18, 5);
      add(spire, gold, xx, y + height * .73, zz, 1, 1, 1); spire.dispose();
    }
  };

  island(0, -.3, 1, 12, 14, 1, .86);
  island(0, -.3, -65, 25, 25, 2, .91);
  box(floor, 0, -.02, 1, 8.6, .35, 18);
  // The landing apron extends out over the campus island.
  box(stone, 0, -.38, -45, 10, .75, 27);
  box(floor, 0, .01, -45, 9.2, .08, 27);
  for (const side of [-1, 1]) {
    box(gold, side * 4.25, .08, -45, .035, .03, 27);
    box(gold, side * 3.9, .18, 0, .035, .025, 17.8);
    for (let i = 0; i < 10; i++) {
      const z = -33 - i * 2.5;
      box(stone, side * 4.65, .48, z, .45, .95, .45);
      box(warm, side * 4.65, 1, z, .24, .055, .24);
    }
  }
  // Inlaid paving: thin geometry carries the parallax of the forward camera.
  for (let z = -55; z < -31; z += 1.6) box(gold, 0, .061, z, 8.4, .009, .012);
  for (let z = -8; z < 9; z += 1.8) box(gold, 0, .167, z, 7.8, .008, .01);
  arch(0, -5.4, 11.5, 14.8);
  arch(0, 7.2, 12.8, 16.5);
  for (const side of [-1, 1]) {
    // Banners: real folded surfaces, with an original angular wing insignia.
    box(stone, side * 6.5, 4.7, -3.8, .5, 9.4, .5);
    box(gold, side * 6.5, 9.45, -3.8, 2.5, .09, .09);
    const verts: number[] = [], idx: number[] = [];
    for (let row = 0; row <= 12; row++) for (let col = 0; col <= 8; col++) {
      const xx = side * 6.5 + (col / 8 - .5) * 2.2, yy = 9.35 - row / 12 * 4.8;
      verts.push(xx, yy, -3.8 + Math.sin(col / 8 * Math.PI * 4) * .11 * (row / 12 + .1));
      if (row < 12 && col < 8) { const i = row * 9 + col; idx.push(i, i + 9, i + 1, i + 1, i + 9, i + 10); }
    }
    const geo = new BufferGeometry(); geo.setAttribute('position', new Float32BufferAttribute(verts, 3)); geo.setIndex(idx); geo.computeVertexNormals(); add(geo, dark, 0, 0, 0); geo.dispose();
    tube([new Vector3(side * 6.5, 7.7, -3.58), new Vector3(side * 6.5 + .42, 7.1, -3.58), new Vector3(side * 6.5, 6.5, -3.58), new Vector3(side * 6.5 - .42, 7.1, -3.58), new Vector3(side * 6.5, 7.7, -3.58)], gold, .035);
    for (let i = 0; i < 3; i++) for (const wing of [-1, 1]) tube([new Vector3(side * 6.5 + wing * .2, 7.1 - i * .14, -3.57), new Vector3(side * 6.5 + wing * (.83 - i * .12), 7.5 - i * .3, -3.57)], gold, .028);
  }

  const satelliteIslands = [
    [-28, 6, -37, 9, 15], [29, 11, -59, 7, 13], [-40, 14, -84, 11, 18],
    [43, -2, -27, 10, 19], [19, 2, -103, 8, 14], [-19, -8, -16, 4, 9],
    [55, 17, -114, 8, 16], [-53, -3, -49, 6, 15], [8, 20, -119, 5, 10],
  ];
  satelliteIslands.slice(0, quality === 'low' ? 5 : 9).forEach(([x, y, z, r, d], i) => {
    island(x, y, z, r, d, i + 5, .78);
    if (i % 2 === 0) { arch(x, z, r * .85, r * 1.5, y, -.18); arch(x - r * .5, z - r * .4, r * .6, r * 1.2, y, .2); }
    else {
      for (let k = 0; k < 3; k++) { box(stone, x - 2 + k * 2, y + 3 + k % 2, z, .7, 6 + k % 2 * 2, .7); const spire = new CylinderGeometry(0, .8, 2, 5); add(spire, gold, x - 2 + k * 2, y + 7 + k % 2 * 2, z); spire.dispose(); }
    }
  });
  // Broken aqueduct to the west gives a second depth plane beyond the islands.
  for (let i = 0; i < 7; i++) arch(-44 + i * 5, -76 + i * 1.9, 4.6, 7.5, -4 + i * .2, -.35);

  // Campus: six floors, stepped wings and a genuine open central entrance.
  for (const side of [-1, 1]) {
    box(facade, side * 10.2, 7.6, -64, 12.5, 15.2, 12);
    box(stone, side * 10.2, .65, -57.8, 12.8, 1.3, .65);
    box(dark, side * 10.2, 15.4, -64, 12.9, .55, 12.4);
    for (let level = 0; level < 6; level++) {
      const y = 1.85 + level * 2.28;
      box(stone, side * 10.2, y + .8, -57.79, 12.5, .24, .5);
      for (let col = 0; col < 7; col++) {
        const x = side * 10.2 + (col - 3) * 1.65;
        box(dark, x, y, -57.85, 1.32, 1.52, .28);
        box(glass, x, y, -57.66, 1.12, 1.32, .08);
        box(gold, x, y, -57.58, .032, 1.37, .045);
        box(facade, x, y - .77, -57.57, 1.49, .12, .26);
        box(dark, x, y + .55, -57.57, 1.1, .13, .035);
        for (const jamb of [-1, 1]) box(facade, x + jamb * .69, y, -57.61, .09, 1.62, .28);
        if (noise(col + side, level) > .72) box(warm, x + .39, y, -57.57, .18, 1.1, .015);
      }
    }
    for (let col = 0; col < 8; col++) box(facade, side * 10.2 + (col - 3.5) * 1.65, 7.5, -57.4, .17, 15, .8);
    box(facade, side * 12, 16.3, -65, 4.8, 1.5, 4);
    box(gold, side * 10.2, 15.74, -57.8, 13, .065, .09);
  }
  box(facade, 0, 12.25, -64, 7.9, 6.2, 12);
  box(dark, 0, 15.5, -64, 8.4, .5, 12.5);
  for (const side of [-1, 1]) {
    box(stone, side * 3.65, 4.25, -58, .7, 8.5, .8);
    box(gold, side * 3.65, 4.2, -57.53, .065, 8.1, .045);
  }
  box(stone, 0, 8.6, -56.7, 10, .6, 4);
  box(gold, 0, 8.24, -56.7, 9.7, .08, 3.8);
  for (const side of [-1, 1]) {
    box(facade, side * 4.5, 4.1, -55, .4, 8.2, .4);
    box(warm, side * 4.5, 8, -55, .52, .12, .52);
  }
  // Campus landscaping is merged by material with the architecture, not one
  // draw call per frond. Curved ribbons form feathered palm silhouettes.
  for (const side of [-1, 1]) for (let tree = 0; tree < 3; tree++) {
    const x = side * (9 + (tree % 2) * .7), z = [-46, -52, -64][tree];
    const height = 5.1 + noise(tree, side + 44) * 1.5;
    const crownX = x + side * .45;
    tube([new Vector3(x, 0, z), new Vector3(x + side * .1, height * .45, z), new Vector3(crownX, height, z + .12)], bark, .135);
    box(stone, x, .15, z, 1.25, .3, 1.25);
    for (let leaf = 0; leaf < 10; leaf++) {
      const angle = leaf / 10 * Math.PI * 2 + tree;
      const verts: number[] = [], indices: number[] = [];
      for (let row = 0; row <= 12; row++) {
        const t = row / 12, radius = t * (2.2 + noise(leaf, tree) * .65);
        const width = Math.sin(t * Math.PI) * .35 * (row % 2 ? .72 : 1);
        const yy = height + Math.sin(t * Math.PI) * .8 - t * t * 1.5;
        for (const edge of [-1, 1]) verts.push(crownX + Math.cos(angle) * radius + Math.sin(angle) * width * edge, yy, z + .12 + Math.sin(angle) * radius - Math.cos(angle) * width * edge);
        if (row < 12) { const i = row * 2; indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
      }
      const geo = new BufferGeometry(); geo.setAttribute('position', new Float32BufferAttribute(verts, 3)); geo.setIndex(indices); geo.computeVertexNormals(); add(geo, foliage, 0, 0, 0); geo.dispose();
    }
  }
  // Signage uses local canvas type, avoiding a runtime font or texture download.
  const signCanvas = document.createElement('canvas'); signCanvas.width = 1024; signCanvas.height = 256;
  const signContext = signCanvas.getContext('2d');
  if (signContext) {
    signContext.fillStyle = '#071c15'; signContext.fillRect(0, 0, 1024, 256);
    signContext.textAlign = 'center'; signContext.fillStyle = '#e6e2c9'; signContext.font = '600 100px Arial, sans-serif'; signContext.fillText('IQ CITY', 512, 119);
    signContext.font = '32px Arial, sans-serif'; signContext.fillStyle = '#c4cdb4'; signContext.fillText('MEDICAL COLLEGE HOSPITAL', 512, 185);
    signContext.fillStyle = '#ae914d'; signContext.fillRect(90, 225, 844, 3);
  }
  const signMap = new CanvasTexture(signCanvas); signMap.colorSpace = SRGBColorSpace; textures.push(signMap);
  const signMaterial = new MeshBasicMaterial({ map: signMap, toneMapped: false }); materials.push(signMaterial);
  const sign = new Mesh(new PlaneGeometry(8, 2), signMaterial); sign.position.set(0, 11, -57.82); root.add(sign);

  // Interior hall: flanking walls, overhead ribs and inlaid floor; centre stays open.
  box(floor, 0, -.02, -68, 12.5, .3, 26);
  for (const side of [-1, 1]) {
    box(dark, side * 6.25, 6.7, -68, .5, 13.4, 26);
    box(gold, side * 4.9, .15, -68, .035, .02, 26);
    for (let i = 0; i < 6; i++) {
      const z = -58 - i * 4;
      box(stone, side * 5.7, 5.7, z, .65, 11.4, .7);
      box(gold, side * 5.7, 5.7, z + .37, .065, 10.8, .04);
      box(warm, side * 5.2, 2, z, .14, .8, .14);
      box(gold, side * 5.35, 1.5, z, .35, .11, .35);
    }
  }
  box(dark, 0, 13.1, -68, 12.7, .4, 26);
  // The far hall stays enclosed around the portal aperture; centre remains
  // physically open for the camera crossing and subsequent homepage wash.
  box(dark, 0, 11.2, -81, 12.7, 4.6, .5);
  for (const side of [-1, 1]) box(dark, side * 5.35, 4.45, -81, 3.8, 8.9, .5);
  for (let i = 0; i < 5; i++) arch(0, -60 - i * 4, 11.3, 12.7);
  for (let z = -80; z < -56; z += 2) box(gold, 0, .14, z, 9.7, .012, .02);
  for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) box(gold, x, .14, -68, .012, .01, 26);

  // The radial portal housing is three-dimensional and visible before activation.
  for (let ring = 0; ring < 3; ring++) {
    const geo = new TorusGeometry(3.55 + ring * .24, ring === 1 ? .11 : .055, 6, quality === 'low' ? 48 : 80);
    add(geo, ring === 1 ? stone : gold, 0, 4.08, -76 - ring * .08); geo.dispose();
  }
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2;
    add(cube, gold, Math.cos(a) * 3.83, 4.08 + Math.sin(a) * 3.83, -75.88, .08, .36, .16, 0, 0, a - Math.PI / 2);
    const shard = new SphereGeometry(.13, 4, 2); add(shard, green, Math.cos(a) * 3.56, 4.08 + Math.sin(a) * 3.56, -75.78, 1, 1, 1); shard.dispose();
  }
  const portalMaterial = new ShaderMaterial({ uniforms: { uProgress: { value: 0 } }, vertexShader: portalVertex, fragmentShader: portalFragment, transparent: true, depthWrite: false, side: DoubleSide, toneMapped: false });
  materials.push(portalMaterial);
  const portal = new Mesh(new CircleGeometry(3.55, quality === 'low' ? 48 : 80), portalMaterial); portal.position.set(0, 4.08, -75.9); root.add(portal);
  const haloMaterial = new MeshBasicMaterial({ color: '#61ff85', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false }); materials.push(haloMaterial);
  const halo = new Mesh(new TorusGeometry(3.46, .025, 5, 80), haloMaterial); halo.position.copy(portal.position); halo.position.z += .08; root.add(halo);

  // A fine central energy column points toward the distant campus.
  box(green, 0, 33, -68, .045, 42, .045);
  for (let i = 0; i < 3; i++) {
    const ring = new TorusGeometry(5 + i * 2.6, .018, 4, 64); add(ring, green, 0, 23 + i * 2, -68, 1, 1, 1, Math.PI / 2); ring.dispose();
  }
  let skyMaterial: Material;
  if (maps?.sky) {
    const map = maps.sky.clone(); map.colorSpace = SRGBColorSpace; map.needsUpdate = true; textures.push(map);
    skyMaterial = new MeshBasicMaterial({ map, side: BackSide, depthWrite: false, toneMapped: false, fog: false });
    // A frontal matte uses most of the source pixels instead of stretching the
    // image around 360 degrees. Depth clouds in front retain real parallax.
    const alphaCanvas = document.createElement('canvas'); alphaCanvas.width = alphaCanvas.height = 64;
    const alphaContext = alphaCanvas.getContext('2d');
    if (alphaContext) {
      const pixels = alphaContext.createImageData(64, 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const a = clamp(Math.min(x, y, 63 - x, 63 - y) / 5) * 255;
        pixels.data.set([a, a, a, 255], (y * 64 + x) * 4);
      }
      alphaContext.putImageData(pixels, 0, 0);
    }
    const alphaMap = new CanvasTexture(alphaCanvas); textures.push(alphaMap);
    const matteMaterial = new MeshBasicMaterial({ map, alphaMap, transparent: true, depthWrite: false, toneMapped: false, fog: false }); materials.push(matteMaterial);
    const matte = new Mesh(new PlaneGeometry(260, 140), matteMaterial); matte.position.set(0, 20, -145); matte.renderOrder = -90; matte.name = 'high-detail-frontal-storm-matte'; root.add(matte);
  } else skyMaterial = new ShaderMaterial({ vertexShader: skyVertex, fragmentShader: skyFragment, side: BackSide, depthWrite: false, toneMapped: false });
  materials.push(skyMaterial);
  const sky = new Mesh(new SphereGeometry(180, 48, 32), skyMaterial); sky.renderOrder = -100; sky.rotation.y = Math.PI / 2; root.add(sky);
  if (!maps?.sky) {
    const moonMaterial = new MeshBasicMaterial({ color: '#88b49a', toneMapped: false, transparent: true, opacity: .6 }); materials.push(moonMaterial);
    const moon = new Mesh(new SphereGeometry(8, 24, 16), moonMaterial); moon.position.set(27, 29, -118); root.add(moon);
  }

  const clouds: Sprite[] = [];
  const cloudCount = quality === 'low' ? 19 : 37;
  for (let i = 0; i < cloudCount; i++) {
    const material = new SpriteMaterial({ map: cloudMap, transparent: true, opacity: .52 + noise(i, 2) * .24, depthWrite: false, color: new Color('#c7dfcf'), fog: true }); materials.push(material);
    const cloud = new Sprite(material);
    if (i % 3 === 0) cloud.position.set((i % 2 ? -1 : 1) * (29 + noise(i, 3) * 27), -6 - noise(i, 4) * 6, 12 - noise(i, 5) * 135);
    else if (i % 3 === 1) cloud.position.set((noise(i, 3) - .5) * 150, -1 + noise(i, 4) * 10, -104 - noise(i, 5) * 43);
    else cloud.position.set((i % 2 ? -1 : 1) * (54 + noise(i, 3) * 35), 8 + noise(i, 4) * 16, -30 - noise(i, 5) * 90);
    const width = 42 + noise(i, 7) * 43;
    if (i % 3 === 0) cloud.position.x = (i % 2 ? -1 : 1) * (width * .5 + 9 + noise(i, 3) * 12);
    cloud.scale.set(width, width * .46, 1); cloud.userData.baseX = cloud.position.x; root.add(cloud); clouds.push(cloud);
  }
  const lightningMaterial = new MeshBasicMaterial({ color: '#a4ffc0', transparent: true, opacity: 0, blending: AdditiveBlending, toneMapped: false }); materials.push(lightningMaterial);
  for (const side of [-1, 1]) {
    const points = Array.from({ length: 13 }, (_, i) => new Vector3(side * (30 + (noise(i, side) - .5) * 5), 40 - i * 3.4, -88 + noise(i, 10) * 1.4));
    const geo = new TubeGeometry(new CatmullRomCurve3(points), 36, .055, 3); const bolt = new Mesh(geo, lightningMaterial); root.add(bolt);
  }
  // Dust embers are batched with the static emission material.
  const speck = new SphereGeometry(1, 4, 2);
  for (let i = 0; i < (quality === 'low' ? 25 : 80); i++) add(speck, i % 3 ? gold : green, (noise(i, 20) - .5) * 28, noise(i, 21) * 17, -noise(i, 22) * 85, .025, .025, .025);
  speck.dispose();

  parts.forEach((geometries, material) => {
    const merged = mergeGeometries(geometries, false);
    if (merged) { const mesh = new Mesh(merged, material); mesh.receiveShadow = true; mesh.castShadow = false; root.add(mesh); }
    geometries.forEach(g => g.dispose());
  });
  cube.dispose(); cylinder.dispose();
  let disposed = false;
  return {
    root,
    update(p: number) {
      portalMaterial.uniforms.uProgress.value = p;
      haloMaterial.opacity = smooth(.56, .72, p) * .8;
      const flash = Math.pow(Math.max(0, Math.sin(p * 69 + 1.4)), 36) * (1 - smooth(.5, .58, p));
      lightningMaterial.opacity = flash;
      clouds.forEach((cloud, i) => { cloud.position.x = cloud.userData.baseX + Math.sin(p * 4 + i) * 4; });
    },
    dispose() {
      if (disposed) return; disposed = true;
      const geometries = new Set<BufferGeometry>(); root.traverse(object => { if (object instanceof Mesh) geometries.add(object.geometry); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    },
  };
}

/** A continuous realm: the campus doorway and the portal share world coordinates. */
export function CinematicWorld({ progress, quality }: CinematicWorldProps) {
  const [sky, stone, normal] = useTexture(['/images/cinematic-storm-sky.webp', '/images/festival-natural-stone.webp', '/images/cinematic-stone-normal.png']);
  const [world, setWorld] = useState<ReturnType<typeof createCinematicWorld> | null>(null);
  const portalLight = useRef<import('three').PointLight>(null);
  // Allocate in an effect: abandoned React renders allocate no GPU resources,
  // and StrictMode's setup/cleanup/setup cycle gets a fresh, live world each time.
  useLayoutEffect(() => {
    const created = createCinematicWorld(quality, { sky, stone, normal });
    setWorld(created);
    return () => created.dispose();
  }, [quality, sky, stone, normal]);
  useFrame(() => {
    world?.update(progress.current);
    if (portalLight.current) portalLight.current.intensity = smooth(.55, .74, progress.current) * 55;
  });
  return <>
    {world && <primitive object={world.root} dispose={null} />}
    <pointLight position={[0, 6.5, -54]} color="#eac477" intensity={45} distance={22} decay={2} />
    <pointLight ref={portalLight} position={[0, 4.1, -72]} color="#59ffa0" intensity={0} distance={25} decay={2} />
  </>;
}

export default CinematicWorld;
