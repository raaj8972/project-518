import { Suspense, useCallback, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, PerspectiveCamera } from 'three';
import CinematicCharacter from './CinematicCharacter';
import { CinematicWorld } from './CinematicWorld';
import { sampleCamera } from './cinematicMotion';
import { samplePortalCamera } from './cinematicMotion';
import { CinematicBloom, CinematicReflections } from './CinematicLighting';
import PortalLogo from './CinematicPortalLogo';
import { DEFAULT_BRAND_LOGO } from './portalLogoUrl';
import { createFrameHealthMonitor } from './frameHealth';
import { visibleTimeout } from './introCapability';
import type { CharacterLook } from './inlineLook';

export interface SceneProps {
  progress: { current: number };
  quality: 'high' | 'low';
  onReady: () => void;
  onFailure: () => void;
  registerInvalidate: (fn: (() => void) | null) => void;
  variant?: 'realm' | 'portal';
  logoUrl?: string;
  look?: CharacterLook;
}
function WorldProgress({ source, target, portal }: { source: {current: number}; target: {current: number}; portal: boolean }) {
  useFrame(() => { target.current = portal ? .55 + source.current * .3 : source.current; }, -2);
  return null;
}
function CameraRig({ progress, registerInvalidate, onReady, onFailure, variant, look }: Omit<SceneProps, 'quality'>) {
  const { invalidate, gl } = useThree();
  const first = useRef(true);
  const cancelFrameTimeout = useRef<(() => void) | undefined>();
  const requestedAt = useRef<number | undefined>();
  const health = useRef(createFrameHealthMonitor(onFailure));
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const request = () => {
      if (!cancelFrameTimeout.current) { requestedAt.current = performance.now(); cancelFrameTimeout.current = visibleTimeout(onFailure, 4000); }
      invalidate();
    };
    registerInvalidate(request);
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    const visibility = () => { health.current.reset(); if (requestedAt.current !== undefined) requestedAt.current = performance.now(); };
    canvas.addEventListener('webglcontextlost', lost);
    document.addEventListener('visibilitychange', visibility);
    request();
    return () => { mounted.current = false; cancelFrameTimeout.current?.(); cancelFrameTimeout.current = undefined; registerInvalidate(null); canvas.removeEventListener('webglcontextlost', lost); document.removeEventListener('visibilitychange', visibility); };
  }, [gl, invalidate, registerInvalidate, onFailure]);
  useFrame(({ camera, size }) => {
    cancelFrameTimeout.current?.(); cancelFrameTimeout.current = undefined;
    const aspect = size.width / Math.max(1, size.height);
    const pose = variant === 'portal' ? samplePortalCamera(progress.current, aspect, look?.yaw) : sampleCamera(progress.current, aspect);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    if (camera instanceof PerspectiveCamera && camera.fov !== pose.fov) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
    if (first.current) { first.current = false; onReady(); }
  });
  useFrame(() => {
    const started = performance.now();
    const requestDelay = requestedAt.current === undefined ? 0 : started - requestedAt.current;
    requestedAt.current = undefined;
    queueMicrotask(() => {
      if (!mounted.current) return;
      if (document.hidden) health.current.reset(); else health.current.sample(Math.max(requestDelay, performance.now() - started));
    });
  }, -3);
  return null;
}
export default function CinematicScene(props: SceneProps) {
  const { progress, quality, onReady, onFailure } = props;
  const portal = props.variant === 'portal';
  const worldProgress = useRef(portal ? .55 : progress.current);
  const ready = useCallback(() => { onReady(); }, [onReady]);
  return <Canvas className="cinematic-webgl" aria-hidden="true" frameloop="demand" dpr={quality === 'low' ? [1, 1.25] : [1, 1.5]} shadows={quality === 'high'}
    camera={{ position: [4, 3.2, 12], near: .08, far: 230, fov: 48 }}
    gl={{ antialias: true, alpha: true, powerPreference: quality === 'high' ? 'high-performance' : 'low-power', failIfMajorPerformanceCaveat: true, stencil: false, preserveDrawingBuffer: false }}
    onCreated={({ gl }) => { gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = portal ? 1.05 : 1.25; gl.debug.onShaderError = () => onFailure(); }}
    fallback={<span>3D is unavailable. Use Skip intro to enter the festival.</span>}>
    <fogExp2 attach="fog" args={['#08221b', .011]} />
    <hemisphereLight args={['#8dcbb6', '#070c0a', portal ? .4 : 2.3]} />
    <directionalLight position={[-9, 18, 10]} color="#f8d68e" intensity={portal ? .8 : 3.2} castShadow={quality === 'high'}
      shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14}
      shadow-camera-near={.5} shadow-camera-far={65} shadow-bias={-.0007} shadow-normalBias={.035} />
    <directionalLight position={[8, 9, -28]} color="#5dffc2" intensity={portal ? 1.1 : 3.8} />
    <CinematicReflections quality={quality} intensity={portal ? .22 : undefined} />
    {quality === 'high' && <CinematicBloom />}
    <Suspense fallback={null}>
      <WorldProgress source={progress} target={worldProgress} portal={portal} />
      <CinematicWorld progress={worldProgress} quality={quality} />
      <CinematicCharacter progress={progress} quality={quality} journey={portal} />
      {portal && <>
        <PortalLogo logoUrl={props.logoUrl || DEFAULT_BRAND_LOGO} progress={progress} />
        <pointLight position={[2.5, 5, -65]} intensity={20} color="#e5bd77" distance={22} decay={2} />
        <pointLight position={[-2, 4.5, -74]} intensity={12} color="#d9c6a6" distance={18} decay={2} />
        <mesh position={[0, 6, -84]}><planeGeometry args={[16, 17]} /><meshBasicMaterial color="#010b07" /></mesh>
      </>}
      <CameraRig progress={progress} look={props.look} variant={props.variant} registerInvalidate={props.registerInvalidate} onReady={ready} onFailure={onFailure} />
    </Suspense>
  </Canvas>;
}
