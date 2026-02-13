import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import './DomeGallery.css';

type ImageItem = string | { src: string; thumbnail?: string; alt?: string };

type DomeGalleryProps = {
  images?: ImageItem[];
  fit?: number;
  fitBasis?: 'auto' | 'min' | 'max' | 'width' | 'height';
  minRadius?: number;
  maxRadius?: number;
  padFactor?: number;
  overlayBlurColor?: string;
  maxVerticalRotationDeg?: number;
  dragSensitivity?: number;
  enlargeTransitionMs?: number;
  segments?: number;
  dragDampening?: number;
  openedImageWidth?: string;
  openedImageHeight?: string;
  imageBorderRadius?: string;
  openedImageBorderRadius?: string;
  grayscale?: boolean;
};

type ItemDef = {
  src: string;
  thumbnail: string;
  alt: string;
  x: number;
  y: number;
  sizeX: number;
  sizeY: number;
};

const DEFAULT_IMAGES: ImageItem[] = [
  {
    src: 'https://images.unsplash.com/photo-1755331039789-7e5680e26e8f?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Abstract art'
  },
  {
    src: 'https://images.unsplash.com/photo-1755569309049-98410b94f66d?q=80&w=772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Modern sculpture'
  },
  {
    src: 'https://images.unsplash.com/photo-1755497595318-7e5e3523854f?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Digital artwork'
  },
  {
    src: 'https://images.unsplash.com/photo-1755353985163-c2a0fe5ac3d8?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Contemporary art'
  },
  {
    src: 'https://images.unsplash.com/photo-1745965976680-d00be7dc0377?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Geometric pattern'
  },
  {
    src: 'https://images.unsplash.com/photo-1752588975228-21f44630bb3c?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Textured surface'
  },
  {
    src: 'https://pbs.twimg.com/media/Gyla7NnXMAAXSo_?format=jpg&name=large',
    alt: 'Social media image'
  }
];

const DEFAULTS = {
  maxVerticalRotationDeg: 5,
  dragSensitivity: 20,
  enlargeTransitionMs: 300,
  segments: 35
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const normalizeAngle = (d: number) => ((d % 360) + 360) % 360;
const wrapAngleSigned = (deg: number) => {
  const a = (((deg + 180) % 360) + 360) % 360;
  return a - 180;
};
const getDataNumber = (el: HTMLElement, name: string, fallback: number) => {
  const attr = el.dataset[name as keyof HTMLElement['dataset']] ?? el.getAttribute(`data-${name}`);
  const n = attr == null ? NaN : parseFloat(attr as string);
  return Number.isFinite(n) ? (n as number) : fallback;
};

function buildItems(pool: ImageItem[], seg: number): ItemDef[] {
  const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
  const evenYs = [-4, -2, 0, 2, 4];
  const oddYs = [-3, -1, 1, 3, 5];

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2 }));
  });

  const totalSlots = coords.length;
  if (pool.length === 0) {
    return coords.map(c => ({ ...c, src: '', alt: '' }));
  }
  if (pool.length > totalSlots) {
    console.warn(
      `[DomeGallery] Provided image count (${pool.length}) exceeds available tiles (${totalSlots}). Some images will not be shown.`
    );
  }

  const normalizedImages = pool.map(image => {
    if (typeof image === 'string') {
      return { src: image, thumbnail: image, alt: '' };
    }
    return { src: image.src || '', thumbnail: (image as any).thumbnail || image.src || '', alt: image.alt || '' };
  });

  const usedImages = Array.from({ length: totalSlots }, (_, i) => normalizedImages[i % normalizedImages.length]);

  for (let i = 1; i < usedImages.length; i++) {
    if (usedImages[i].src === usedImages[i - 1].src) {
      for (let j = i + 1; j < usedImages.length; j++) {
        if (usedImages[j].src !== usedImages[i].src) {
          const tmp = usedImages[i];
          (usedImages[i] as any) = usedImages[j];
          (usedImages[j] as any) = tmp;
          break;
        }
      }
    }
  }

  return coords.map((c, i) => ({
    ...c,
    src: usedImages[i].src,
    thumbnail: usedImages[i].thumbnail,
    alt: usedImages[i].alt
  }));
}

