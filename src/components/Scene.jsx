import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';

const AnimatedShapes = () => {
  const sphereRef1 = useRef(null);
  const sphereRef2 = useRef(null);
  
  // Rotate shapes slowly over time
  useFrame((state, delta) => {
    if (sphereRef1.current) {
      sphereRef1.current.rotation.x += delta * 0.2;
      sphereRef1.current.rotation.y += delta * 0.3;
    }
    if (sphereRef2.current) {
      sphereRef2.current.rotation.x -= delta * 0.1;
      sphereRef2.current.rotation.y -= delta * 0.4;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#10b981" />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#0ea5e9" />

      {/* Floating abstract emerald sphere */}
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <Sphere ref={sphereRef1} args={[1.5, 64, 64]} position={[-3, 1, -2]}>
          <MeshDistortMaterial 
            color="#059669" // Emerald 600
            attach="material" 
            distort={0.4} 
            speed={2} 
            roughness={0.2}
            metalness={0.8}
            wireframe={true}
          />
        </Sphere>
      </Float>

      {/* Secondary floating sphere */}
      <Float speed={3} rotationIntensity={2} floatIntensity={1.5}>
        <Sphere ref={sphereRef2} args={[1, 32, 32]} position={[4, -2, -4]}>
          <MeshDistortMaterial 
            color="#ef4444" // Red 500
            attach="material" 
            distort={0.6} 
            speed={1.5} 
            roughness={0.1}
            metalness={1}
            opacity={0.7}
            transparent={true}
          />
        </Sphere>
      </Float>

      {/* Background stars for depth */}
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
    </>
  );
};

export const Scene = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        <AnimatedShapes />
      </Canvas>
    </div>
  );
};

export default Scene;
