import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { AnimationMixer, BufferGeometry, Group, LoopRepeat, Material, MathUtils, Mesh, Object3D, PlaneGeometry, ShaderMaterial, SkinnedMesh, Texture } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { WARDEN_MODEL_URL } from './characterAsset';

type Props = {
  progress: { current: number };
  quality: 'high' | 'low';
  onReady?: () => void;
  journey?: boolean;
};

/** Original stylized skinned model. Motion is sampled from scroll, including reverse. */
export default function CinematicCharacter({ progress, quality, onReady, journey = false }: Props) {
  const gltf = useGLTF(WARDEN_MODEL_URL);
  const group = useRef<Group>(null);
  const ownedRig = useRef<Object3D | null>(null);
  const animation = useRef<{ mixer: AnimationMixer; walk: ReturnType<AnimationMixer['clipAction']> | null; idle: ReturnType<AnimationMixer['clipAction']> | null; duration: number } | null>(null);

  useEffect(() => {
    const host = group.current;
    if (!host) return;
    // Allocate inside the effect: each StrictMode setup gets fresh GPU owners.
    // The cached GLTF remains a CPU source and never enters the rendered scene.
    const rig = clone(gltf.scene);
    const geometries = new Map<BufferGeometry, BufferGeometry>();
    const materials = new Map<Material, Material>();
    const textures = new Map<Texture, Texture>();
    const skeletons = new Set<SkinnedMesh['skeleton']>();
    const ownMaterial = (source: Material) => {
      const existing = materials.get(source);
      if (existing) return existing;
      const owned = source.clone();
      const fields = owned as unknown as Record<string, unknown>;
      for (const key of Object.keys(fields)) {
        const texture = fields[key];
        if (!(texture instanceof Texture)) continue;
        let ownTexture = textures.get(texture);
        if (!ownTexture) {
          ownTexture = texture.clone();
          textures.set(texture, ownTexture);
        }
        fields[key] = ownTexture;
      }
      materials.set(source, owned);
      return owned;
    };
    rig.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const source: BufferGeometry = object.geometry;
      const geometry = geometries.get(source) ?? source.clone();
      geometries.set(source, geometry);
      object.geometry = geometry;
      object.material = Array.isArray(object.material) ? object.material.map(ownMaterial) : ownMaterial(object.material);
      object.frustumCulled = false;
      if (object instanceof SkinnedMesh) skeletons.add(object.skeleton);
    });
    host.add(rig);
    const shadowGeometry = new PlaneGeometry(2.1, 1.4);
    const shadowMaterial = new ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vUv;void main(){float d=length((vUv-.5)*vec2(1.,1.2));float alpha=pow(1.-smoothstep(.03,.5,d),2.)*.45;gl_FragColor=vec4(.002,.009,.004,alpha);}',
    });
    const shadow = new Mesh(shadowGeometry, shadowMaterial);
    shadow.name = 'Warden soft contact shadow';
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, .01, -.015);
    host.add(shadow);
    ownedRig.current = rig;
    const mixer = new AnimationMixer(rig);
    const walkClip = gltf.animations.find(clip => clip.name === 'Walk');
    const idleClip = gltf.animations.find(clip => clip.name === 'Idle');
    const walk = walkClip ? mixer.clipAction(walkClip) : null;
    const idle = idleClip ? mixer.clipAction(idleClip) : null;
    walk?.setLoop(LoopRepeat, Infinity).play();
    idle?.setLoop(LoopRepeat, Infinity).play();
    animation.current = { mixer, walk, idle, duration: walkClip?.duration ?? 1.18 };
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(rig);
      animation.current = null;
      ownedRig.current = null;
      host.remove(rig);
      host.remove(shadow);
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      skeletons.forEach(skeleton => skeleton.dispose());
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
    };
  }, [gltf.scene, gltf.animations]);

  useEffect(() => {
    ownedRig.current?.traverse(object => {
      if (object instanceof Mesh) {
        object.castShadow = quality === 'high';
        object.receiveShadow = quality === 'high';
      }
    });
    onReady?.();
  }, [gltf.scene, quality, onReady]);

  useFrame(() => {
    const playback = animation.current;
    if (!group.current || !playback) return;
    const p = MathUtils.clamp(progress.current, 0, 1);
    const entry = MathUtils.clamp(p / (journey ? .65 : .15), 0, 1);
    // Smooth acceleration and deceleration. Cycle phase follows displacement, not time.
    const travelled = (journey ? 8 : 6) * MathUtils.smootherstep(entry, 0, 1);
    const settling = MathUtils.smoothstep(entry, .77, 1);
    group.current.position.set(journey ? -.35 : 0, .17, (journey ? -64.3 : 6) - travelled);
    group.current.rotation.y = journey ? 0 : MathUtils.smoothstep(p, .13, .22) * -.12;
    if (playback.walk) {
      playback.walk.enabled = true;
      playback.walk.setEffectiveWeight((1 - settling) * MathUtils.smoothstep(entry, 0, .06));
      playback.walk.time = (travelled / 1.2 * playback.duration) % playback.duration;
    }
    if (playback.idle) {
      playback.idle.enabled = true;
      playback.idle.setEffectiveWeight(1 - (playback.walk?.getEffectiveWeight() ?? 0));
      playback.idle.time = p * playback.duration * 9;
    }
    playback.mixer.update(0);
    group.current.visible = journey ? p < .98 : p < .47;
  });

  return <group ref={group} dispose={null} />;
}