function computeItemBaseRotation(offsetX: number, offsetY: number, sizeX: number, sizeY: number, segments: number) {
  const unit = 360 / segments / 2;
  const rotateY = unit * (offsetX + (sizeX - 1) / 2);
  const rotateX = unit * (offsetY - (sizeY - 1) / 2);
  return { rotateX, rotateY };
}

export default function DomeGallery({
  images = DEFAULT_IMAGES,
  fit = 0.5,
  fitBasis = 'auto',
  minRadius = 600,
  maxRadius = Infinity,
  padFactor = 0.25,
  overlayBlurColor = '#060010',
  maxVerticalRotationDeg = DEFAULTS.maxVerticalRotationDeg,
  dragSensitivity = DEFAULTS.dragSensitivity,
  enlargeTransitionMs = DEFAULTS.enlargeTransitionMs,
  segments = DEFAULTS.segments,
  dragDampening = 2,
  openedImageWidth = '400px',
  openedImageHeight = '400px',
  imageBorderRadius = '30px',
  openedImageBorderRadius = '30px',
  grayscale = true
}: DomeGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const overlayRORef = useRef<ResizeObserver | null>(null);
  const overlayTransListenerRef = useRef<((e: TransitionEvent) => void) | null>(null);
  const windowOverlayUpdateRef = useRef<(() => void) | null>(null);
  const secondPhaseDidRunRef = useRef(false);
  const [enlargedSrc, setEnlargedSrc] = useState<string | null>(null);
  const focusedElRef = useRef<HTMLElement | null>(null);
  const originalTilePositionRef = useRef<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const rotationRef = useRef({ x: 0, y: 0 });
  const startRotRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const inertiaRAF = useRef<number | null>(null);

  const openingRef = useRef(false);
  const closingRef = useRef(false);
  const openStartedAtRef = useRef(0);
  const lastDragEndAt = useRef(0);

  const scrollLockedRef = useRef(false);
  const lockScroll = useCallback(() => {
    if (scrollLockedRef.current) return;
    // On touch/coarse pointer devices, don't lock body scroll so users can still scroll the page
    try {
      const isCoarse =
        (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
        (typeof navigator !== 'undefined' && (navigator as any).maxTouchPoints > 0);
      if (isCoarse) return;
    } catch {
      // ignore detection failures and proceed to lock on desktop only
    }
    scrollLockedRef.current = true;
    document.body.classList.add('dg-scroll-lock');
  }, []);
  const unlockScroll = useCallback(() => {
    if (!scrollLockedRef.current) return;
    if (rootRef.current?.getAttribute('data-enlarging') === 'true') return;
    scrollLockedRef.current = false;
    document.body.classList.remove('dg-scroll-lock');
  }, []);

  const items = useMemo(() => buildItems(images, segments), [images, segments]);

  const applyTransform = (xDeg: number, yDeg: number) => {
    const el = sphereRef.current;
    if (el) {
      el.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
    }
  };

  const lockedRadiusRef = useRef<number | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      const w = Math.max(1, cr.width),
        h = Math.max(1, cr.height);
      const minDim = Math.min(w, h),
        maxDim = Math.max(w, h),
        aspect = w / h;
      let basis: number;
      switch (fitBasis) {
        case 'min':
          basis = minDim;
          break;
        case 'max':
          basis = maxDim;
          break;
        case 'width':
          basis = w;
          break;
        case 'height':
          basis = h;
          break;
        default:
          basis = aspect >= 1.3 ? w : minDim;
      }
      let radius = basis * fit;
      const heightGuard = h * 1.35;
      radius = Math.min(radius, heightGuard);
      radius = clamp(radius, minRadius, maxRadius);
      lockedRadiusRef.current = Math.round(radius);

      // Make enlarged image as big as possible on phones: reduce viewer padding on coarse pointers/small screens
      let isCoarse = false;
      try {
        isCoarse =
          (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
          (typeof navigator !== 'undefined' && (navigator as any).maxTouchPoints > 0);
      } catch {}

      const mobileLike = isCoarse || Math.min(w, h) <= 768;
      const viewerPad = mobileLike
        ? Math.max(8, Math.round(minDim * Math.min(padFactor ?? 0.25, 0.06))) // ~6% padding on mobile/coarse
        : Math.max(12, Math.round(minDim * (padFactor ?? 0.25)));
      root.style.setProperty('--radius', `${lockedRadiusRef.current}px`);
      root.style.setProperty('--viewer-pad', `${viewerPad}px`);
      root.style.setProperty('--overlay-blur-color', overlayBlurColor);
      root.style.setProperty('--tile-radius', imageBorderRadius);
      root.style.setProperty('--enlarge-radius', openedImageBorderRadius);
      root.style.setProperty('--image-filter', grayscale ? 'grayscale(1)' : 'none');
      applyTransform(rotationRef.current.x, rotationRef.current.y);

      const enlargedOverlay = viewerRef.current?.querySelector('.enlarge') as HTMLElement;
      if (enlargedOverlay && frameRef.current && mainRef.current) {
        const frameR = frameRef.current.getBoundingClientRect();
        const mainR = mainRef.current.getBoundingClientRect();
  const isFixedViewer = rootRef.current?.getAttribute('data-fixed-viewer') === 'true';
  const viewerR = viewerRef.current!.getBoundingClientRect();

        const hasCustomSize = openedImageWidth && openedImageHeight;
        if (hasCustomSize) {
          const tempDiv = document.createElement('div');
          tempDiv.style.cssText = `position: absolute; width: ${openedImageWidth}; height: ${openedImageHeight}; visibility: hidden;`;
          document.body.appendChild(tempDiv);
          const tempRect = tempDiv.getBoundingClientRect();
          document.body.removeChild(tempDiv);

          const centeredLeft = (isFixedViewer ? frameR.left - viewerR.left : frameR.left - mainR.left) + (frameR.width - tempRect.width) / 2;
          const centeredTop = (isFixedViewer ? frameR.top - viewerR.top : frameR.top - mainR.top) + (frameR.height - tempRect.height) / 2;

          enlargedOverlay.style.left = `${centeredLeft}px`;
          enlargedOverlay.style.top = `${centeredTop}px`;
        } else {
          enlargedOverlay.style.left = `${isFixedViewer ? frameR.left - viewerR.left : frameR.left - mainR.left}px`;
          enlargedOverlay.style.top = `${isFixedViewer ? frameR.top - viewerR.top : frameR.top - mainR.top}px`;
          enlargedOverlay.style.width = `${frameR.width}px`;
          enlargedOverlay.style.height = `${frameR.height}px`;
        }
      }
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [
    fit,
    fitBasis,
    minRadius,
    maxRadius,
    padFactor,
    overlayBlurColor,
    grayscale,
    imageBorderRadius,
    openedImageBorderRadius,
    openedImageWidth,
    openedImageHeight
  ]);

  useEffect(() => {
    applyTransform(rotationRef.current.x, rotationRef.current.y);
  }, []);

  const stopInertia = useCallback(() => {
    if (inertiaRAF.current) {
      cancelAnimationFrame(inertiaRAF.current);
      inertiaRAF.current = null;
    }
  }, []);

  const startInertia = useCallback(
    (vx: number, vy: number) => {
      const MAX_V = 1.4;
      let vX = clamp(vx, -MAX_V, MAX_V) * 80;
      let vY = clamp(vy, -MAX_V, MAX_V) * 80;

      let frames = 0;
      const d = clamp(dragDampening ?? 0.6, 0, 1);
      const frictionMul = 0.94 + 0.055 * d;
      const stopThreshold = 0.015 - 0.01 * d;
      const maxFrames = Math.round(90 + 270 * d);

      const step = () => {
        vX *= frictionMul;
        vY *= frictionMul;
        if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
          inertiaRAF.current = null;
          return;
        }
        if (++frames > maxFrames) {
          inertiaRAF.current = null;
          return;
        }
        const nextX = clamp(rotationRef.current.x - vY / 200, -maxVerticalRotationDeg, maxVerticalRotationDeg);
        const nextY = wrapAngleSigned(rotationRef.current.y + vX / 200);
        rotationRef.current = { x: nextX, y: nextY };
        applyTransform(nextX, nextY);
        inertiaRAF.current = requestAnimationFrame(step);
      };
      stopInertia();
      inertiaRAF.current = requestAnimationFrame(step);
    },
    [dragDampening, maxVerticalRotationDeg, stopInertia]
  );

  useGesture(
    {
      onDragStart: ({ event }: any) => {
        if (focusedElRef.current) return;
        stopInertia();
        const evt = event as PointerEvent;
        draggingRef.current = true;
        movedRef.current = false;
        startRotRef.current = { ...rotationRef.current };
        startPosRef.current = { x: evt.clientX, y: evt.clientY };
      },
      onDrag: ({ event, last, velocity = [0, 0], direction = [0, 0], movement }: any) => {
        if (focusedElRef.current || !draggingRef.current || !startPosRef.current) return;

        const evt = event as PointerEvent;
        const dxTotal = evt.clientX - startPosRef.current.x;
        const dyTotal = evt.clientY - startPosRef.current.y;

        if (!movedRef.current) {
          const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
          if (dist2 > 16) movedRef.current = true;
        }

        const nextX = clamp(
          startRotRef.current.x - dyTotal / dragSensitivity,
          -maxVerticalRotationDeg,
          maxVerticalRotationDeg
        );
        const nextY = wrapAngleSigned(startRotRef.current.y + dxTotal / dragSensitivity);

        if (rotationRef.current.x !== nextX || rotationRef.current.y !== nextY) {
          rotationRef.current = { x: nextX, y: nextY };
          applyTransform(nextX, nextY);
        }

        if (last) {
          draggingRef.current = false;

          let [vMagX, vMagY] = velocity;
          const [dirX, dirY] = direction;
          let vx = vMagX * dirX;
          let vy = vMagY * dirY;

          if (Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001 && Array.isArray(movement)) {
            const [mx, my] = movement as [number, number];
            vx = clamp((mx / dragSensitivity) * 0.02, -1.2, 1.2);
            vy = clamp((my / dragSensitivity) * 0.02, -1.2, 1.2);
          }

          if (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005) {
            startInertia(vx, vy);
          }

          if (movedRef.current) lastDragEndAt.current = performance.now();

          movedRef.current = false;
        }
      }
    },
    { target: mainRef, eventOptions: { passive: true } }
  );

  const openItemFromElement = async (el: HTMLElement) => {
    if (openingRef.current) return;
    openingRef.current = true;
    openStartedAtRef.current = performance.now();
    lockScroll();

    // On mobile/touch, fix the viewer to the viewport to avoid scroll-jank “hanging” effect
    let fixedViewer = false;
    try {
      fixedViewer =
        (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
        (typeof navigator !== 'undefined' && (navigator as any).maxTouchPoints > 0);
    } catch {}
    if (fixedViewer) rootRef.current?.setAttribute('data-fixed-viewer', 'true');

    const parent = el.parentElement as HTMLElement;
    focusedElRef.current = el;
    el.setAttribute('data-focused', 'true');

    const offsetX = getDataNumber(parent, 'offsetX', 0);
    const offsetY = getDataNumber(parent, 'offsetY', 0);
    const sizeX = getDataNumber(parent, 'sizeX', 2);
    const sizeY = getDataNumber(parent, 'sizeY', 2);

    const parentRot = computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments);
    const parentY = normalizeAngle(parentRot.rotateY);
    const globalY = normalizeAngle(rotationRef.current.y);
    let rotY = -(parentY + globalY) % 360;
    if (rotY < -180) rotY += 360;
    const rotX = -parentRot.rotateX - rotationRef.current.x;
    parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
    parent.style.setProperty('--rot-x-delta', `${rotX}deg`);

    const refDiv = document.createElement('div');
    refDiv.className = 'item__image item__image--reference';
    refDiv.style.opacity = '0';
    refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
    parent.appendChild(refDiv);

  const tileR = refDiv.getBoundingClientRect();
  const mainR = mainRef.current!.getBoundingClientRect();
  const frameR = frameRef.current!.getBoundingClientRect();
    originalTilePositionRef.current = {
      left: tileR.left,
      top: tileR.top,
      width: tileR.width,
      height: tileR.height
    };

    el.style.visibility = 'hidden';
    (el.style as any).zIndex = 0;

  const overlay = document.createElement('div');
    overlay.className = 'enlarge';
    overlay.style.position = 'absolute';
      const viewerR0 = viewerRef.current!.getBoundingClientRect();
      overlay.style.left = (rootRef.current?.getAttribute('data-fixed-viewer') === 'true' ? frameR.left - viewerR0.left : frameR.left - mainR.left) + 'px';
      overlay.style.top = (rootRef.current?.getAttribute('data-fixed-viewer') === 'true' ? frameR.top - viewerR0.top : frameR.top - mainR.top) + 'px';
    overlay.style.width = frameR.width + 'px';
    overlay.style.height = frameR.height + 'px';
    overlay.style.opacity = '0';
    overlay.style.zIndex = '30';
    overlay.style.willChange = 'transform, opacity';
    overlay.style.transformOrigin = 'top left';
      const localTransitionMs = (rootRef.current?.getAttribute('data-fixed-viewer') === 'true')
        ? Math.min(260, enlargeTransitionMs)
        : enlargeTransitionMs;
      overlay.style.transition = `transform ${localTransitionMs}ms ease, opacity ${localTransitionMs}ms ease`;

  const rawSrc = parent.dataset.src || (el.querySelector('img') as HTMLImageElement)?.src || '';
    const img = document.createElement('img');
    img.src = rawSrc;
    // Preload/decode the image to avoid jank on first paint; don't block too long
    const decodeWithTimeout = async (image: HTMLImageElement, ms = 150) => {
      try {
        const p = image.decode ? image.decode() : Promise.resolve();
        await Promise.race([
          p,
          new Promise<void>(resolve => setTimeout(resolve, ms))
        ]);
      } catch {
        // ignore decode errors, proceed
      }
    };
    await decodeWithTimeout(img);
    overlay.appendChild(img);
    viewerRef.current!.appendChild(overlay);
  setEnlargedSrc(rawSrc || null);

    const tx0 = tileR.left - frameR.left;
    const ty0 = tileR.top - frameR.top;
    const sx0 = tileR.width / frameR.width;
    const sy0 = tileR.height / frameR.height;
      overlay.style.transform = `translate3d(${tx0}px, ${ty0}px, 0) scale(${sx0}, ${sy0})`;
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
        overlay.style.transform = 'translate3d(0px, 0px, 0) scale(1, 1)';
      rootRef.current?.setAttribute('data-enlarging', 'true');

      // Update CSS vars for overlay rect so buttons can anchor to image corners
      const updateOverlayVars = () => {
        const r = overlay.getBoundingClientRect();
        const root = rootRef.current;
        if (!root) return;
        root.style.setProperty('--enlarge-left', `${r.left}px`);
        root.style.setProperty('--enlarge-top', `${r.top}px`);
        root.style.setProperty('--enlarge-width', `${r.width}px`);
        root.style.setProperty('--enlarge-height', `${r.height}px`);
      };
      updateOverlayVars();
      // Observe overlay size/pos changes
      try {
        overlayRORef.current?.disconnect();
        overlayRORef.current = new ResizeObserver(() => updateOverlayVars());
        overlayRORef.current.observe(overlay);
      } catch {}
      // Update after transitions too
      const onTransEnd = () => updateOverlayVars();
      overlayTransListenerRef.current = onTransEnd;
      overlay.addEventListener('transitionend', onTransEnd);
      // Update on scroll/resize in case layout shifts
      const onWinUpdate = () => updateOverlayVars();
      windowOverlayUpdateRef.current = onWinUpdate;
      window.addEventListener('resize', onWinUpdate);
      window.addEventListener('scroll', onWinUpdate, { passive: true });
    });

  // Always center the opened image by performing the second-phase resize/position step
  // on all devices (including coarse/touch). This ensures the image ends up in the middle
  // of the page after the initial grow-from-tile animation.
  const wantsResize = Boolean(openedImageWidth || openedImageHeight);
    if (wantsResize) {
      const runSecondPhase = () => {
        secondPhaseDidRunRef.current = true;
        const prevTransition = overlay.style.transition;
        overlay.style.transition = 'none';
        const tempWidth = openedImageWidth || `${frameR.width}px`;
        const tempHeight = openedImageHeight || `${frameR.height}px`;
        overlay.style.width = tempWidth;
        overlay.style.height = tempHeight;
        const newRect = overlay.getBoundingClientRect();
        overlay.style.width = frameR.width + 'px';
        overlay.style.height = frameR.height + 'px';
        void overlay.offsetWidth;
          overlay.style.transition = `left ${localTransitionMs}ms ease, top ${localTransitionMs}ms ease, width ${localTransitionMs}ms ease, height ${localTransitionMs}ms ease`;
  const isFixedViewer2 = rootRef.current?.getAttribute('data-fixed-viewer') === 'true';
  const viewerR2 = viewerRef.current!.getBoundingClientRect();
  const centeredLeft = (isFixedViewer2 ? frameR.left - viewerR2.left : frameR.left - mainR.left) + (frameR.width - newRect.width) / 2;
  const centeredTop = (isFixedViewer2 ? frameR.top - viewerR2.top : frameR.top - mainR.top) + (frameR.height - newRect.height) / 2;
        requestAnimationFrame(() => {
          overlay.style.left = `${centeredLeft}px`;
          overlay.style.top = `${centeredTop}px`;
          overlay.style.width = tempWidth;
          overlay.style.height = tempHeight;
          // Also refresh overlay vars to reflect new geometry
          const root = rootRef.current;
          if (root) {
            const r = overlay.getBoundingClientRect();
            root.style.setProperty('--enlarge-left', `${r.left}px`);
            root.style.setProperty('--enlarge-top', `${r.top}px`);
            root.style.setProperty('--enlarge-width', `${r.width}px`);
            root.style.setProperty('--enlarge-height', `${r.height}px`);
          }
        });
        const cleanupSecond = () => {
          overlay.removeEventListener('transitionend', cleanupSecond);
          overlay.style.transition = prevTransition;
        };
        overlay.addEventListener('transitionend', cleanupSecond, {
          once: true
        });
      };
      const onFirstEnd = (ev: TransitionEvent) => {
        if (ev.propertyName !== 'transform') return;
        overlay.removeEventListener('transitionend', onFirstEnd);
        runSecondPhase();
      };
      overlay.addEventListener('transitionend', onFirstEnd);
      // Fallback: some mobile browsers might swallow the first transitionend.
      // Kick the second phase after a small delay if we haven't run it yet.
      setTimeout(() => {
        if (!secondPhaseDidRunRef.current) {
          runSecondPhase();
        }
      }, Math.min(320, localTransitionMs + 60));
    }
  };

  const onTileClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingRef.current) return;
    if (performance.now() - lastDragEndAt.current < 80) return;
    if (openingRef.current) return;
    void openItemFromElement(e.currentTarget);
  }, []);

  const onTilePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return;
    if (draggingRef.current) return;
    if (performance.now() - lastDragEndAt.current < 80) return;
    if (openingRef.current) return;
    void openItemFromElement(e.currentTarget);
  }, []);

  const onTileTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (draggingRef.current) return;
    if (performance.now() - lastDragEndAt.current < 80) return;
    if (openingRef.current) return;
    void openItemFromElement(e.currentTarget);
  }, []);

  const closeOverlay = useCallback(() => {
    if (closingRef.current) return;
    // Allow immediate close; no artificial delay
    const el = focusedElRef.current;
    if (!el) return;
    closingRef.current = true;

    const parent = el.parentElement as HTMLElement;
    const overlay = viewerRef.current?.querySelector('.enlarge') as HTMLElement | null;
    const refDiv = parent.querySelector('.item__image--reference') as HTMLElement | null;
    const finalize = () => {
      originalTilePositionRef.current = null;
      if (refDiv) refDiv.remove();
      (parent.style as any).transition = 'none';
      (el.style as any).transition = 'none';
      parent.style.setProperty('--rot-y-delta', `0deg`);
      parent.style.setProperty('--rot-x-delta', `0deg`);
      requestAnimationFrame(() => {
        el.style.visibility = '';
        (el.style as any).opacity = '0';
        (el.style as any).zIndex = 0;
        focusedElRef.current = null;
        rootRef.current?.removeAttribute('data-enlarging');
        rootRef.current?.removeAttribute('data-fixed-viewer');
        // Clear overlay position vars and listeners
        try { overlayRORef.current?.disconnect(); } catch {}
        overlayRORef.current = null;
        if (overlayTransListenerRef.current) {
          overlay?.removeEventListener('transitionend', overlayTransListenerRef.current as any);
        }
        if (windowOverlayUpdateRef.current) {
          window.removeEventListener('resize', windowOverlayUpdateRef.current);
          window.removeEventListener('scroll', windowOverlayUpdateRef.current as any);
        }
        const root = rootRef.current;
        if (root) {
          root.style.removeProperty('--enlarge-left');
          root.style.removeProperty('--enlarge-top');
          root.style.removeProperty('--enlarge-width');
          root.style.removeProperty('--enlarge-height');
        }
  setEnlargedSrc(null);
        requestAnimationFrame(() => {
          (parent.style as any).transition = '';
          el.style.transition = 'opacity 220ms ease-out';
          requestAnimationFrame(() => {
            (el.style as any).opacity = '1';
            setTimeout(() => {
              el.style.transition = '' as any;
              (el.style as any).opacity = '';
              openingRef.current = false;
              closingRef.current = false;
              unlockScroll();
            }, 240);
          });
        });
      });
    };

    // If no overlay, perform fallback cleanup immediately
    if (!overlay) {
      finalize();
      return;
    }

    const originalPos = originalTilePositionRef.current;
    if (!originalPos) {
      overlay.remove();
      finalize();
      return;
    }

    const currentRect = overlay.getBoundingClientRect();
    const rootRect = rootRef.current!.getBoundingClientRect();

    const originalPosRelativeToRoot = {
      left: originalPos.left - rootRect.left,
      top: originalPos.top - rootRect.top,
      width: originalPos.width,
      height: originalPos.height
    };

    const overlayRelativeToRoot = {
      left: currentRect.left - rootRect.left,
      top: currentRect.top - rootRect.top,
      width: currentRect.width,
      height: currentRect.height
    };

    const animatingOverlay = document.createElement('div');
    animatingOverlay.className = 'enlarge-closing';
    animatingOverlay.style.cssText = `
      position: absolute;
      left: ${overlayRelativeToRoot.left}px;
      top: ${overlayRelativeToRoot.top}px;
      width: ${overlayRelativeToRoot.width}px;
      height: ${overlayRelativeToRoot.height}px;
      z-index: 9999;
      border-radius: var(--enlarge-radius, 32px);
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,.35);
      transition: all ${enlargeTransitionMs}ms ease-out;
      pointer-events: none;
      margin: 0;
      transform: none;
    `;

    const originalImg = overlay.querySelector('img');
    if (originalImg) {
      const img = originalImg.cloneNode() as HTMLImageElement;
      (img.style as any).width = '100%';
      (img.style as any).height = '100%';
      (img.style as any).objectFit = 'cover';
      animatingOverlay.appendChild(img);
    }

    overlay.remove();
    rootRef.current!.appendChild(animatingOverlay);
    void animatingOverlay.getBoundingClientRect();
    requestAnimationFrame(() => {
      animatingOverlay.style.left = originalPosRelativeToRoot.left + 'px';
      animatingOverlay.style.top = originalPosRelativeToRoot.top + 'px';
      animatingOverlay.style.width = originalPosRelativeToRoot.width + 'px';
      animatingOverlay.style.height = originalPosRelativeToRoot.height + 'px';
      (animatingOverlay.style as any).opacity = '0';
    });

    const cleanup = () => {
      animatingOverlay.remove();
      finalize();
    };
    animatingOverlay.addEventListener('transitionend', cleanup, { once: true });
    // Safety: if transitionend doesn't fire, ensure we clean up
    setTimeout(() => {
      if (closingRef.current) {
        cleanup();
      }
    }, Math.max(400, enlargeTransitionMs + 350));
  }, [enlargeTransitionMs, unlockScroll]);

  useEffect(() => {
    const scrim = scrimRef.current;
    if (!scrim) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeOverlay();
    };
    const onScrimClick = () => closeOverlay();
    scrim.addEventListener('click', onScrimClick);
    window.addEventListener('keydown', onKey);
    return () => {
      scrim.removeEventListener('click', onScrimClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [closeOverlay]);

  // download feature removed: keep enlargedSrc/enlargedAlt state for viewer UI only

  useEffect(() => {
    return () => {
      document.body.classList.remove('dg-scroll-lock');
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="sphere-root"
      style={
        {
          ['--segments-x' as any]: segments,
          ['--segments-y' as any]: segments,
          ['--overlay-blur-color' as any]: overlayBlurColor,
          ['--tile-radius' as any]: imageBorderRadius,
          ['--enlarge-radius' as any]: openedImageBorderRadius,
          ['--image-filter' as any]: grayscale ? 'grayscale(1)' : 'none'
        } as React.CSSProperties
      }
    >
      <main ref={mainRef} className="sphere-main">
        <div className="stage">
          <div ref={sphereRef} className="sphere">
            {items.map((it, i) => (
              <div
                key={`${it.x},${it.y},${i}`}
                className="item"
                data-src={it.src}
                data-alt={it.alt}
                data-offset-x={it.x}
                data-offset-y={it.y}
                data-size-x={it.sizeX}
                data-size-y={it.sizeY}
                style={
                  {
                    ['--offset-x' as any]: it.x,
                    ['--offset-y' as any]: it.y,
                    ['--item-size-x' as any]: it.sizeX,
                    ['--item-size-y' as any]: it.sizeY
                  } as React.CSSProperties
                }
              >
                <div
                  className="item__image"
                  role="button"
                  tabIndex={0}
                  aria-label={it.alt || 'Open image'}
                  onClick={onTileClick}
                  onPointerUp={onTilePointerUp}
                  onTouchEnd={onTileTouchEnd}
                >
                  {/* Blurred duplicate for background glow — use thumbnail for speed */}
                  <img className="dg-glow" src={it.thumbnail || it.src} aria-hidden="true" alt="" draggable={false} loading="lazy" decoding="async" />
                  {/* Main image — use thumbnail for grid, full-res loads on enlarge */}
                  <img className="dg-img" src={it.thumbnail || it.src} draggable={false} alt={it.alt} loading="lazy" decoding="async" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overlay" />
        <div className="overlay overlay--blur" />
        <div className="edge-fade edge-fade--top" />
        <div className="edge-fade edge-fade--bottom" />

        <div className="viewer" ref={viewerRef}>
          <div ref={scrimRef} className="scrim" />
          <div ref={frameRef} className="frame" />
          {/* Close button (visible only when an image is enlarged) */}
          <button
            type="button"
            className="close-btn"
            aria-label="Close image"
            title="Close"
            onClick={() => {
              // Trigger the same close flow as scrim click / Escape
              const clickEvt = new MouseEvent('click', { bubbles: true });
              scrimRef.current?.dispatchEvent(clickEvt);
            }}
            disabled={!enlargedSrc}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          {/* download button removed intentionally */}
        </div>
      </main>
    </div>
  );
}
