export type TitleAtmosphereRenderer = {
  draw(elapsedSeconds: number): void;
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
};

const vertexSource = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uPhoto;
uniform vec2 uResolution;
uniform float uImageAspect;
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) {
#ifdef GL_FRAGMENT_PRECISION_HIGH
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
#else
  // Bound intermediate values so fp16-only fragment units retain fractional detail.
  p = mod(p, 17.0);
  p = fract(p * vec2(0.1031, 0.11369));
  p += dot(p, p.yx + 0.33);
  return fract((p.x + p.y) * (p.x + 0.71) * 0.713);
#endif
}

float noise(vec2 p) {
  vec2 cell = floor(p), part = fract(p);
  vec2 blend = part * part * (3.0 - 2.0 * part);
  return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), blend.x),
             mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), blend.x), blend.y);
}

// Three octaves keep the cloud texture detailed without a costly ray march.
float fbm(vec2 p) {
  float value = noise(p) * 0.5714;
  p = mat2(1.6, -1.2, 1.2, 1.6) * p + 7.1;
  value += noise(p) * 0.2857;
  p = mat2(1.6, -1.2, 1.2, 1.6) * p + 3.7;
  return value + noise(p) * 0.1429;
}

void main() {
  // Top-down coordinates make the photographic cloud mask independent of GL's Y axis.
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 cover = vec2(min(1.0, aspect / uImageAspect), min(1.0, uImageAspect / aspect));
  vec2 photoUv = (p - 0.5) * cover + 0.5;
  float time = max(uTime, 0.0);
  float arrival = 1.0 - exp(-time * 1.6);

  // The source's lowest quarter contains the real cloud banks. Keep the upper
  // architecture rigid while the photographed smoke banks are advected.
  float cloudBand = smoothstep(0.69, 0.84, photoUv.y);
  float sideBank = 1.0 - smoothstep(0.10, 0.30, min(photoUv.x, 1.0 - photoUv.x));
  cloudBand = max(cloudBand, sideBank * smoothstep(0.70, 0.84, photoUv.y) * 0.65);
  // A long feather keeps the image's lower edge fixed without folding the texture.
  float bottomAnchor = 1.0 - smoothstep(0.87, 1.0, photoUv.y);
  float bankDirection = mix(-1.0, 1.0, smoothstep(0.38, 0.62, photoUv.x));
  float flow = fbm(photoUv * vec2(7.5, 11.0)
                 + vec2(bankDirection * time * 0.28, time * 0.19));
  float curl = sin(flow * 6.2832 + photoUv.x * 9.0 - time * 1.05);
  vec2 turbulence = vec2((flow - 0.5) * 0.044, curl * 0.015);
  // Opposing banks roll inward and lift by roughly 4–7% during the short title.
  float rise = 0.061 * (1.0 - exp(-time * 0.75));
  float eddy = (sin(time * 0.95 + photoUv.x * 4.0) - sin(photoUv.x * 4.0)) * 0.009;
  vec2 drift = vec2(bankDirection * sin(time * 0.65) * 0.028 + eddy, rise);
  photoUv += (drift + turbulence * arrival) * cloudBand * bottomAnchor;
  photoUv = clamp(photoUv, vec2(0.001), vec2(0.999));

  // One photograph lookup preserves all of the original rim light and shadows.
  vec3 photo = texture2D(uPhoto, vec2(photoUv.x, 1.0 - photoUv.y)).rgb;
  float cloudBreath = (sin(time * 1.4 + flow * 4.0) - sin(flow * 4.0)) * 0.04;
  photo *= 1.0 + cloudBreath * cloudBand;

  vec2 light = vec2((p.x - 0.5) * aspect, p.y - 0.04);
  float depth = max(light.y, 0.001);
  float angle = atan(light.x, depth);
  float movingAngle = angle - sin(time * 0.85) * 0.075;
  float belowSource = smoothstep(0.0, 0.055, light.y);
  float cone = exp(-movingAngle * movingAngle * 3.5);
  float shaftNoise = noise(vec2(movingAngle * 39.0 - time * 0.55, 1.75));
  float fineShaft = pow(max(0.0, sin(movingAngle * 75.0 + time * 0.65)), 10.0);
  float density = pow(shaftNoise, 2.2) * 0.75 + fineShaft * 0.25;
  float mist = 0.68 + 0.32 * sin(depth * 25.0 - time * 4.2 + movingAngle * 4.0);
  float rays = density * cone * belowSource * exp(-depth * 1.65) * mist * 0.47;

  // The narrow cream/lime centre and horizontal lens streak share the same source.
  float coreWidth = 0.0035 + depth * 0.016;
  float core = exp(-pow(light.x / coreWidth, 2.0)) * belowSource * exp(-depth * 3.0) * 0.13;
  float flareY = 0.074 + sin(time * 0.95) * 0.0045;
  float flare = exp(-abs(p.y - flareY) * 175.0) * exp(-abs(light.x) * 4.0) * 0.10;
  float sourceWidth = 0.08 + sin(time * 0.8) * 0.012;
  float sourceGlow = exp(-pow(light.x / sourceWidth, 2.0) - pow(light.y / 0.10, 2.0)) * 0.09;
  float pulse = 0.82 + 0.14 * sin(time * 1.7) + 0.04 * sin(time * 3.1);
  vec3 illumination = vec3(0.51, 0.88, 0.12) * rays
                    + vec3(0.79, 0.98, 0.43) * (core + flare + sourceGlow) * pulse;
  illumination *= smoothstep(0.0, 0.65, time);
  // Screen compositing keeps green highlights bright without bleaching the photo.
  vec3 color = 1.0 - (1.0 - photo) * (1.0 - clamp(illumination, 0.0, 0.42));
  gl_FragColor = vec4(color, 1.0);
}
`;

/** A photograph-based atmosphere; the caller owns timing, visibility and resize events. */
export function createTitleAtmosphereRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement): TitleAtmosphereRenderer | null {
  if (!image.naturalWidth || !image.naturalHeight) return null;
  let gl: WebGLRenderingContext | null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    });
  } catch { return null; }
  if (!gl) return null;

  let vertex: WebGLShader | null = null, fragment: WebGLShader | null = null;
  let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null, texture: WebGLTexture | null = null;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (texture) gl.deleteTexture(texture);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  };
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
    return shader;
  };

  try {
    vertex = compile(gl.VERTEX_SHADER, vertexSource);
    fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) { dispose(); return null; }
    program = gl.createProgram();
    if (!program) { dispose(); return null; }
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { dispose(); return null; }
    buffer = gl.createBuffer(); texture = gl.createTexture();
    if (!buffer || !texture) { dispose(); return null; }
    const position = gl.getAttribLocation(program, 'aPosition');
    const resolution = gl.getUniformLocation(program, 'uResolution');
    const imageAspect = gl.getUniformLocation(program, 'uImageAspect');
    const elapsed = gl.getUniformLocation(program, 'uTime');
    const photo = gl.getUniformLocation(program, 'uPhoto');
    if (position < 0 || !resolution || !imageAspect || !elapsed || !photo) { dispose(); return null; }

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(photo, 0); gl.uniform1f(imageAspect, image.naturalWidth / image.naturalHeight);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);

    const draw = (elapsedSeconds: number) => {
      if (disposed || gl.isContextLost()) return;
      gl.useProgram(program);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(elapsed, Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const resize = (width: number, height: number, pixelRatio: number) => {
      if (disposed || gl.isContextLost()) return;
      const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
      const w = Math.max(1, Math.round((Number.isFinite(width) ? width : 1) * ratio));
      const h = Math.max(1, Math.round((Number.isFinite(height) ? height : 1) * ratio));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    return { draw, resize, dispose };
  } catch {
    dispose(); return null;
  }
}
