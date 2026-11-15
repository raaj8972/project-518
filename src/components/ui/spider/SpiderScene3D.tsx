import { useEffect, useRef, type RefObject } from 'react';
import { ACESFilmicToneMapping, DirectionalLight, HemisphereLight, Mesh, PerspectiveCamera, Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer } from 'three';
import { createSpiderModel } from './spiderModel';
import { createSpiderEscape, spiderEscapePose, spiderPose, SPIDER_SCARE_EVENT, type SpiderEscape } from './spiderMotion';

export interface SpiderSceneProps {
  paused: boolean;
  silkRef: RefObject<SVGLineElement>;
  onReady: () => void;
  onUnavailable: () => void;
}

export function SpiderScene3D({ paused, silkRef, onReady, onUnavailable }: SpiderSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const wake = useRef<() => void>(() => {});
  useEffect(() => { pausedRef.current = paused; wake.current(); }, [paused]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: window.innerWidth >= 768, powerPreference: 'low-power' });
    } catch { onUnavailable(); return; }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.dataset.spiderRenderer = 'webgl';
    renderer.domElement.dataset.legs = '8';
    renderer.domElement.dataset.model = 'mechanical-green-gold';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    element.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(40, 1, .1, 50);
    camera.position.set(0, 8, 6.7); camera.lookAt(0, .65, 0); camera.updateMatrixWorld();
    scene.add(new HemisphereLight(0xe2edcc, 0x0c271c, 2.4));
    const key = new DirectionalLight(0xffe6af, 5.2); key.position.set(-4, 8, 5); scene.add(key);
    const rim = new DirectionalLight(0x8cff8c, 3.1); rim.position.set(4, 4, -4); scene.add(rim);
    const spider = createSpiderModel(); scene.add(spider.root);
    const attachment = new Vector3();
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    let size = 252;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let frameId = 0;
    let lastTime = performance.now();
    let lastPaint = 0;
    let frameInterval = 1000 / 24;
    let elapsed = pausedRef.current ? 12 : 0;
    let gaitTime = elapsed;
    let escape: SpiderEscape | null = null;
    let escapeTime = 0;
    let spiderPress: { x: number; y: number; time: number } | null = null;
    let currentPose = spiderPose(elapsed, width, height, size);
    let disposed = false;
    let contextLost = false;
    let overlayHidden = Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
    let heading = -Math.PI;
    const resize = () => {
      width = window.innerWidth; height = window.innerHeight;
      frameInterval = 1000 / (width < 768 ? 20 : 24);
      size = Math.max(90, Math.min(width < 768 ? width * .468 : width * .24, 370, height * .45));
      renderer.setPixelRatio(width < 768 ? 1 : Math.min(window.devicePixelRatio || 1, 1.25));
      renderer.setSize(size, size);
      element.style.width = `${size}px`; element.style.height = `${size}px`;
      // A viewport change invalidates screen-space flight coordinates.
      escape = null;
      draw();
    };
    const draw = () => {
      if (disposed || contextLost || document.hidden || overlayHidden) return;
      const pose = escape ? spiderEscapePose(escape, escapeTime) : spiderPose(elapsed, width, height, size);
      currentPose = pose;
      element.style.transform = `translate3d(${pose.x - size / 2}px, ${pose.y - size / 2}px, 0)`;
      element.dataset.phase = pose.phase;
      spider.update(gaitTime, pose.hanging);
      const target = -pose.heading;
      const difference = Math.atan2(Math.sin(target - heading), Math.cos(target - heading));
      heading += difference * (escape ? .48 : .13);
      spider.root.rotation.y = heading;
      spider.root.updateMatrixWorld(true);
      const silk = silkRef.current;
      if (silk) {
        attachment.set(0, 1.1, 2.15).applyMatrix4(spider.root.matrixWorld).project(camera);
        const endX = pose.x + attachment.x * size / 2;
        const endY = pose.y - attachment.y * size / 2;
        silk.setAttribute('x1', String(pose.anchorX)); silk.setAttribute('y1', '0');
        silk.setAttribute('x2', String(endX)); silk.setAttribute('y2', String(Math.max(0, endY)));
        silk.style.opacity = endY > 0 ? String(pose.thread * .72) : '0';
      }
      renderer.render(scene, camera);
    };
    const tick = (now: number) => {
      frameId = 0;
      if (disposed || contextLost || pausedRef.current || document.hidden || overlayHidden) return;
      frameId = requestAnimationFrame(tick);
      const sincePaint = now - lastPaint;
      if (sincePaint < frameInterval) return;
      const delta = Math.min((now - lastTime) / 1000, .1);
      gaitTime += delta * (escape ? 5.5 : 1);
      if (escape) {
        escapeTime += delta;
        if (escapeTime >= escape.duration) { elapsed = escape.resumeAt; escape = null; }
      } else elapsed += delta;
      lastTime = now; lastPaint = now - sincePaint % frameInterval;
      draw();
    };
    const resume = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      if (disposed || contextLost || pausedRef.current || document.hidden || overlayHidden) return;
      lastTime = performance.now(); lastPaint = lastTime;
      frameId = requestAnimationFrame(tick);
    };
    // The page hides this overlay behind dialogs. Stop its WebGL work as well,
    // and resume only when that visibility actually changes.
    const syncOverlayVisibility = () => {
      const nextHidden = Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
      if (nextHidden === overlayHidden) return;
      overlayHidden = nextHidden;
      resume();
    };
    const visibilityObserver = new MutationObserver(syncOverlayVisibility);
    visibilityObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['role', 'aria-modal'] });
    const lost = (event: Event) => { event.preventDefault(); contextLost = true; if (frameId) cancelAnimationFrame(frameId); frameId = 0; };
    const restored = () => { contextLost = false; resume(); };
    const scare = (x: number, y: number) => {
      if (disposed || contextLost || pausedRef.current || document.hidden || overlayHidden || getComputedStyle(element).visibility === 'hidden') return;
      escape = createSpiderEscape(currentPose, x, y, width, height, size);
      escapeTime = 0;
      element.dataset.reactions = String(Number(element.dataset.reactions || 0) + 1);
      // Paint the detached silk and fast heading immediately, before the next frame.
      draw();
    };
    const press = (event: PointerEvent) => {
      if (event.isPrimary === false || event.button > 0 || pausedRef.current || document.hidden || overlayHidden) return;
      spiderPress = null;
      if (event.target instanceof Element && event.target.closest('.site-spider-controls, .cyberpunk-navbar')) return;
      const rect = renderer.domElement.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      if (getComputedStyle(element).visibility !== 'hidden' && raycaster.intersectObject(spider.root, true).some(hit => hit.object instanceof Mesh)) {
        spiderPress = { x: event.clientX, y: event.clientY, time: performance.now() };
        scare(event.clientX, event.clientY);
      }
    };
    const click = (event: MouseEvent) => {
      // A deliberate spider tap must not activate a form/link underneath its body.
      if (spiderPress && performance.now() - spiderPress.time < 800 && Math.hypot(event.clientX - spiderPress.x, event.clientY - spiderPress.y) < 16) {
        event.preventDefault(); event.stopPropagation();
      }
      spiderPress = null;
    };
    const cancelPress = () => { spiderPress = null; };
    const keyboardScare = () => scare(currentPose.x, currentPose.y);
    wake.current = resume;
    resize(); onReady(); resume();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', resume);
    // Observe taps without changing scroll gestures; only a mesh hit consumes its click.
    document.addEventListener('pointerdown', press, { capture: true, passive: true });
    document.addEventListener('click', click, true);
    document.addEventListener('pointercancel', cancelPress, { passive: true });
    window.addEventListener(SPIDER_SCARE_EVENT, keyboardScare);
    renderer.domElement.addEventListener('webglcontextlost', lost);
    renderer.domElement.addEventListener('webglcontextrestored', restored);
    return () => {
      disposed = true; if (frameId) cancelAnimationFrame(frameId);
      visibilityObserver.disconnect();
      wake.current = () => {};
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', resume);
      document.removeEventListener('pointerdown', press, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('pointercancel', cancelPress);
      window.removeEventListener(SPIDER_SCARE_EVENT, keyboardScare);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.domElement.removeEventListener('webglcontextrestored', restored);
      spider.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [onReady, onUnavailable, silkRef]);

  return <div ref={host} className="site-spider-model" data-spider-model aria-hidden="true" />;
}
