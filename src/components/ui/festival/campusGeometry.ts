import {
  BoxGeometry, BufferGeometry, CanvasTexture, CylinderGeometry, Float32BufferAttribute,
  DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D,
  PlaneGeometry, RepeatWrapping, RingGeometry, Shape, ShapeGeometry, SphereGeometry, SRGBColorSpace,
  type Material, type Texture,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** A compact campus model based on the supplied IQ City building photograph.
 * All static details are baked into one mesh per material, including the windows.
 */
export function createCollegeCampus() {
  const root = new Group(); root.name = 'iq-city-college-campus';
  const textures: Texture[] = [];
  const cream = new MeshStandardMaterial({ color: '#7d806b', roughness: 1 });
  const pink = new MeshStandardMaterial({ color: '#6d705e', roughness: 1 });
  const white = new MeshStandardMaterial({ color: '#858977', roughness: 1 });
  const glass = new MeshStandardMaterial({ color: '#56604e', roughness: .78, metalness: .08 });
  const frames = new MeshStandardMaterial({ color: '#686f5e', roughness: .98 });
  const recess = new MeshStandardMaterial({ color: '#19271f', roughness: 1 });
  recess.name = 'Campus recessed window reveals';
  const sandstone = new MeshStandardMaterial({ color: '#73745e', roughness: 1 });
  const paving = new MeshStandardMaterial({ color: '#70705a', roughness: 1 });
  const lawn = new MeshStandardMaterial({ color: '#435333', roughness: 1 });
  const foliage = new MeshStandardMaterial({ color: '#3b573b', roughness: 1, side: DoubleSide });
  const bark = new MeshStandardMaterial({ color: '#6d6d50', roughness: 1 });
  const dark = new MeshStandardMaterial({ color: '#323d39', roughness: .7 });
  const yellow = new MeshStandardMaterial({ color: '#8f8960', roughness: 1 });
  const water = new MeshStandardMaterial({ color: '#477a67', roughness: .32, metalness: .2, emissive: '#274a2c', emissiveIntensity: .12 });
  const names = ['Campus weathered limestone', 'Campus dark stone bands', 'Campus aged stone wing', 'Campus weathered glazing', 'Campus oxidised window frames', 'Campus worn sandstone', 'Campus mossy stone drive', 'Campus lawns', 'Campus planting', 'Campus palm trunks', 'Campus fountain stone', 'Campus faded curb paint', 'Campus fountain water'];
  [cream, pink, white, glass, frames, sandstone, paving, lawn, foliage, bark, dark, yellow, water].forEach((material, i) => { material.name = names[i]; });
  if (typeof document !== 'undefined') {
    // Shared stone patina: broad damp stains, vertical runoff and fine cracks.
    // Generated locally so the weathering adds no requests or draw calls.
    const plasterCanvas = document.createElement('canvas'); plasterCanvas.width = plasterCanvas.height = 256;
    const plasterContext = plasterCanvas.getContext('2d');
    if (plasterContext) {
      const hash = (x: number, y: number) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
      const noise = (x: number, y: number) => {
        const ix = Math.floor(x); const iy = Math.floor(y); let fx = x - ix; let fy = y - iy;
        fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
        const a = hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx;
        const b = hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx;
        return a * (1 - fy) + b * fy;
      };
      const pixels = plasterContext.createImageData(256, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const damp = noise(x / 43, y / 61);
        const runoff = noise(x / 7, y / 116);
        const grain = hash(x, y);
        const shade = .59 + damp * .28 + runoff * .09 + grain * .04;
        const moss = Math.max(0, damp - .48) * .5;
        pixels.data.set([244 * shade * (1 - moss * .25), 247 * shade, 230 * shade * (1 - moss * .4), 255], (y * 256 + x) * 4);
      }
      plasterContext.putImageData(pixels, 0, 0);
      plasterContext.strokeStyle = 'rgba(24, 34, 23, .28)'; plasterContext.lineWidth = .7;
      for (let crack = 0; crack < 9; crack++) {
        let x = hash(crack, 2) * 256; let y = hash(crack, 7) * 220;
        plasterContext.beginPath(); plasterContext.moveTo(x, y);
        for (let step = 0; step < 5; step++) {
          x += (hash(crack, step + 12) - .5) * 14; y += 4 + hash(crack, step + 21) * 9;
          plasterContext.lineTo(x, y);
        }
        plasterContext.stroke();
      }
      const plaster = new CanvasTexture(plasterCanvas); plaster.colorSpace = SRGBColorSpace;
      plaster.wrapS = plaster.wrapT = RepeatWrapping; plaster.repeat.set(3, 2); textures.push(plaster);
      [cream, pink, white, sandstone, paving, frames].forEach(material => { material.map = plaster; material.bumpMap = plaster; material.bumpScale = .004; });
    }
    const glassCanvas = document.createElement('canvas'); glassCanvas.width = 64; glassCanvas.height = 128;
    const glassContext = glassCanvas.getContext('2d');
    if (glassContext) {
      const sky = glassContext.createLinearGradient(0, 0, 20, 128);
      sky.addColorStop(0, '#7c8671'); sky.addColorStop(.35, '#505d49'); sky.addColorStop(.42, '#303e30'); sky.addColorStop(1, '#17241b');
      glassContext.fillStyle = sky; glassContext.fillRect(0, 0, 64, 128);
      glassContext.fillStyle = 'rgba(174, 181, 148, .08)'; glassContext.fillRect(4, 0, 9, 128);
      const glazing = new CanvasTexture(glassCanvas); glazing.colorSpace = SRGBColorSpace; textures.push(glazing); glass.map = glazing;
    }
  }
  const parts = new Map<Material, BufferGeometry[]>();
  const cube = new BoxGeometry(1, 1, 1);
  const transform = new Object3D();
  const add = (geometry: BufferGeometry, material: Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, yaw = 0, parent?: Matrix4) => {
    transform.position.set(x, y, z); transform.rotation.set(0, yaw, 0); transform.scale.set(sx, sy, sz); transform.updateMatrix();
    const copy = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    copy.applyMatrix4(parent ? new Matrix4().multiplyMatrices(parent, transform.matrix) : transform.matrix);
    const entries = parts.get(material) ?? []; entries.push(copy); parts.set(material, entries);
  };
  const box = (material: Material, x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0, parent?: Matrix4) => add(cube, material, x, y, z, w, h, d, yaw, parent);
  const landmark = (name: string, x: number, y: number, z: number) => {
    const marker = new Group(); marker.name = name; marker.position.set(x, y, z); root.add(marker); return marker;
  };

  const floorPitch = .171;
  const frontWindows = (cx: number, faceZ: number, width: number, columns: number, pinkBands = false, outward = 1) => {
    for (let floor = 0; floor < 6; floor++) {
      const y = .105 + floor * floorPitch;
      if (pinkBands) box(cream, cx, y, faceZ + .002 * outward, width - .024, .105, .013);
      for (let col = 0; col < columns; col++) {
        const x = cx - width / 2 + width / columns * (col + .5);
        const w = width / columns * .75;
        box(recess, x, y, faceZ + .009 * outward, w + .012, .086, .012);
        box(glass, x, y, faceZ + .016 * outward, w - .004, .066, .004);
        // Raised jambs and a projecting sill let actual light describe the reveal.
        for (const side of [-1, 1]) {
          box(frames, x + side * w / 2, y, faceZ + .021 * outward, .004, .078, .016);
          box(frames, x, y + side * .038, faceZ + .023 * outward, w + .008, .004, .020);
        }
        box(frames, x, y, faceZ + .024 * outward, .003, .071, .006);
      }
    }
  };
  const sideWindows = (faceX: number, cz: number, depth: number, outward: number) => {
    for (let floor = 0; floor < 6; floor++) for (let col = 0; col < 3; col++) {
      const y = .105 + floor * floorPitch;
      const z = cz - depth / 2 + depth / 3 * (col + .5);
      box(recess, faceX + outward * .006, y, z, .014, .086, depth / 3 * .75);
      box(glass, faceX + outward * .014, y, z, .004, .068, depth / 3 * .64);
      box(frames, faceX + outward * .022, y, z, .008, .071, .003);
      box(frames, faceX + outward * .021, y - .039, z, .020, .004, depth / 3 * .76);
    }
  };
  const roof = (cx: number, cz: number, width: number, depth: number, y: number, material: Material) => {
    box(sandstone, cx, y, cz, width, .018, depth);
    for (const side of [-1, 1]) {
      box(material, cx, y + .025, cz + side * (depth / 2 - .009), width, .05, .018);
      box(material, cx + side * (width / 2 - .009), y + .025, cz, .018, .05, depth);
    }
  };

  // Three connected six-storey masses retain the photograph's long, low outline.
  const left = landmark('college-left-pink-wing', -1.105, .55, -.48);
  left.userData.floors = 6;
  box(pink, -1.105, .55, -.48, 1.23, 1.10, .48);
  roof(-1.105, -.48, 1.24, .49, 1.108, cream);
  frontWindows(-1.105, -.235, 1.23, 9, true);
  sideWindows(-1.725, -.48, .46, -1);
  frontWindows(-1.105, -.728, 1.23, 8, true, -1); // The rear also reads as a real building while rotating.

  landmark('college-cream-entrance-block', -.075, .55, -.50).userData.floors = 6;
  box(cream, -.075, .55, -.50, .89, 1.10, .59);
  roof(-.075, -.50, .92, .62, 1.108, cream);
  // Paired square windows flank the slightly projecting central glass bay.
  frontWindows(-.39, -.198, .20, 2);
  frontWindows(.25, -.198, .18, 2);
  frontWindows(-.075, -.802, .86, 6, false, -1);
  box(sandstone, -.08, .78, -.183, .35, .19, .035);
  box(glass, -.08, .78, -.159, .32, .16, .014);
  for (let i = -2; i <= 2; i++) box(frames, -.08 + i * .058, .78, -.149, .006, .16, .006);
  box(cream, -.08, .78, -.145, .33, .007, .006);

  landmark('college-recessed-connector', .53, .52, -.60);
  box(pink, .53, .52, -.60, .39, 1.04, .40);
  frontWindows(.53, -.393, .38, 3, true);
  roof(.53, -.60, .41, .42, 1.048, cream);

  landmark('college-white-right-wing', 1.145, .55, -.42).userData.floors = 6;
  box(white, 1.145, .55, -.42, .85, 1.10, .58);
  roof(1.145, -.42, .88, .61, 1.108, white);
  frontWindows(1.145, -.122, .83, 5);
  frontWindows(1.145, -.718, .83, 5, false, -1);
  sideWindows(1.575, -.42, .55, 1);
  // Flat roof service rooms, as on the stepped roofline in the reference.
  box(cream, -.30, 1.175, -.61, .24, .10, .20);
  box(white, 1.18, 1.178, -.52, .26, .105, .22);
  box(white, 1.37, 1.155, -.51, .14, .06, .20);

  landmark('college-main-entrance-canopy', -.08, .23, .025);
  box(sandstone, -.08, .31, -.164, .57, .28, .055);
  box(glass, -.08, .15, -.127, .52, .28, .014);
  for (let i = -3; i <= 3; i++) box(frames, -.08 + i * .071, .15, -.115, .006, .28, .006);
  box(sandstone, -.08, .29, .018, .66, .035, .37);
  box(cream, -.38, .145, .165, .016, .28, .016);
  box(cream, .22, .145, .165, .016, .28, .016);
  box(sandstone, -.08, .012, .085, .65, .025, .38);
  // Smaller secondary entrance on the white block.
  box(glass, 1.13, .12, -.108, .35, .23, .018);
  box(sandstone, 1.13, .252, -.005, .41, .022, .23);
  box(cream, .95, .12, .09, .012, .24, .012);
  box(cream, 1.31, .12, .09, .012, .24, .012);

  // The circular forecourt is deliberately prominent enough to read at mobile size.
  const court = new Matrix4().makeScale(1, 1, .72); court.setPosition(.02, 0, .47);
  landmark('college-circular-landscaped-courtyard', .02, .01, .47);
  const drive = new RingGeometry(.76, 1.03, 64); drive.rotateX(-Math.PI / 2);
  add(drive, paving, 0, .005, 0, 1, 1, 1, 0, court); drive.dispose();
  const walk = new RingGeometry(.68, .76, 64); walk.rotateX(-Math.PI / 2);
  add(walk, sandstone, 0, .009, 0, 1, 1, 1, 0, court); walk.dispose();
  const grass = new CylinderGeometry(.68, .68, .016, 64);
  add(grass, lawn, 0, .007, 0, 1, 1, 1, 0, court); grass.dispose();
  const rim = new CylinderGeometry(.235, .235, .025, 40);
  add(rim, sandstone, 0, .025, 0, 1, 1, 1, 0, court); rim.dispose();
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    box(cream, Math.sin(angle) * .45, .019, Math.cos(angle) * .45, .065, .012, .46, angle, court);
  }
  for (let i = 0; i < 72; i++) {
    const angle = i / 72 * Math.PI * 2;
    box(i % 2 ? yellow : dark, Math.sin(angle) * 1.025, .012, Math.cos(angle) * 1.025, .078, .024, .017, angle + Math.PI / 2, court);
  }
  landmark('college-central-fountain-monument', .02, .12, .47);
  const basin = new CylinderGeometry(.15, .17, .038, 32);
  add(basin, dark, 0, .055, 0, 1, 1, 1, 0, court); basin.dispose();
  const pool = new CylinderGeometry(.137, .137, .006, 32);
  add(pool, water, 0, .078, 0, 1, 1, 1, 0, court); pool.dispose();
  box(dark, -.045, .15, 0, .055, .15, .055, 0, court);
  box(dark, .035, .18, -.025, .052, .21, .052, 0, court);
  box(dark, .022, .125, .065, .065, .11, .045, 0, court);

  // Curved, double-sided palm fronds keep their silhouette from either side.
  const leafVertices: number[] = []; const leafUVs: number[] = []; const leafIndices: number[] = [];
  const leafSegments = 10;
  for (let i = 0; i <= leafSegments; i++) {
    const t = i / leafSegments; const spread = Math.sin(t * Math.PI) * .019 + .001;
    const y = Math.sin(t * Math.PI) * .05 - t * t * .075;
    leafVertices.push(t * .23, y, -spread, t * .23, y, spread); leafUVs.push(t, 0, t, 1);
    if (i < leafSegments) { const k = i * 2; leafIndices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const leaf = new BufferGeometry(); leaf.setAttribute('position', new Float32BufferAttribute(leafVertices, 3)); leaf.setAttribute('uv', new Float32BufferAttribute(leafUVs, 2)); leaf.setIndex(leafIndices); leaf.computeVertexNormals();
  const trunk = new CylinderGeometry(.008, .015, 1, 10);
  const shrub = new SphereGeometry(1, 12, 8);
  const palmSpots = [[-.64, .045], [-.92, -.005], [-1.40, -.02], [.43, .015], [.67, .015], [1.50, .12], [-1.30, .58], [1.30, .63]];
  for (const [index, [x, z]] of palmSpots.entries()) {
    const h = .31 + index % 3 * .035;
    add(trunk, bark, x, h / 2, z, 1, h, 1);
    for (let j = 0; j < 7; j++) add(leaf, foliage, x, h, z, 1, 1, 1, j / 7 * Math.PI * 2 + index);
    add(shrub, foliage, x, .027, z, .048, .035, .042);
  }
  for (let i = 0; i < 26; i++) {
    const x = -1.63 + i * .126;
    if (Math.abs(x + .08) < .39) continue;
    add(shrub, foliage, x, .028, -.06, .068, .035, .043);
  }
  trunk.dispose(); leaf.dispose(); shrub.dispose();

  // The navy IQ City sign and green crest distinguish the two main blocks.
  const signMaterial = new MeshBasicMaterial({ color: '#173d50' }); signMaterial.name = 'Campus IQ City sign backing';
  box(signMaterial, -.08, 1.015, -.195, .13, .18, .014);
  landmark('college-iq-city-sign', -.08, 1.015, -.18);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#173d50'; context.fillRect(0, 0, 192, 256);
      context.fillStyle = '#fbf7de'; context.textAlign = 'center';
      context.font = 'bold 96px Georgia'; context.fillText('IQ', 96, 115);
      context.font = '38px sans-serif'; context.fillText('city', 96, 160);
      context.fillStyle = '#cfe18a'; context.font = 'bold 16px sans-serif'; context.fillText('MEDICAL', 96, 205); context.fillText('COLLEGE', 96, 227);
      const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; textures.push(texture);
      const lettering = new MeshBasicMaterial({ map: texture, toneMapped: false }); lettering.name = 'Campus IQ City lettering';
      const panel = new PlaneGeometry(.125, .175); add(panel, lettering, -.08, 1.015, -.184); panel.dispose();
    }
  }
  const shield = new Shape(); shield.moveTo(-.052, .072); shield.lineTo(0, .086); shield.lineTo(.052, .072); shield.lineTo(.047, -.025); shield.quadraticCurveTo(.03, -.058, 0, -.078); shield.quadraticCurveTo(-.03, -.058, -.047, -.025); shield.closePath();
  const crest = new ShapeGeometry(shield);
  add(crest, yellow, 1.145, 1.01, -.117, 1, 1, 1);
  add(crest, foliage, 1.145, 1.01, -.114, .81, .81, 1); crest.dispose();
  box(cream, 1.145, 1.01, -.11, .047, .007, .003);
  box(cream, 1.145, 1.01, -.108, .007, .053, .003);

  for (const [material, geometries] of parts) {
    const geometry = mergeGeometries(geometries);
    geometries.forEach(part => part.dispose());
    if (geometry) {
      const mesh = new Mesh(geometry, material); mesh.name = material.name; mesh.matrixAutoUpdate = false;
      mesh.castShadow = material !== glass && material !== water; mesh.receiveShadow = true; root.add(mesh);
    }
  }
  cube.dispose();
  root.userData.reference = 'IQ City Medical College campus photograph';
  root.userData.floors = 6;
  return { root, textures };
}
