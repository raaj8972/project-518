import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PMREMGenerator, Vector2 } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** Broad reflected light gives metal a readable surface without shipping a large HDRI. */
export function CinematicReflections({ quality, intensity }: { quality: 'high' | 'low'; intensity?: number }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const room = new RoomEnvironment();
    const generator = new PMREMGenerator(gl);
    const target = generator.fromScene(room, .04);
    scene.environment = target.texture;
    scene.environmentIntensity = intensity ?? (quality === 'high' ? .72 : .62);
    room.dispose(); generator.dispose(); invalidate();
    return () => { if (scene.environment === target.texture) scene.environment = null; target.dispose(); };
  }, [gl, scene, quality, intensity, invalidate]);
  return null;
}

/** High tier only. The low tier keeps native antialiasing and a single render pass. */
export function CinematicBloom() {
  const { gl, scene, camera, size, invalidate } = useThree();
  const chain = useRef<{ composer: EffectComposer; bloom: UnrealBloomPass; output: OutputPass } | null>(null);
  useEffect(() => {
    const composer = new EffectComposer(gl);
    composer.setPixelRatio(Math.min(gl.getPixelRatio(), 1.25));
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new Vector2(512, 512), .44, .65, .95);
    composer.addPass(bloom);
    const output = new OutputPass(); composer.addPass(output);
    chain.current = { composer, bloom, output }; invalidate();
    return () => { chain.current = null; bloom.dispose(); output.dispose(); composer.dispose(); };
  }, [gl, scene, camera, invalidate]);
  useEffect(() => { chain.current?.composer.setSize(size.width, size.height); }, [size.width, size.height]);
  useFrame(() => { if (chain.current) chain.current.composer.render(); else gl.render(scene, camera); }, 1);
  return null;
}
