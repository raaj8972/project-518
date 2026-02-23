import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

// An abstract rotating wireframe shape
const AbstractShape = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Rotate slowly and react slightly to mouse
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    // Base rotation
    meshRef.current.rotation.x = t * 0.1;
    meshRef.current.rotation.y = t * 0.15;
    
    // Interactive mouse rotation tracking (subtle)
    meshRef.current.rotation.x += (state.mouse.y * 0.2 - meshRef.current.rotation.x) * 0.1;
    meshRef.current.rotation.y += (state.mouse.x * 0.2 - meshRef.current.rotation.y) * 0.1;
  });

  return (
    <Float 
      speed={2} 
      rotationIntensity={0.5} 
      floatIntensity={1}
    >
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[2, 1]} />
        <meshStandardMaterial 
          color="#818cf8" 
          emissive="#4f46e5"
          emissiveIntensity={0.5}
          wireframe={true}
          transparent={true}
          opacity={0.3}
        />
        {/* We can use native wireframe prop on material instead of Drei's Wireframe helper for better performance */}
      </mesh>
    </Float>
  );
};

export const Canvas3D: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none" style={{ mixBlendMode: 'screen' }}>
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.5]} // cap pixel ratio for performance
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#4f46e5" />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#e86cff" />
        
        <AbstractShape />
        
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};
