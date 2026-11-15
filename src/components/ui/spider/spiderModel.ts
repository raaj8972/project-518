import {
  AdditiveBlending, BufferGeometry, ConeGeometry, CylinderGeometry, DoubleSide, DynamicDrawUsage, Group,
  InstancedMesh, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PointLight,
  Sphere, SphereGeometry, TorusGeometry, Vector3, type Material,
} from 'three';

/** A small, fully articulated model. Shared geometries keep it inexpensive on phones. */
export function createSpiderModel() {
  const root = new Group(); root.name = 'ricorrenza-mechanical-spider';
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const trackGeometry = <T extends BufferGeometry>(geometry: T) => { geometries.add(geometry); return geometry; };
  const trackMaterial = <T extends Material>(material: T) => { materials.add(material); return material; };
  const shell = trackGeometry(new SphereGeometry(1, 28, 16));
  const joint = trackGeometry(new SphereGeometry(1, 12, 8));
  const limb = trackGeometry(new CylinderGeometry(.055, .09, 1, 8));
  const collar = trackGeometry(new CylinderGeometry(.12, .12, .09, 10));
  const ring = trackGeometry(new TorusGeometry(1, .075, 6, 28));
  const beamGeometry = trackGeometry(new ConeGeometry(.68, 2.5, 24, 1, true));
  const armor = trackMaterial(new MeshPhysicalMaterial({ color: '#10271f', roughness: .28, metalness: .84, clearcoat: 1, clearcoatRoughness: .18 }));
  const graphite = trackMaterial(new MeshStandardMaterial({ color: '#14201c', roughness: .37, metalness: .86 }));
  const gold = trackMaterial(new MeshStandardMaterial({ color: '#c9a65b', roughness: .24, metalness: .88 }));
  const darkGold = trackMaterial(new MeshStandardMaterial({ color: '#715522', roughness: .33, metalness: .83 }));
  const green = trackMaterial(new MeshStandardMaterial({ color: '#a4ff6b', emissive: '#51ff36', emissiveIntensity: 3.6, roughness: .2, metalness: .25, toneMapped: false }));
  const lens = trackMaterial(new MeshPhysicalMaterial({ color: '#aaff7c', emissive: '#61ff43', emissiveIntensity: 2.8, roughness: .08, metalness: .12, clearcoat: 1, toneMapped: false }));
  const halo = trackMaterial(new MeshBasicMaterial({ color: '#6bff49', transparent: true, opacity: .12, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
  const beamMaterial = trackMaterial(new MeshBasicMaterial({ color: '#61ff35', transparent: true, opacity: .055, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }));
  function mesh(name: string, geometry: BufferGeometry, material: Material, position: [number, number, number], scale: [number, number, number] = [1, 1, 1]) {
    const part = new Mesh(geometry, material); part.name = name; part.position.set(...position); part.scale.set(...scale); root.add(part); return part;
  }
  mesh('armored-abdomen', shell, armor, [0, 1.13, .68], [.83, .59, 1.04]);
  mesh('thorax', shell, graphite, [0, 1.12, -.32], [.64, .44, .65]);
  mesh('reactor-head', shell, armor, [0, 1.02, -.91], [.45, .36, .42]);
  // Separate gold plates and dark gaps read as forged metal rather than organic skin.
  for (const side of [-1, 1]) {
    const plate = mesh(`gold-shell-plate-${side}`, shell, gold, [side * .37, 1.56, .62], [.29, .085, .73]);
    plate.rotation.z = side * -.29;
    mesh(`shoulder-armor-${side}`, shell, darkGold, [side * .48, 1.35, -.31], [.21, .15, .43]);
    mesh(`optic-housing-${side}`, shell, graphite, [side * .34, 1.15, -.99], [.16, .14, .19]);
    mesh(`green-optic-${side}`, shell, green, [side * .35, 1.18, -1.135], [.077, .035, .037]);
    mesh(`side-power-cell-${side}`, shell, green, [side * .75, 1.12, .55], [.04, .095, .18]);
    const mandible = mesh(`gold-mandible-${side}`, limb, gold, [side * .29, .83, -1.27], [.8, .38, .8]);
    mandible.rotation.x = -.75; mandible.rotation.z = side * .33;
  }
  const dorsalBand = mesh('gold-dorsal-band', ring, gold, [0, 1.16, .65], [.82, 1.02, .66]);
  dorsalBand.rotation.x = Math.PI / 2;
  mesh('central-dorsal-seam', shell, graphite, [0, 1.704, .6], [.034, .025, .79]);
  const reactorOuter = mesh('reactor-gold-rim', ring, gold, [0, 1.03, -1.268], [.31, .31, .31]);
  const reactorInner = mesh('reactor-emissive-ring', ring, green, [0, 1.03, -1.30], [.236, .236, .236]);
  const reactor = mesh('reactor-glass-lens', shell, lens, [0, 1.03, -1.324], [.17, .17, .045]);
  const reactorGlow = mesh('reactor-soft-halo', shell, halo, [0, 1.03, -1.37], [.39, .39, .09]);
  // Layered translucent cones create light spilling from the reactor without bloom.
  const beam = mesh('green-reactor-light-beam', beamGeometry, beamMaterial, [0, .78, -2.54]);
  beam.rotation.x = Math.PI / 2 + .17;
  const beamCore = mesh('green-reactor-light-beam-inner', beamGeometry, beamMaterial, [0, .78, -2.54], [.38, 1, .38]);
  beamCore.rotation.copy(beam.rotation);
  // Light spill is decorative; tapping it must leave the page underneath usable.
  [reactorGlow, beam, beamCore].forEach(part => { part.raycast = () => {}; });
  const reactorLight = new PointLight('#73ff44', 2.4, 4, 2); reactorLight.position.set(0, 1.06, -1.6); root.add(reactorLight);
  const legs: Array<{ side: number; index: number; segments: Mesh[]; joints: Mesh[]; collars: Mesh[]; indicators: Mesh[]; points: Vector3[] }> = [];
  for (const side of [-1, 1]) for (let index = 0; index < 4; index++) {
    const segments = Array.from({ length: 3 }, (_, segment) => mesh(`leg-${side}-${index}-segment-${segment}`, limb, segment === 2 ? darkGold : gold, [0, 0, 0]));
    const bulbs = Array.from({ length: 3 }, (_, number) => mesh(`leg-${side}-${index}-joint-${number}`, joint, graphite, [0, 0, 0], [number === 0 ? .15 : .115, number === 0 ? .15 : .115, number === 0 ? .15 : .115]));
    const collars = Array.from({ length: 3 }, (_, number) => mesh(`leg-${side}-${index}-cuff-${number}`, collar, gold, [0, 0, 0]));
    const indicators = Array.from({ length: 2 }, (_, number) => mesh(`leg-${side}-${index}-power-${number}`, joint, green, [0, 0, 0], [.045, .045, .045]));
    legs.push({ side, index, segments, joints: bulbs, collars, indicators, points: Array.from({ length: 4 }, () => new Vector3()) });
  }
  // Keep named pose parts for articulation and hit identities, but draw the 88
  // repeated leg pieces in five shared-geometry/material batches.
  const batches: Array<{ mesh: InstancedMesh; parts: Mesh[] }> = [];
  const batchParts = (name: string, geometry: BufferGeometry, material: Material, parts: Mesh[]) => {
    const instances = new InstancedMesh(geometry, material, parts.length);
    instances.name = name; instances.matrixAutoUpdate = false;
    instances.instanceMatrix.setUsage(DynamicDrawUsage);
    // Every gait stays within this root-local envelope. Stable bounds avoid
    // rebuilding 88 instance bounds each frame and keep tapping moving feet valid.
    instances.boundingSphere = new Sphere(new Vector3(0, 1, 0), 5);
    parts.forEach(part => { part.visible = false; part.matrixAutoUpdate = false; part.raycast = () => {}; });
    const raycast = instances.raycast.bind(instances);
    instances.raycast = (raycaster, intersections) => {
      const first = intersections.length;
      raycast(raycaster, intersections);
      for (let i = first; i < intersections.length; i++) {
        const id = intersections[i].instanceId;
        if (id !== undefined) intersections[i].object = parts[id];
      }
    };
    root.add(instances); batches.push({ mesh: instances, parts });
  };
  batchParts('gold-leg-segment-instances', limb, gold, legs.flatMap(leg => leg.segments.slice(0, 2)));
  batchParts('dark-gold-foot-instances', limb, darkGold, legs.map(leg => leg.segments[2]));
  batchParts('graphite-leg-joint-instances', joint, graphite, legs.flatMap(leg => leg.joints));
  batchParts('gold-leg-cuff-instances', collar, gold, legs.flatMap(leg => leg.collars));
  batchParts('green-leg-indicator-instances', joint, green, legs.flatMap(leg => leg.indicators));
  const up = new Vector3(0, 1, 0); const direction = new Vector3(); const midpoint = new Vector3();
  function update(time: number, hanging: number) {
    root.position.y = Math.sin(time * 2.5) * .045;
    root.rotation.x = hanging * .13;
    root.rotation.z = Math.sin(time * 1.4) * .026;
    const pulse = 1 + Math.sin(time * 2.2) * .13;
    green.emissiveIntensity = 3.6 * pulse; lens.emissiveIntensity = 2.8 * pulse;
    halo.opacity = .11 + Math.sin(time * 2.2) * .025;
    reactorLight.intensity = 2.4 * pulse;
    reactorOuter.rotation.z = time * .12; reactorInner.rotation.z = -time * .2;
    reactor.scale.x = reactor.scale.y = .17 * (1 + Math.sin(time * 2.2) * .025);
    reactorGlow.rotation.z = time * .08;
    for (const leg of legs) {
      const { side, index, points } = leg;
      const phase = time * 4.6 + index * 1.9 + (side === 1 ? Math.PI : 0);
      const stride = Math.cos(phase) * .35 * (1 - hanging * .8);
      const lift = Math.max(0, Math.sin(phase)) * (.38 - hanging * .26);
      const baseZ = [-.67, -.29, .16, .56][index];
      const reachZ = [-2.15, -.86, .88, 2.09][index] + stride;
      const reachX = [2.64, 3.08, 3.03, 2.57][index] * (1 - hanging * .06);
      points[0].set(side * .47, 1.15, baseZ);
      points[3].set(side * reachX, .06 + lift + hanging * .18, reachZ);
      points[1].lerpVectors(points[0], points[3], .33); points[1].y = 1.91 + lift * .17;
      points[2].lerpVectors(points[0], points[3], .73); points[2].y = 1.43 + lift * .3 + hanging * .24;
      for (let j = 0; j < 3; j++) {
        const a = points[j]; const b = points[j + 1]; const segment = leg.segments[j];
        direction.subVectors(b, a); midpoint.addVectors(a, b).multiplyScalar(.5);
        segment.position.copy(midpoint); segment.scale.set(j === 0 ? 1.05 : j === 1 ? .85 : .63, direction.length(), j === 0 ? 1.05 : j === 1 ? .85 : .63);
        segment.quaternion.setFromUnitVectors(up, direction.normalize());
        leg.joints[j].position.copy(a);
        leg.collars[j].position.copy(a).lerp(b, .13); leg.collars[j].quaternion.copy(segment.quaternion);
        if (j < 2) { leg.indicators[j].position.copy(points[j + 1]); leg.indicators[j].position.y += .09; }
      }
    }
    for (const batch of batches) {
      batch.parts.forEach((part, index) => {
        part.updateMatrix();
        // Pose meshes and their batch are siblings: parent rotation is applied
        // once by Three.js, after these root-local matrices are uploaded.
        batch.mesh.setMatrixAt(index, part.matrix);
      });
      batch.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  update(0, 1);
  return { root, legs, update, dispose: () => { batches.forEach(batch => batch.mesh.dispose()); geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); } };
}
