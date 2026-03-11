import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { particleVertexShader, particleFragmentShader } from '../../shaders/particleShader';

interface ParticleHeroProps {
  transition?: number; // 0 to 1 for morphing
  mouseIntensity?: number;
}

export const ParticleHero: React.FC<ParticleHeroProps> = ({ 
  transition = 0,
  mouseIntensity = 0.5 
}) => {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport, size } = useThree();
  
  const particleCount = 15000;
  
  // Create particle positions for different shapes
  const [positions, targetPositions, randoms] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const targetPos = new Float32Array(particleCount * 3);
    const random = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        // Initial Shape: Sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = 4.0;
        
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
        
        // Target Shape: Torus-like or abstract structure
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        const R = 6.0;
        const rr = 1.5;
        
        targetPos[i * 3] = (R + rr * Math.cos(v)) * Math.cos(u);
        targetPos[i * 3 + 1] = (R + rr * Math.cos(v)) * Math.sin(u);
        targetPos[i * 3 + 2] = rr * Math.sin(v);
        
        random[i] = Math.random();
    }
    
    return [pos, targetPos, random];
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uTransition: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uSize: { value: 40.0 }, // Base size of particles
    uColor1: { value: new THREE.Color('#6366f1') }, // Indigo
    uColor2: { value: new THREE.Color('#a855f7') }, // Purple
  }), []);

  useFrame((state) => {
    if (!materialRef.current) return;
    
    const { clock, mouse } = state;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uTransition.value = transition;
    
    // Smoothly follow mouse
    const targetMouseX = mouse.x * mouseIntensity;
    const targetMouseY = mouse.y * mouseIntensity;
    
    materialRef.current.uniforms.uMouse.value.x += (targetMouseX - materialRef.current.uniforms.uMouse.value.x) * 0.05;
    materialRef.current.uniforms.uMouse.value.y += (targetMouseY - materialRef.current.uniforms.uMouse.value.y) * 0.05;
    
    // Subtle rotation of the whole system
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0019;
      meshRef.current.rotation.x += 0.0004;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute 
          attach="attributes-targetPosition"
          count={particleCount}
          array={targetPositions}
          itemSize={3}
        />
        <bufferAttribute 
          attach="attributes-particleRandom"
          count={particleCount}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial 
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default ParticleHero;
