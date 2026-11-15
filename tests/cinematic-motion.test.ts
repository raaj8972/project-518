import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface GltfDocument {
  nodes: { name?: string; mesh?: number; skin?: number }[];
  skins?: { joints: number[] }[];
  animations?: { name?: string; channels: { target: { node: number; path: string } }[] }[];
  accessors: { count: number; min?: number[]; max?: number[] }[];
  materials: {name: string; normalTexture?: unknown; pbrMetallicRoughness?: {baseColorTexture?: unknown}}[];
  meshes: { primitives: { material: number; indices?: number; attributes: { POSITION: number } }[] }[];
}

function readCharacter() {
  const bytes = readFileSync(new URL('../public/models/cinematic/warden-v2.glb', import.meta.url));
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  expect(bytes.readUInt32LE(4)).toBe(2);
  const jsonLength = bytes.readUInt32LE(12);
  expect(bytes.readUInt32LE(16)).toBe(0x4e4f534a);
  return { bytes, gltf: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString()) as GltfDocument };
}

describe('original cinematic character asset', () => {
  it('ships an actual skeleton with animated leg joints rather than only root motion', () => {
    const { gltf } = readCharacter();
    const skin = gltf.skins?.[0];
    expect(skin?.joints.length).toBeGreaterThanOrEqual(12);
    expect(gltf.nodes.some(node => node.skin !== undefined && node.mesh !== undefined)).toBe(true);
    const walk = gltf.animations?.find(clip => /walk/i.test(clip.name || ''));
    expect(walk).toBeDefined();
    const animatedJointNames = walk!.channels
      .filter(channel => channel.target.path === 'rotation')
      .map(channel => gltf.nodes[channel.target.node]?.name || '');
    expect(animatedJointNames.filter(name => /leg|thigh|shin|knee|ankle|foot/i.test(name)).length).toBeGreaterThanOrEqual(4);
  });

  it('keeps the bundled character within a practical untextured mobile asset budget', () => {
    const { bytes, gltf } = readCharacter();
    const triangles = gltf.meshes.reduce((total, mesh) => total + mesh.primitives.reduce((sum, primitive) => sum + gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3, 0), 0);
    expect(bytes.length).toBeLessThan(5 * 1024 * 1024);
    expect(triangles).toBeLessThan(60000);
  });
  it('includes a textured, sculpted metal mask with actual depth rather than a flat face card', () => {
    const {gltf}=readCharacter();
    const silver=gltf.materials.findIndex(material=>material.name==='Forged silver mask');
    expect(silver).toBeGreaterThanOrEqual(0);expect(gltf.materials[silver].normalTexture).toBeDefined();
    const primitive=gltf.meshes.flatMap(mesh=>mesh.primitives).find(part=>part.material===silver)!;
    const position=gltf.accessors[primitive.attributes.POSITION];
    expect(position.count).toBeGreaterThan(1000);
    expect(position.max![2]-position.min![2]).toBeGreaterThan(.1);
  });
});

import { clamp01, smoothRange, sampleCamera, getQualityProfile, normalizedProgress } from '../src/components/cinematic/cinematicMotion';

describe('cinematic scroll route', () => {
  it('normalizes native scrolling with exact endpoints in either direction', () => {
    expect(normalizedProgress(80, 100, 4000)).toBe(0);
    expect(normalizedProgress(100, 100, 4000)).toBe(0);
    expect(normalizedProgress(2100, 100, 4000)).toBe(.5);
    expect(normalizedProgress(4100, 100, 4000)).toBe(1);
    expect(normalizedProgress(5000, 100, 4000)).toBe(1);
    const forward = [100, 900, 2100, 3300, 4100].map(y => normalizedProgress(y, 100, 4000));
    const reverse = [4100, 3300, 2100, 900, 100].map(y => normalizedProgress(y, 100, 4000)).reverse();
    expect(reverse).toEqual(forward);
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(smoothRange(.55, .75, .54)).toBe(0);
    expect(smoothRange(.55, .75, .8)).toBe(1);
  });

  it.each([390 / 844, 844 / 390, 1440 / 900])('keeps the camera continuous across scene boundaries at aspect %s', aspect => {
    for (const boundary of [.15, .35, .55, .75]) {
      const before = sampleCamera(boundary - .00001, aspect);
      const after = sampleCamera(boundary + .00001, aspect);
      expect(Math.hypot(...before.position.map((coordinate, index) => coordinate - after.position[index]))).toBeLessThan(.1);
      expect(Math.hypot(...before.target.map((coordinate, index) => coordinate - after.target[index]))).toBeLessThan(.1);
      expect(Math.abs(before.fov - after.fov)).toBeLessThan(.1);
    }
  });

  it('returns the same camera pose when reverse scrolling revisits a frame', () => {
    const samples = [0, .1, .25, .45, .65, .85, 1];
    const forward = samples.map(progress => sampleCamera(progress, 390 / 844));
    const backward = [...samples].reverse().map(progress => sampleCamera(progress, 390 / 844)).reverse();
    expect(backward).toEqual(forward);
    expect(sampleCamera(.75, 1).position[2]).toBeLessThan(sampleCamera(.35, 1).position[2]);
    expect(sampleCamera(1, 1).position[2]).toBeLessThan(-76);
  });

  it('produces finite frames for portrait and landscape orientations', () => {
    for (const aspect of [320 / 568, 390 / 844, 568 / 320, 1920 / 1080]) {
      for (let index = 0; index <= 100; index++) {
        const pose = sampleCamera(index / 100, aspect);
        expect([...pose.position, ...pose.target, pose.fov].every(Number.isFinite)).toBe(true);
        expect(pose.fov).toBeGreaterThan(10);
        expect(pose.fov).toBeLessThan(110);
      }
    }
  });
});

describe('cinematic device tiers', () => {
  const capable = { memory: 8, cores: 8, width: 1440, webgl: true };
  it.each([
    { reducedMotion: true },
    { saveData: true },
    { webgl: false },
  ])('bypasses WebGL for explicit accessibility or capability limits: %j', limit => {
    expect(getQualityProfile({ ...capable, ...limit })).toBe('fallback');
  });
  it('selects a lower budget on limited mobile hardware', () => {
    expect(getQualityProfile({ memory: 4, cores: 4, width: 390, webgl: true })).toBe('low');
    expect(getQualityProfile({ memory: 2, cores: 2, width: 390, webgl: true })).toBe('fallback');
    expect(getQualityProfile(capable)).toBe('high');
  });
});

import { samplePortalCamera } from '../src/components/cinematic/cinematicMotion';
describe('character-to-portal camera route', () => {
  it.each([390/844, 1440/900])('stays inside the hall and crosses the portal continuously at aspect %s', aspect => {
    for(let i=0; i<=100; i++) {
      const p=i/100, pose=samplePortalCamera(p,aspect);
      expect([...pose.position,...pose.target,pose.fov].every(Number.isFinite)).toBe(true);
      expect(Math.abs(pose.position[0])).toBeLessThan(3);
      expect(pose.position[1]).toBeGreaterThan(2);
      expect(pose.position[1]).toBeLessThan(6);
      const reverse=samplePortalCamera(p,aspect); expect(reverse).toEqual(pose);
    }
    for(const p of [.3,.6,.76,.88]) {
      const before=samplePortalCamera(p-.00001,aspect),after=samplePortalCamera(p+.00001,aspect);
      expect(Math.hypot(...before.position.map((v,j)=>v-after.position[j]))).toBeLessThan(.02);
    }
    expect(samplePortalCamera(.88,aspect).position[2]).toBeLessThan(-76);
  });
});
