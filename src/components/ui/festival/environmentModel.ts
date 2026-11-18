import {
  BoxGeometry, CanvasTexture, DoubleSide, Group, Mesh, MeshStandardMaterial,
  PlaneGeometry, SRGBColorSpace, TorusGeometry, CylinderGeometry,
} from 'three';
import { seededRandom } from './environmentMotion';
import { createFlagClothMotion, type FlagInteraction } from './flagMotion';

export function createGlowTexture(smoke = false) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const random = seededRandom(124);
    if (smoke) {
      for (let i = 0; i < 30; i++) {
        const x = 34 + random() * 60; const y = 34 + random() * 60; const radius = 16 + random() * 22;
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(215,229,207,.18)'); gradient.addColorStop(1, 'rgba(215,229,207,0)');
        context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
      }
    } else {
      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, '#f6ffe5'); gradient.addColorStop(.08, '#d0ffb0');
      gradient.addColorStop(.25, 'rgba(135,255,102,.5)'); gradient.addColorStop(1, 'rgba(90,255,70,0)');
      context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
    }
  }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; return texture;
}

export { createCollegeIsland as createFloatingIsland } from './islandGeometry';

function getLogoBounds(logo: HTMLImageElement) {
  const full = { x: 0, y: 0, width: logo.naturalWidth, height: logo.naturalHeight };
  try {
    const scale = Math.min(1, 512 / Math.max(logo.naturalWidth, logo.naturalHeight));
    const sample = document.createElement('canvas');
    sample.width = Math.max(1, Math.round(logo.naturalWidth * scale)); sample.height = Math.max(1, Math.round(logo.naturalHeight * scale));
    const context = sample.getContext('2d'); if (!context?.getImageData) return full;
    context.drawImage(logo, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let left = sample.width; let top = sample.height; let right = -1; let bottom = -1;
    for (let y = 0; y < sample.height; y++) for (let x = 0; x < sample.width; x++) {
      const alpha = pixels[(y * sample.width + x) * 4 + 3];
      if (alpha < 16) continue;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    return right < left ? full : { x: left / scale, y: top / scale, width: (right - left + 1) / scale, height: (bottom - top + 1) / scale };
  } catch { return full; }
}

function createFlagTexture(logoUrl?: string) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 1024;
  const context = canvas.getContext('2d'); context?.scale(2, 2);
  const logoCanvas = document.createElement('canvas'); logoCanvas.width = 512; logoCanvas.height = 1024;
  const logoContext = logoCanvas.getContext('2d'); logoContext?.scale(2, 2);
  let cloth: HTMLImageElement | undefined; let logo: HTMLImageElement | undefined; let active = true;
  let logoBounds: ReturnType<typeof getLogoBounds> | undefined;
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  const logoTexture = new CanvasTexture(logoCanvas); logoTexture.colorSpace = SRGBColorSpace;
  const paint = () => {
    if (!context || !active || !cloth?.naturalWidth) return;
    context.globalAlpha = 1; context.globalCompositeOperation = 'source-over'; context.clearRect(0, 0, 256, 512);
    context.drawImage(cloth, -27, -6, 310, 524);
    if (logo?.naturalWidth && logoContext) {
      const bounds = logoBounds ??= getLogoBounds(logo);
      const scale = Math.min(208 / bounds.width, 232 / bounds.height);
      const w = bounds.width * scale; const h = bounds.height * scale;
      logoContext.clearRect(0, 0, 256, 512); logoContext.globalCompositeOperation = 'source-over';
      logoContext.drawImage(logo, bounds.x, bounds.y, bounds.width, bounds.height, (256 - w) / 2, 110 + (232 - h) / 2, w, h);
      context.globalCompositeOperation = 'source-atop';
      context.drawImage(logoCanvas, 0, 0, 256, 512);
      logoTexture.needsUpdate = true;
    }
    context.globalAlpha = 1; context.globalCompositeOperation = 'source-over'; texture.needsUpdate = true;
  };
  const clothReady = new Promise<void>((resolve, reject) => {
    cloth = new Image(); cloth.onload = () => { paint(); resolve(); }; cloth.onerror = reject; cloth.src = '/images/festival-woven-banner.webp';
  });
  const logoReady = !logoUrl ? Promise.resolve() : new Promise<void>(resolve => {
    logo = new Image(); logo.crossOrigin = 'anonymous'; logo.onload = () => { paint(); resolve(); };
    logo.onerror = () => { resolve(); /* Keep the textile if a remote logo cannot load. */ }; logo.src = logoUrl;
  });
  const ready = Promise.all([clothReady, logoReady]).then(() => {});
  return { texture, logoTexture, ready, dispose() { active = false; if (cloth) { cloth.onload = null; cloth.onerror = null; } if (logo) { logo.onload = null; logo.onerror = null; } texture.dispose(); logoTexture.dispose(); } };
}

export function createBattleFlag(logoUrl?: string, wallMounted = false) {
  const root = new Group(); root.name = 'waving-battle-flag';
  const banner = typeof document !== 'undefined' ? createFlagTexture(logoUrl) : null;
  const geometry = new PlaneGeometry(1, 2.2, 12, 24); geometry.translate(0, -1.1, 0);
  const original = Float32Array.from(geometry.attributes.position.array);
  const motion = createFlagClothMotion(original);
  const material = new MeshStandardMaterial({ color: '#ffffff', map: banner?.texture || null, emissive: '#ffffff', emissiveMap: banner?.logoTexture || null, emissiveIntensity: .45, roughness: .98, metalness: 0, side: DoubleSide, transparent: true, alphaTest: .12 });
  const cloth = new Mesh(geometry, material); cloth.name = 'wind-deformed-cloth'; root.add(cloth);
  const poleMaterial = new MeshStandardMaterial({ color: '#9e8458', metalness: .7, roughness: .6 });
  const pole = new Mesh(new CylinderGeometry(.012, .012, 1.2, 8), poleMaterial); pole.rotation.z = Math.PI / 2; pole.position.y = .012; root.add(pole);
  const hookGeometry = new TorusGeometry(.026, .005, 5, 12);
  for (let i = 0; i < 5; i++) { const hook = new Mesh(hookGeometry, poleMaterial); hook.rotation.y = Math.PI / 2; hook.position.set(-.43 + i * .215, 0, 0); root.add(hook); }
  const mount = new Group(); mount.name = 'flag-wall-bracket'; mount.visible = false;
  const bracketGeometry = new BoxGeometry(1, 1, 1);
  const plate = new Mesh(bracketGeometry, poleMaterial); plate.name = 'flag-wall-plate';
  const arm = new Mesh(bracketGeometry, poleMaterial); arm.name = 'flag-support-arm';
  const brace = new Mesh(bracketGeometry, poleMaterial); brace.name = 'flag-diagonal-brace';
  const supportMaterial = new MeshStandardMaterial({ color: '#59604c', roughness: 1, metalness: .05 });
  const post = new Mesh(bracketGeometry, supportMaterial); post.name = 'flag-grounded-post';
  const foot = new Mesh(bracketGeometry, supportMaterial); foot.name = 'flag-stone-footing';
  const cap = new Mesh(bracketGeometry, poleMaterial); cap.name = 'flag-post-cap';
  mount.add(post, foot, cap, plate, arm, brace); if (wallMounted) root.add(mount);
  let disposed = false;
  return {
    root, ready: banner?.ready || Promise.resolve(),
    setWallMount(reach: number | null, groundDrop = 3.4) {
      mount.visible = wallMounted && reach !== null;
      if (reach === null) return;
      const wallX = -reach;
      // A continuous structural post reaches the foreground rubble. The
      // crossbar has a visible load path all the way down to a stone footing.
      const bottom = -Math.max(2.5, groundDrop);
      const top = .43;
      post.position.set(wallX, (top + bottom) / 2, -.035); post.scale.set(.15, top - bottom, .16);
      foot.position.set(wallX, bottom + .075, .01); foot.scale.set(.34, .15, .28);
      cap.position.set(wallX, top, .01); cap.scale.set(.21, .08, .21);
      plate.position.set(wallX, .15, .04); plate.scale.set(.08, .43, .10);
      const length = .62 - wallX;
      arm.position.set((wallX + .62) / 2, .015, .025); arm.scale.set(length, .035, .04);
      const dx = .43 - wallX; const dy = -.29;
      brace.position.set((wallX + .43) / 2, .16, .025);
      brace.scale.set(Math.hypot(dx, dy), .024, .03); brace.rotation.z = Math.atan2(dy, dx);
    },
    update(time: number, gust = 0, phase = 0, delta = 0, interaction?: FlagInteraction) {
      motion.step(delta, interaction);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = original[i * 3]; const y = original[i * 3 + 1]; const free = -y / 2.2;
        if (Math.abs(y) < .000001) { positions.setXYZ(i, x, y, original[i * 3 + 2]); continue; }
        const wind = Math.sin(time * 1.10 + y * 2.4 + phase);
        const bendX = motion.offset[i * 2], bendZ = motion.offset[i * 2 + 1];
        const lift = Math.min(.18, (Math.abs(bendX) + Math.abs(bendZ)) * .16) * free;
        positions.setXYZ(i, x + wind * .075 * free * (1 + gust * .3) + bendX, y + Math.sin(time * 1.3 + x * 5 + phase) * .018 * free + lift, Math.sin(x * 5 + y * 2.4 - time * 1.3 + phase) * .09 * free + bendZ);
      }
      // The pole and its wall bracket stay fixed; wind deforms only the cloth.
      positions.needsUpdate = true; geometry.computeVertexNormals();
    },
    dispose() { if (disposed) return; disposed = true; geometry.dispose(); bracketGeometry.dispose(); supportMaterial.dispose(); material.dispose(); banner?.dispose(); pole.geometry.dispose(); hookGeometry.dispose(); poleMaterial.dispose(); },
  };
}
