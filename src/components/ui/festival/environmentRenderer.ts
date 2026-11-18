import {
  ACESFilmicToneMapping, AdditiveBlending, HemisphereLight, Box3, BufferAttribute, BufferGeometry,
  DirectionalLight, Float32BufferAttribute, Group, IcosahedronGeometry, InstancedMesh,
  LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, Object3D, OrthographicCamera,
  PlaneGeometry, Points, Scene, ShaderMaterial, Sprite, SpriteMaterial, SRGBColorSpace,
  WebGLRenderer, TextureLoader, Vector3, Vector4, PCFSoftShadowMap, type Material,
} from 'three';
import { createBattleFlag, createFloatingIsland, createGlowTexture } from './environmentModel';
import { burstParticles, createParticleField, seededRandom, stepParticles, type WorldPointer } from './environmentMotion';
import { getMobileFestivalLayout } from './environmentLayout';
import { getIslandViewLayout } from './islandView';
import { createFlagInteraction } from './flagMotion';

const vertexShader = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const riverVertexShader = 'varying vec2 vUv; void main(){vUv=vec2(uv.x,uv.y*.24);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const skyFragment = `
  uniform float uTime; uniform float uAspect; uniform float uStorm; varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
  float fbm(vec2 p){float n=0.;float a=.57;for(int i=0;i<3;i++){n+=a*noise(p);p=p*2.03+vec2(2.3,5.1);a*=.5;}return n;}
  void main(){
    vec2 p=vec2(vUv.x*uAspect,vUv.y)*3.8;
    float n=fbm(p+vec2(uTime*.026,uTime*.008)+noise(p*.6-uTime*.012));
    float cloud=smoothstep(.25,.84,n);
    float edge=.45+.55*smoothstep(.1,.5,abs(vUv.x-.5));
    float sky=smoothstep(.05,.5,vUv.y);
    vec3 color=mix(vec3(.045,.12,.075),vec3(.43,.56,.38),cloud);
    float flash=(exp(-pow((vUv.x-.12)*5.,2.))+exp(-pow((vUv.x-.91)*5.,2.)))*sky*uStorm;
    color=mix(color,vec3(.62,.75,.52),flash*.6);
    gl_FragColor=vec4(color,cloud*edge*(.17+.06*sky)+flash*.12);
  }`;
const groundFragment = `
  uniform sampler2D uMap;uniform vec4 uCover;uniform float uTime;uniform float uAspect;
  uniform vec4 uPointer;uniform vec4 uTouch;varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
  float current(vec2 p){return noise(p)*.66+noise(p*2.07+3.8)*.34;}
  void main(){
    vec2 imageUv=vUv*uCover.xy+uCover.zw;
    vec4 source=texture2D(uMap,imageUv);
    float fissure=smoothstep(.025,.18,source.g-max(source.r,source.b)*1.04);
    float ground=1.-smoothstep(.035,.24,vUv.y);
    float mask=fissure*ground;
    if(mask<.003){gl_FragColor=vec4(0.);return;}
    // Perspective-compressed currents travel toward the foreground along the
    // actual painted river channels; the rocks remain outside the water mask.
    vec2 p=vec2((vUv.x-.5)*uAspect,vUv.y);
    vec2 flow=vec2(p.x*25.,p.y*88.+uTime*1.15);
    float eddy=current(flow+vec2(noise(flow*.38-uTime*.13)*2.,0.));
    float cross=noise(flow*vec2(1.8,.45)+vec2(-uTime*.35,uTime*.27));
    float ripples=sin(flow.y*2.6+eddy*6.+sin(flow.x*.9-uTime*.7))* .5+.5;
    vec2 touchDelta=vec2((vUv.x-uTouch.x)*uAspect,vUv.y-uTouch.y);
    float radius=length(touchDelta);
    float age=max(0.,uTime-uTouch.z);
    float ring=sin(radius*160.-age*12.)*exp(-pow((radius-age*.12)*18.,2.))*exp(-age*1.1)*uTouch.w;
    vec2 pointerDelta=vec2((vUv.x-uPointer.x)*uAspect,vUv.y-uPointer.y);
    float nearPointer=exp(-dot(pointerDelta,pointerDelta)*420.)*uPointer.z;
    float wake=sin(length(pointerDelta)*135.-uTime*6.)*nearPointer*.24;
    vec2 bend=vec2((eddy-.5)*.004,(cross-.5)*.0025);
    bend+=touchDelta/max(radius,.001)*ring*.0018;
    bend+=pointerDelta*nearPointer*.025;
    vec3 refracted=texture2D(uMap,clamp(imageUv+bend*uCover.xy,vec2(.001),vec2(.999))).rgb;
    float filament=pow(max(0.,1.-abs(ripples-.58)*3.1),7.);
    float crest=pow(max(0.,eddy*.7+cross*.3),4.);
    vec3 water=mix(refracted*.68,vec3(.19,.53,.075),.32);
    water+=vec3(.30,.53,.13)*(eddy*.36+crest*.7);
    water+=vec3(.65,.88,.39)*(filament*.20+max(0.,ring+wake)*.22);
    gl_FragColor=vec4(water,mask*(.72+eddy*.18));
  }`;
const beamFragment = `
  uniform float uTime; uniform float uPower; varying vec2 vUv;
  void main(){
    float x=abs(vUv.x-.5)*2.;
    float core=exp(-x*38.);float haze=exp(-x*5.5)*.22;
    float fall=pow(max(0.,sin(vUv.y*52.+uTime*8.)),12.);
    float energy=(core+haze)*(1.+fall*.8)*uPower;
    vec3 color=mix(vec3(.30,1.,.12),vec3(.88,1.,.62),core);
    gl_FragColor=vec4(color,energy*smoothstep(0.,.08,vUv.y)*(1.-smoothstep(.88,1.,vUv.y)));
  }`;

export interface EnvironmentController {
  ready: Promise<void>;
  resize: (width: number, height: number) => void;
  setPaused: (paused: boolean) => void;
  setVisible: (visible: boolean) => void;
  react: (x: number, y: number, burst?: boolean) => void;
  release: () => void;
  rotateBy: (radians: number) => number;
  resetRotation: () => number;
  dispose: () => void;
}

/** A single bounded scene: no postprocessing, no per-frame React updates. */
export function createFestivalEnvironment(host: HTMLDivElement, onUnavailable: () => void, options: { logoUrl?: string; islandControl?: HTMLDivElement } = {}): EnvironmentController | null {
  let renderer: WebGLRenderer;
  try { renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { onUnavailable(); return null; }
  renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.dataset.festivalRenderer = 'webgl'; host.appendChild(renderer.domElement);
  const scene = new Scene();
  const camera = new OrthographicCamera(-8, 8, 5, -5, .1, 80);
  camera.position.set(0, 0, 24); camera.lookAt(0, 0, 0);
  scene.add(new HemisphereLight('#b9cfbb', '#25342c', 1.15));
  const key = new DirectionalLight('#f4e4c5', 2.1); key.position.set(-5, 8, 8);
  // Keep the shadow pass around the campus, rather than the full backdrop.
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3; key.shadow.camera.right = 3;
  key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
  key.shadow.camera.near = 1; key.shadow.camera.far = 24;
  key.shadow.normalBias = .012; key.shadow.bias = -.0002;
  key.target.position.set(0, -2.1, 0); scene.add(key, key.target);
  const rim = new DirectionalLight('#a7cbb6', .55); rim.position.set(3, 1, -4); scene.add(rim);
  const fill = new DirectionalLight('#c6d8cd', .25); fill.position.set(0, 2, 10); scene.add(fill);
  const skyMaterial = new ShaderMaterial({ vertexShader, fragmentShader: skyFragment, uniforms: { uTime: { value: 0 }, uAspect: { value: 1.7 }, uStorm: { value: 0 } }, transparent: true, depthWrite: false, depthTest: false });
  const sky = new Mesh(new PlaneGeometry(1, 1), skyMaterial); sky.position.z = -8; sky.renderOrder = -3; scene.add(sky);
  const island = createFloatingIsland(); const islandAnchor = new Group(); islandAnchor.add(island.root); scene.add(islandAnchor);
  // Reserve the actual model's full rotation envelope below the action buttons.
  const islandBounds = new Box3();
  const islandSweep: Box3[] = [];
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    island.update(0, 0, angle); island.root.position.y = 0; island.root.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(island.root, true);
    islandSweep.push(bounds); islandBounds.union(bounds);
  }
  islandBounds.expandByScalar(.08);
  island.update(0);
  const flags = Array.from({ length: 4 }, (_, i) => createBattleFlag(options.logoUrl, i === 2)); flags.forEach(flag => scene.add(flag.root));
  const flagInteractions = flags.map(() => createFlagInteraction());
  flags[2].root.name = 'foreground-battle-flag';
  const groundMaterial = new ShaderMaterial({ vertexShader: riverVertexShader, fragmentShader: groundFragment, uniforms: {
    uMap: { value: null }, uCover: { value: new Vector4(1, 1, 0, 0) }, uTime: { value: 0 }, uAspect: { value: 1.7 },
    uPointer: { value: new Vector4(.5, .5, 0, 1) }, uTouch: { value: new Vector4(.5, .1, -20, 0) },
  }, transparent: true, depthTest: false, depthWrite: false });
  const ground = new Mesh(new PlaneGeometry(1, 1), groundMaterial); ground.name = 'emerald-flowing-river'; ground.position.z = 2; ground.renderOrder = 2; scene.add(ground);
  let groundLoaded!: () => void;
  const groundReady = new Promise<void>(resolve => { groundLoaded = resolve; });
  const groundTexture = new TextureLoader().load('/images/ricorrenza-emerald-environment.webp', texture => {
    texture.colorSpace = SRGBColorSpace; groundMaterial.uniforms.uMap.value = texture; groundLoaded();
  }, undefined, () => { onUnavailable(); groundLoaded(); });
  const beamMaterial = new ShaderMaterial({ vertexShader, fragmentShader: beamFragment, uniforms: { uTime: { value: 0 }, uPower: { value: .62 } }, transparent: true, blending: AdditiveBlending, depthTest: true, depthWrite: false });
  const beam = new Mesh(new PlaneGeometry(1, 1), beamMaterial); beam.renderOrder = 1;
  beam.name = 'island-centre-green-light'; scene.add(beam);
  const beamOrigin = new Vector3();
  const glowTexture = createGlowTexture(); const mistTexture = createGlowTexture(true);
  const impact = new Sprite(new SpriteMaterial({ map: glowTexture, color: '#aaff69', opacity: .75, transparent: true, blending: AdditiveBlending, depthWrite: false, depthTest: false }));
  impact.position.set(0, -4.10, 2); impact.scale.set(2.6, .6, 1); impact.renderOrder = 3; scene.add(impact);
  const random = seededRandom(412);
  const mists = Array.from({ length: 12 }, (_, i) => {
    const material = new SpriteMaterial({ map: mistTexture, color: i < 6 ? '#b8d1b2' : '#6c8c70', transparent: true, opacity: .16, depthWrite: false, depthTest: false });
    const sprite = new Sprite(material); sprite.renderOrder = i < 6 ? 4 : -2; scene.add(sprite);
    return { sprite, phase: random(), speed: .04 + random() * .05, x: (random() - .5) * 2, size: .9 + random() * 1.3, ground: i < 6 };
  });
  const field = createParticleField(180);
  const particlePositions = new Float32Array(field.phases.length * 3);
  const particleGeometry = new BufferGeometry(); particleGeometry.setAttribute('position', new Float32BufferAttribute(particlePositions, 3));
  const particleMaterial = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSize: { value: 3 } },
    vertexShader: 'uniform float uTime;uniform float uSize;attribute float aPhase;varying float vGlow;void main(){vGlow=.45+.55*sin(uTime*1.2+aPhase);gl_PointSize=uSize*(.8+vGlow*.5);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying float vGlow;void main(){float d=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-d),1.8);gl_FragColor=vec4(mix(vec3(.44,1.,.30),vec3(1.,.89,.5),vGlow),a*(.5+vGlow*.4));}',
    transparent: true, blending: AdditiveBlending, depthWrite: false, depthTest: false,
  });
  particleGeometry.setAttribute('aPhase', new Float32BufferAttribute(field.phases, 1));
  const particles = new Points(particleGeometry, particleMaterial); particles.frustumCulled = false; particles.renderOrder = 5; scene.add(particles);
  const dropCount = 96; const dropPositions = new Float32Array(dropCount * 6); const dropColors = new Float32Array(dropCount * 6);
  const dropOffsets = new Float32Array(dropCount * 2); const dropVelocities = new Float32Array(dropCount * 2); const dropPhases = new Float32Array(dropCount);
  const dropGeometry = new BufferGeometry(); dropGeometry.setAttribute('position', new BufferAttribute(dropPositions, 3));
  dropGeometry.setAttribute('color', new BufferAttribute(dropColors, 3));
  const dropMaterial = new LineBasicMaterial({ color: '#91be79', vertexColors: true, transparent: true, opacity: .30, depthWrite: false, toneMapped: false });
  const drops = new LineSegments(dropGeometry, dropMaterial); drops.name = 'scattered-falling-energy'; drops.frustumCulled = false; drops.renderOrder = 3; scene.add(drops);
  const sparkPositions = new Float32Array(dropCount * 3); const sparkColors = new Float32Array(dropCount * 3);
  const sparkGeometry = new BufferGeometry(); sparkGeometry.setAttribute('position', new BufferAttribute(sparkPositions, 3)); sparkGeometry.setAttribute('color', new BufferAttribute(sparkColors, 3));
  sparkGeometry.setAttribute('aSize', new Float32BufferAttribute(Array.from({ length: dropCount }, (_, i) => .72 + i % 7 * .065), 1));
  // A restrained additive rim makes the small green liquid visible against the
  // stone without the large round halo of a glowing particle texture.
  const sparkMaterial = new ShaderMaterial({
    uniforms: { uSize: { value: 6.5 } }, vertexColors: true,
    vertexShader: `
      uniform float uSize;attribute float aSize;varying float vVisibility;
      void main(){vVisibility=color.r;gl_PointSize=uSize*aSize;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      varying float vVisibility;
      void main(){
        vec2 p=gl_PointCoord-.5;
        float radius=length(vec2(p.x/.235,p.y/.41));
        float body=1.-smoothstep(.72,1.,radius);
        if(body<.005)discard;
        float rim=smoothstep(.35,.9,radius);
        vec3 water=mix(vec3(.035,.13,.045),vec3(.30,.90,.12),rim);
        vec2 glint=(p-vec2(-.065,-.095))*vec2(24.,13.);
        float highlight=exp(-dot(glint,glint));
        water=mix(water,vec3(.85,.94,.73),highlight*.85);
        float opacity=body*(.50+rim*.35+highlight*.18)*vVisibility;
        gl_FragColor=vec4(water,opacity);
      }`,
    transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const sparks = new Points(sparkGeometry, sparkMaterial); sparks.name = 'falling-green-sparks'; sparks.frustumCulled = false; sparks.renderOrder = 3; scene.add(sparks);
  const debrisMaterial = new MeshBasicMaterial({ color: '#657b4d', transparent: true, opacity: .85 });
  const debris = new InstancedMesh(new IcosahedronGeometry(.018, 0), debrisMaterial, 18); debris.name = 'falling-island-debris'; debris.frustumCulled = false; scene.add(debris);
  const dummy = new Object3D();
  const pointer: WorldPointer = { x: .5, y: .5, active: false, strength: 1 };
  let width = 1; let height = 1; let aspect = 1.7; let halfWidth = 8.5; let islandScale = 1;
  let seconds = 0; let lastTime = 0; let lastPaint = 0; let frame = 0; let frameInterval = 1000 / 25;
  let rotationOffset = 0;
  let reservedSpace = 0, baseHeight = 1;
  let paused = true; let visible = true; let disposed = false; let contextLost = false; let pointerUntil = 0; let pointerHeld = false;
  const update = (delta: number) => {
    const t = seconds;
    if (pointer.active && !pointerHeld && performance.now() > pointerUntil) pointer.active = false;
    skyMaterial.uniforms.uTime.value = t;
    const gust = pointer.active ? .8 : .2 + Math.sin(t * .18) * .15;
    island.update(t, gust, rotationOffset);
    // Reuse the startup rotation samples: no geometry traversal, raycasting or
    // DOM measurement is needed to follow the island's outline each frame.
    const turn = ((island.getRotation() % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * islandSweep.length;
    const a = islandSweep[Math.floor(turn)], b = islandSweep[(Math.floor(turn) + 1) % islandSweep.length], blend = turn % 1;
    const minX = (a.min.x + (b.min.x - a.min.x) * blend) * islandScale;
    const maxX = (a.max.x + (b.max.x - a.max.x) * blend) * islandScale;
    const minY = islandAnchor.position.y + (a.min.y + (b.min.y - a.min.y) * blend) * islandScale;
    const maxY = islandAnchor.position.y + (a.max.y + (b.max.y - a.max.y) * blend) * islandScale;
    flags.forEach((flag, i) => {
      if (!flag.root.visible) return;
      const interaction = flagInteractions[i], sx = Math.max(.001, flag.root.scale.x), sy = Math.max(.001, flag.root.scale.y);
      interaction.island.x = ((minX + maxX) / 2 - flag.root.position.x) / sx;
      interaction.island.y = ((minY + maxY) / 2 - flag.root.position.y) / sy;
      interaction.island.radiusX = (maxX - minX) * .5 / sx;
      interaction.island.radiusY = (maxY - minY) * .5 / sy;
      interaction.island.side = flag.root.position.x < (minX + maxX) / 2 ? -1 : 1;
      interaction.pointer.x = ((pointer.x - .5) * halfWidth * 2 - flag.root.position.x) / sx;
      interaction.pointer.y = ((.5 - pointer.y) * 10 - flag.root.position.y) / sy;
      interaction.pointer.active = pointer.active;
      interaction.pointer.strength = pointer.strength;
      flag.update(t, gust, i * 1.7, delta, interaction);
    });
    groundMaterial.uniforms.uTime.value = t;
    const waterPointer = groundMaterial.uniforms.uPointer.value as Vector4;
    waterPointer.set(pointer.x, 1 - pointer.y, waterPointer.z + ((pointer.active ? 1 : 0) - waterPointer.z) * (1 - Math.exp(-delta * 10)), pointer.strength);
    const stormPhase = (t + 3) % 15;
    skyMaterial.uniforms.uStorm.value = stormPhase > 12 && stormPhase < 12.8 ? Math.sin((stormPhase - 12) / .8 * Math.PI) * .65 : 0;
    beamMaterial.uniforms.uTime.value = t;
    stepParticles(field, delta, t, pointer, aspect);
    for (let i = 0; i < field.phases.length; i++) {
      particlePositions[i * 3] = (field.positions[i * 2] - .5) * halfWidth * 2;
      particlePositions[i * 3 + 1] = (.5 - field.positions[i * 2 + 1]) * 10;
      particlePositions[i * 3 + 2] = 4;
    }
    particleGeometry.attributes.position.needsUpdate = true; particleMaterial.uniforms.uTime.value = t;
    const base = islandAnchor.position.y;
    const islandBob = island.root.position.y * islandScale;
    const bottom = base - 1.07 * islandScale + islandBob;
    const distance = Math.max(.15, bottom + 4.1);
    const pointerX = (pointer.x - .5) * halfWidth * 2; const pointerY = (.5 - pointer.y) * 10;
    const dropDamping = Math.exp(-delta * 4); const repelRadius = Math.max(.45, Math.min(1.3, 900 / height));
    for (let i = 0; i < dropCount; i++) {
      const phase = (t * (.2 + i % 5 * .035) + i * .61803) % 1;
      const tail = Math.max(0, phase - .028 - (i % 3) * .007);
      const angle = i * 2.399963;
      const spread = (.16 + phase * .95) * islandScale;
      const tailSpread = (.16 + tail * .95) * islandScale;
      const drift = Math.sin(t * .8 + i) * .04 * phase * islandScale;
      const offsetIndex = i * 2;
      if (phase < dropPhases[i]) { dropOffsets[offsetIndex] = 0; dropOffsets[offsetIndex + 1] = 0; dropVelocities[offsetIndex] = 0; dropVelocities[offsetIndex + 1] = 0; }
      dropPhases[i] = phase;
      const baseX = Math.sin(angle) * spread + drift; const baseY = bottom - phase * phase * distance;
      let vx = dropVelocities[offsetIndex] * dropDamping; let vy = dropVelocities[offsetIndex + 1] * dropDamping;
      if (pointer.active && delta > 0) {
        const dx = baseX + dropOffsets[offsetIndex] - pointerX; const dy = baseY + dropOffsets[offsetIndex + 1] - pointerY;
        const separation = Math.hypot(dx, dy);
        if (separation < repelRadius) {
          const direction = separation > .001 ? Math.atan2(dy, dx) : angle;
          const force = (1 - separation / repelRadius) * delta * 22 * pointer.strength;
          vx += Math.cos(direction) * force; vy += Math.sin(direction) * force;
        }
      }
      vx -= dropOffsets[offsetIndex] * delta * 3; vy -= dropOffsets[offsetIndex + 1] * delta * 3;
      dropVelocities[offsetIndex] = vx; dropVelocities[offsetIndex + 1] = vy;
      dropOffsets[offsetIndex] = Math.max(-1.6, Math.min(1.6, dropOffsets[offsetIndex] + vx * delta));
      dropOffsets[offsetIndex + 1] = Math.max(-.8, Math.min(.8, dropOffsets[offsetIndex + 1] + vy * delta));
      const x = baseX + dropOffsets[offsetIndex]; const y = baseY + dropOffsets[offsetIndex + 1];
      const z = Math.cos(angle) * spread * .65;
      const brightness = Math.min(1, phase / .06) * Math.pow(1 - phase, 1.15);
      const index = i * 6;
      dropPositions[index] = x; dropPositions[index + 1] = y; dropPositions[index + 2] = z;
      dropPositions[index + 3] = Math.sin(angle) * tailSpread + drift + dropOffsets[offsetIndex] - vx * .016;
      dropPositions[index + 4] = bottom - tail * tail * distance + dropOffsets[offsetIndex + 1] - vy * .016; dropPositions[index + 5] = Math.cos(angle) * tailSpread * .65;
      sparkPositions[i * 3] = x; sparkPositions[i * 3 + 1] = y; sparkPositions[i * 3 + 2] = z;
      for (let channel = 0; channel < 3; channel++) {
        dropColors[index + channel] = brightness; dropColors[index + 3 + channel] = brightness * .12;
        sparkColors[i * 3 + channel] = brightness;
      }
    }
    dropGeometry.attributes.position.needsUpdate = true; dropGeometry.attributes.color.needsUpdate = true;
    sparkGeometry.attributes.position.needsUpdate = true; sparkGeometry.attributes.color.needsUpdate = true;
    // Start inside the opening, in the island's actual depth plane. Stone walls
    // occlude the shaft; it never paints a stripe over the front of the cliff.
    islandAnchor.updateMatrixWorld(true);
    beamOrigin.set(0, 1.4, 0).applyMatrix4(island.root.matrixWorld);
    beam.position.copy(beamOrigin); beam.rotation.copy(island.root.rotation);
    beam.scale.set(.5 * islandScale, 2.6 * islandScale, 1);
    impact.material.opacity = .54 + Math.pow(Math.sin(t * 1.4), 8) * .35;
    impact.scale.set((2.2 + Math.sin(t * 1.4) * .3) * islandScale, .45 + Math.sin(t * .8) * .07, 1);
    mists.forEach((mist, i) => {
      const progress = (mist.phase + t * mist.speed) % 1;
      if (mist.ground) {
        mist.sprite.position.set(mist.x * (1.2 + progress * 2.5) * islandScale + Math.sin(t * .25 + i) * .18, -4.05 + progress * 1.25, 2.5);
        mist.sprite.scale.set((.6 + progress * 2.3) * mist.size * islandScale, (.4 + progress * 1.1) * mist.size, 1);
        mist.sprite.material.opacity = Math.sin(progress * Math.PI) * .19;
      } else {
        mist.sprite.position.set((progress * 2 - 1) * (halfWidth + 3), i % 2 ? 3.2 + Math.sin(i) * .9 : -3.7 + Math.cos(i) * .5, -4);
        mist.sprite.scale.set(5.5 + mist.size, 1.5 + mist.size * .6, 1);
        mist.sprite.material.opacity = Math.sin(progress * Math.PI) * .22;
      }
      mist.sprite.material.rotation = Math.sin(t * .08 + i) * .2;
    });
    for (let i = 0; i < 18; i++) {
      const progress = (t * .13 + i * .178) % 1;
      dummy.position.set(Math.sin(i * 2.4) * (.5 + progress * .4) * islandScale, bottom + .15 - progress * (distance + .3), Math.cos(i * 2.4) * .3);
      dummy.rotation.set(t + i, t * .6, i + t * .4); const scale = (.3 + i % 4 * .22) * islandScale; dummy.scale.setScalar(scale);
      dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix);
    }
    debris.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
    renderer.domElement.dataset.time = t.toFixed(2);
    renderer.domElement.dataset.islandRotation = island.getRotation().toFixed(3);
  };
  const shouldAnimate = () => !paused && visible && !document.hidden && !contextLost && !disposed;
  const tick = (now: number) => {
    frame = 0;
    if (!shouldAnimate()) return;
    frame = requestAnimationFrame(tick);
    const elapsed = now - lastPaint;
    if (elapsed < frameInterval) return;
    const delta = Math.min((now - lastTime) / 1000, .06); seconds += delta; lastTime = now;
    lastPaint = now - elapsed % frameInterval; update(delta);
  };
  const wake = () => {
    if (frame) cancelAnimationFrame(frame); frame = 0;
    if (document.hidden) { pointerHeld = false; pointer.active = false; }
    if (!shouldAnimate()) return;
    lastTime = performance.now(); lastPaint = 0; frame = requestAnimationFrame(tick);
  };
  const lost = (event: Event) => { event.preventDefault(); contextLost = true; wake(); onUnavailable(); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', wake);
  const resizeScene = (nextWidth: number, nextHeight: number) => {
    baseHeight = Math.max(1, nextHeight - reservedSpace);
    width = Math.max(1, nextWidth); height = Math.max(1, nextHeight); aspect = width / height; halfWidth = aspect * 5;
    camera.left = -halfWidth; camera.right = halfWidth; camera.updateProjectionMatrix();
    frameInterval = 1000 / (width < 768 ? 20 : 25);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 768 ? 1 : 1.5)); renderer.setSize(width, height);
    sky.scale.set(halfWidth * 2, 10, 1); skyMaterial.uniforms.uAspect.value = aspect;
    const section = host.closest('section');
    const sectionTop = section?.getBoundingClientRect().top || 0;
    const actions = section?.querySelector('.spider-hero-actions')?.getBoundingClientRect();
    const contentBottom = actions ? actions.bottom - sectionTop : baseHeight * (width < 768 ? .6 : .58);
    const mobileLayout = width < 768 ? getMobileFestivalLayout(width, height, contentBottom, height - 110) : null;
    const view = getIslandViewLayout({ width, height, baseHeight, contentBottom, bounds: islandBounds });
    if (Math.abs(view.extraSpace - reservedSpace) > .1) {
      reservedSpace = view.extraSpace;
      section?.style.setProperty('--island-extra-space', `${reservedSpace}px`);
    }
    islandScale = view.scale; islandAnchor.position.y = view.anchorY;
    islandAnchor.scale.setScalar(islandScale);
    if (options.islandControl) {
      options.islandControl.style.top = `${view.top}px`;
      options.islandControl.style.width = `${Math.min(width, view.width)}px`;
      options.islandControl.style.height = `${view.height}px`;
    }
    // The flags attach to the architecture using the same cover crop as the plate.
    const imageScale = Math.max(width / 1672, height / 941);
    const offsetX = (width - 1672 * imageScale) * .5; const offsetY = (height - 941 * imageScale) * .64;
    // Only rasterize the bottom quarter where the river is painted. Its UVs
    // still use the full-hero cover crop, so it remains pinned to the rocks.
    ground.scale.set(halfWidth * 2, 2.4, 1); ground.position.y = -3.8;
    groundMaterial.uniforms.uAspect.value = aspect;
    groundMaterial.uniforms.uCover.value.set(width / (1672 * imageScale), height / (941 * imageScale), -offsetX / (1672 * imageScale), 1 - height / (941 * imageScale) + offsetY / (941 * imageScale));
    const anchors = [[.112, .17, .105, .42], [.94, .235, .091, .37], [.205, .51, .04, .19], [.83, .55, .043, .2]];
    flags.forEach((flag, i) => {
      const [x, y, w, h] = anchors[i];
      flag.root.position.set(((x * 1672 * imageScale + offsetX) / width - .5) * halfWidth * 2, (.5 - (y * 941 * imageScale + offsetY) / height) * 10, 0);
      flag.root.scale.set(w * 1672 * imageScale / height * 10, h * 941 * imageScale / height * 10 / 2.2, 1);
      if (mobileLayout && i < 2) {
        const x = i ? width - mobileLayout.flagInset : mobileLayout.flagInset;
        flag.root.position.set((x / width - .5) * halfWidth * 2, (.5 - mobileLayout.flagTop / height) * 10, 0);
        flag.root.scale.set(mobileLayout.flagWidth / height * 10, mobileLayout.flagHeight / 2.2 / height * 10, 1);
      }
      if (mobileLayout && i === 2) {
        // Keep the tower-mounted banner along the left edge on phones.
        flag.root.position.set((mobileLayout.foregroundFlagInset / width - .5) * halfWidth * 2, (.5 - mobileLayout.foregroundFlagTop / height) * 10, 0);
        flag.root.scale.set(mobileLayout.foregroundFlagWidth / height * 10, mobileLayout.foregroundFlagHeight / 2.2 / height * 10, 1);
      }
      // Keep the whole banner behind every angle of the rotating campus.
      if (i === 2) flag.root.position.z = islandBounds.min.z * islandScale - .6;
      flag.root.renderOrder = 0;
      flag.setWallMount(mobileLayout && i === 2 && mobileLayout.foregroundFlagWidth > 0
        ? (mobileLayout.foregroundFlagInset - 28) / mobileLayout.foregroundFlagWidth : null,
        mobileLayout && mobileLayout.foregroundFlagWidth > 0
          ? (height - 42 - mobileLayout.foregroundFlagTop) / mobileLayout.foregroundFlagWidth : undefined);
      flag.root.visible = width >= 768 || i < 3;
    });
    particleMaterial.uniforms.uSize.value = (width < 768 ? 2.8 : 3.2) * renderer.getPixelRatio();
    sparkMaterial.uniforms.uSize.value = (width < 768 ? 5.5 : 6.5) * renderer.getPixelRatio();
    update(0);
  };
  const controller: EnvironmentController = {
    // Paint the fully textured frame even when the saved preference pauses animation.
    ready: Promise.all([island.ready, groundReady, ...flags.map(flag => flag.ready)]).then(() => { if (!disposed && !contextLost) update(0); }),
    resize: resizeScene,
    setPaused(value) { paused = value; renderer.domElement.dataset.paused = String(value); if (value) { pointerHeld = false; pointer.active = false; update(0); } wake(); },
    setVisible(value) { visible = value; wake(); },
    react(x, y, burst = false) {
      if (paused || !visible || disposed || contextLost) return;
      pointer.x = Math.max(0, Math.min(1, x)); pointer.y = Math.max(0, Math.min(1, y)); pointer.active = true; pointer.strength = burst ? 2 : 1;
      if (burst) pointerHeld = true;
      pointerUntil = performance.now() + (burst ? 1300 : 650);
      if (burst) { groundMaterial.uniforms.uTouch.value.set(pointer.x, 1 - pointer.y, seconds, 1.25); burstParticles(field, pointer.x, pointer.y, 38); renderer.domElement.dataset.reactions = String(Number(renderer.domElement.dataset.reactions || 0) + 1); }
    },
    release() { pointerHeld = false; pointerUntil = performance.now() + 120; },
    rotateBy(radians) {
      if (!disposed && !paused && Number.isFinite(radians)) { rotationOffset += radians; update(0); }
      return (island.getRotation() * 180 / Math.PI % 360 + 360) % 360;
    },
    resetRotation() { rotationOffset -= island.getRotation(); if (!disposed) update(0); return 0; },
    dispose() {
      host.closest('section')?.style.removeProperty('--island-extra-space');
      if (disposed) return; disposed = true; if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', wake); renderer.domElement.removeEventListener('webglcontextlost', lost);
      island.dispose(); scene.remove(islandAnchor); flags.forEach(flag => { flag.dispose(); scene.remove(flag.root); });
      const geometries = new Set<BufferGeometry>(); const materials = new Set<Material>();
      scene.traverse(object => {
        if (object instanceof Mesh || object instanceof Points || object instanceof LineSegments || object instanceof Sprite) {
          if ('geometry' in object) geometries.add(object.geometry);
          const entries = Array.isArray(object.material) ? object.material : [object.material]; entries.forEach(material => materials.add(material));
        }
      });
      geometries.forEach(resource => resource.dispose()); materials.forEach(resource => resource.dispose()); glowTexture.dispose(); mistTexture.dispose(); groundTexture.dispose();
      debris.dispose(); key.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
  return controller;
}
