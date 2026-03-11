export const particleVertexShader = `
  uniform float uTime;
  uniform float uTransition;
  uniform vec2 uMouse;
  uniform float uPixelRatio;
  uniform float uSize;

  attribute vec3 targetPosition;
  attribute float particleRandom;

  varying vec3 vPosition;
  varying float vRandom;

  void main() {
    vRandom = particleRandom;
    
    // Morphing between current and target position
    vec3 pos = mix(position, targetPosition, uTransition);
    
    // Subtle Jitter/Noise
    pos.x += sin(uTime * 2.0 + particleRandom * 100.0) * 0.05;
    pos.y += cos(uTime * 1.5 + particleRandom * 100.0) * 0.05;
    pos.z += sin(uTime * 1.0 + particleRandom * 100.0) * 0.05;
    
    // Mouse Parallax
    pos.x += uMouse.x * 2.0 * (1.0 - uTransition);
    pos.y += uMouse.y * 2.0 * (1.0 - uTransition);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Depth-based point size (simple DOF simulation)
    gl_PointSize = uSize * uPixelRatio * (20.0 / -mvPosition.z);
    
    // Randomize size slightly
    gl_PointSize *= (0.8 + particleRandom * 0.4);
    
    gl_Position = projectionMatrix * mvPosition;
    vPosition = pos;
  }
`;

export const particleFragmentShader = `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uTime;

  varying vec3 vPosition;
  varying float vRandom;

  void main() {
    // Circular point shape
    float dist = distance(gl_PointCoord, vec2(0.5));
    if (dist > 0.5) discard;

    // Soft edge/glow
    float alpha = smoothstep(0.5, 0.1, dist);
    
    // Color mixing based on position and randomness
    vec3 color = mix(uColor1, uColor2, vRandom);
    
    // Rim lighting / Glow effect based on position
    float rim = 1.0 - smoothstep(0.0, 5.0, length(vPosition.xy));
    color += rim * 0.2;

    // Subtle pulse
    float pulse = sin(uTime * 3.0 + vRandom * 10.0) * 0.1 + 0.9;
    
    gl_FragColor = vec4(color, alpha * pulse);
  }
`;
