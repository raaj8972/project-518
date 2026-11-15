import {
  BufferGeometry, CanvasTexture, CatmullRomCurve3, CylinderGeometry,
  Float32BufferAttribute, Group, InstancedMesh, Material, Mesh,
  DoubleSide, MeshBasicMaterial, MeshStandardMaterial, Object3D, PointLight, RepeatWrapping,
  SphereGeometry, SRGBColorSpace, Texture, TextureLoader, TorusGeometry, TubeGeometry,
  Vector2, Vector3,
} from 'three';
import { createCollegeCampus } from './campusGeometry';
import { seededRandom } from './environmentMotion';

/** The reference college campus rests on a textured, rotating floating island. */
export function createCollegeIsland() {
  const random = seededRandom(51826);
  const root = new Group(); root.name = 'rotating-floating-island';
  const terrain = new Group(); terrain.name = 'island-terrain'; root.add(terrain);
  const rockMaterial = new MeshStandardMaterial({ color: '#b5bcae', roughness: .96, metalness: .02, normalScale: new Vector2(.8, .8) });
  const mossMaterial = new MeshStandardMaterial({ color: '#78885b', roughness: 1, normalScale: new Vector2(.8, .8) });
  const veinMaterial = new MeshBasicMaterial({ color: '#8cc967', transparent: true, opacity: .78, toneMapped: false });
  rockMaterial.name = 'Slate rock'; mossMaterial.name = 'Mossy stone'; veinMaterial.name = 'Mineral energy';
  const textures: Texture[] = [];
  let disposed = false;
  const stoneMaterials = [rockMaterial, mossMaterial];
  const ready = typeof document === 'undefined' ? Promise.resolve() : new Promise<void>((resolve, reject) => {
    const texture = new TextureLoader().load('/images/festival-natural-stone.webp', loaded => {
      if (disposed) { resolve(); return; }
      loaded.colorSpace = SRGBColorSpace; loaded.wrapS = loaded.wrapT = RepeatWrapping; loaded.anisotropy = 4;
      stoneMaterials.forEach(material => { material.map = loaded; material.needsUpdate = true; });
      // Derive fine material relief, keeping the stone's photographic grain in 3D lighting.
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(loaded.image, 0, 0, 512, 512);
        const pixels = context.getImageData(0, 0, 512, 512).data;
        const normalCanvas = document.createElement('canvas'); normalCanvas.width = normalCanvas.height = 512;
        const normalContext = normalCanvas.getContext('2d');
        if (normalContext) {
          const result = normalContext.createImageData(512, 512);
          const sample = (x: number, y: number) => { const i = (((y + 512) % 512) * 512 + (x + 512) % 512) * 4; return (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 765; };
          for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
            const nx = (sample(x - 1, y) - sample(x + 1, y)) * 2; const ny = (sample(x, y - 1) - sample(x, y + 1)) * 2; const length = Math.hypot(nx, ny, 1);
            const i = (y * 512 + x) * 4;
            result.data[i] = (nx / length * .5 + .5) * 255; result.data[i + 1] = (ny / length * .5 + .5) * 255; result.data[i + 2] = (.5 / length + .5) * 255; result.data[i + 3] = 255;
          }
          normalContext.putImageData(result, 0, 0); const normalMap = new CanvasTexture(normalCanvas); normalMap.wrapS = normalMap.wrapT = RepeatWrapping; textures.push(normalMap);
          stoneMaterials.forEach(material => { material.normalMap = normalMap; material.needsUpdate = true; });
        }
      }
      resolve();
    }, undefined, reject);
    textures.push(texture);
  });

  const radial = (t: number, angle: number) => (2.1 * Math.pow(Math.max(.005, t), .62)) * (1 + Math.sin(angle * 3 + .4) * .08 + Math.cos(angle * 7 - t * 3) * .055 + Math.sin(angle * 13 + t * 7) * .025);
  const point = (t: number, angle: number, outward = 1) => new Vector3(Math.cos(angle) * radial(t, angle) * outward, -1.15 + t * 1.3 + Math.sin(angle * 9 + t * 5) * .036 * Math.sin(t * Math.PI), Math.sin(angle) * radial(t, angle) * .64 * outward);
  const vertices: number[] = []; const uv: number[] = []; const indices: number[] = [];
  const sides = 96; const levels = 12;
  for (let row = 0; row <= levels; row++) for (let column = 0; column <= sides; column++) {
    const t = .012 + row / levels * .988; const angle = column / sides * Math.PI * 2;
    vertices.push(...point(t, angle).toArray()); uv.push(column / sides * 3, t * 1.5);
    if (row < levels && column < sides) { const a = row * (sides + 1) + column; const b = a + sides + 1; indices.push(a, b, a + 1, b, b + 1, a + 1); }
  }
  const cliffGeometry = new BufferGeometry(); cliffGeometry.setAttribute('position', new Float32BufferAttribute(vertices, 3)); cliffGeometry.setAttribute('uv', new Float32BufferAttribute(uv, 2)); cliffGeometry.setIndex(indices); cliffGeometry.computeVertexNormals();
  const cliff = new Mesh(cliffGeometry, rockMaterial); cliff.name = 'textured-geological-cliff'; terrain.add(cliff);
  const topVertices: number[] = []; const topUV: number[] = []; const topIndices: number[] = [];
  for (let row = 0; row <= 6; row++) for (let column = 0; column <= sides; column++) {
    const fraction = row / 6; const angle = column / sides * Math.PI * 2;
    // A real opening exposes the energy source below the stone surface.
    const radius = .24 + (radial(1, angle) - .24) * fraction; const x = Math.cos(angle) * radius; const z = Math.sin(angle) * radius * .64;
    topVertices.push(x, .15 + Math.sin(x * 4) * Math.cos(z * 5) * .028 * (1 - fraction), z); topUV.push(x * .65, z * .65);
    if (row < 6 && column < sides) { const a = row * (sides + 1) + column; const b = a + sides + 1; topIndices.push(a, a + 1, b, b, a + 1, b + 1); }
  }
  const topGeometry = new BufferGeometry(); topGeometry.setAttribute('position', new Float32BufferAttribute(topVertices, 3)); topGeometry.setAttribute('uv', new Float32BufferAttribute(topUV, 2)); topGeometry.setIndex(topIndices); topGeometry.computeVertexNormals();
  const ground = new Mesh(topGeometry, mossMaterial); ground.name = 'broken-stone-island-surface'; ground.receiveShadow = true; terrain.add(ground);
  const wellMaterial = new MeshStandardMaterial({ color: '#182b12', roughness: .95, side: DoubleSide, emissive: '#4c831e', emissiveIntensity: .18 });
  const well = new Mesh(new CylinderGeometry(.22, .16, .25, 40, 1, true), wellMaterial);
  well.name = 'island-energy-well'; well.position.y = .025; well.scale.z = .64; terrain.add(well);
  const rimGeometry = new TorusGeometry(.255, .025, 6, 48);
  const wellRim = new Mesh(rimGeometry, rockMaterial); wellRim.name = 'broken-stone-energy-rim';
  wellRim.rotation.x = Math.PI / 2; wellRim.position.y = .16; wellRim.scale.y = .64; terrain.add(wellRim);
  const coreMaterial = new MeshStandardMaterial({ color: '#244911', emissive: '#8cff42', emissiveIntensity: 2.4, roughness: .45 });
  const core = new Mesh(new SphereGeometry(.105, 16, 12), coreMaterial);
  core.name = 'island-internal-energy-core'; core.position.y = .015; terrain.add(core);
  const coreLight = new PointLight('#8cff46', 1.8, 2.2, 1.5);
  coreLight.name = 'island-internal-green-light'; coreLight.position.set(0, .08, 0); terrain.add(coreLight);

  const boulderGeometry = new SphereGeometry(1, 9, 7);
  const boulderPositions = boulderGeometry.attributes.position;
  for (let i = 0; i < boulderPositions.count; i++) {
    const x = boulderPositions.getX(i); const y = boulderPositions.getY(i); const z = boulderPositions.getZ(i);
    const rough = .84 + Math.sin(x * 8 + z * 5) * .12 + Math.cos(y * 11 - x * 3) * .08;
    boulderPositions.setXYZ(i, x * rough, y * rough, z * rough);
  }
  boulderGeometry.computeVertexNormals();
  const boulders = new InstancedMesh(boulderGeometry, rockMaterial, 74); boulders.name = 'stratified-rock-outcrops';
  const dummy = new Object3D();
  for (let i = 0; i < 74; i++) {
    const angle = i * 2.399963; const t = .25 + random() * .68;
    dummy.position.copy(point(t, angle, .96)); dummy.scale.set(.10 + random() * .23, .10 + random() * .22, .08 + random() * .13);
    dummy.rotation.set(random(), angle, random() * 2); dummy.updateMatrix(); boulders.setMatrixAt(i, dummy.matrix);
  }
  terrain.add(boulders);
  const campus = createCollegeCampus(); campus.root.position.y = .18;
  terrain.add(campus.root); textures.push(...campus.textures);

  // Sparse luminous mineral seams follow the geological surface, without a wire grid.
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2 + .4; const path: Vector3[] = [];
    for (let j = 0; j < 10; j++) { const t = .05 + j / 9 * .92; path.push(point(t, angle + Math.sin(j * 1.7 + i) * .032, 1.012)); }
    const seam = new Mesh(new TubeGeometry(new CatmullRomCurve3(path), 26, .004, 4, false), veinMaterial); seam.name = 'mineral-energy-seam'; terrain.add(seam);
  }
  root.userData.model = 'iq-city-college-floating-campus';
  return {
    root, ready,
    getRotation: () => terrain.rotation.y + .34,
    update(time: number, _gust = 0, rotationOffset = 0) {
      coreMaterial.emissiveIntensity = 2.4 + Math.sin(time * 1.5) * .35;
      coreLight.intensity = 1.8 + Math.sin(time * 1.5) * .2;
      // Keep the main facade in view at rest; dragging still permits a full turn.
      terrain.rotation.y = -.34 + Math.sin(time * .16) * .12 + rotationOffset; terrain.userData.rotation = terrain.rotation.y;
      root.position.y = 0; root.rotation.x = .40; root.rotation.z = 0;
    },
    dispose() {
      if (disposed) return; disposed = true;
      const geometries = new Set<BufferGeometry>(); const materials = new Set<Material>();
      root.traverse(object => { if (object instanceof Mesh) { geometries.add(object.geometry); const entries = Array.isArray(object.material) ? object.material : [object.material]; entries.forEach(entry => materials.add(entry)); if (object instanceof InstancedMesh) object.dispose(); } });
      geometries.forEach(resource => resource.dispose()); materials.forEach(resource => resource.dispose()); textures.forEach(texture => texture.dispose());
    },
  };
}
