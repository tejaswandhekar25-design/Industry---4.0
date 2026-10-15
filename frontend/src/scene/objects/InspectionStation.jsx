import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * AI Machine Vision Inspection Gantry & Optical Station
 */
export default function InspectionStation({ status = 'running', wireframe = false }) {
  const laserRef = useRef();
  const scanLightRef = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (laserRef.current && status === 'running') {
      // Oscillate scanning laser sheet across workpiece
      const zOffset = Math.sin(time * 4) * 0.35;
      laserRef.current.position.z = zOffset;
    }
  });

  return (
    <group position={[0.5, 0, 1.8]}>
      {/* Arch Post Left */}
      <mesh position={[0, 1.0, 0.65]}>
        <boxGeometry args={[0.15, 2.0, 0.15]} />
        <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} wireframe={wireframe} />
      </mesh>

      {/* Arch Post Right */}
      <mesh position={[0, 1.0, -0.65]}>
        <boxGeometry args={[0.15, 2.0, 0.15]} />
        <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} wireframe={wireframe} />
      </mesh>

      {/* Arch Top Bridge */}
      <mesh position={[0, 2.0, 0]}>
        <boxGeometry args={[0.2, 0.15, 1.45]} />
        <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} wireframe={wireframe} />
      </mesh>

      {/* Overhead Vision Inspection Camera */}
      <group position={[0, 1.85, 0]}>
        <mesh>
          <boxGeometry args={[0.25, 0.15, 0.25]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} />
        </mesh>
        {/* Camera Lens */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.07, 0.08, 0.08, 24]} />
          <meshStandardMaterial color="#38bdf8" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Laser Scanner Sheet (Cyan semi-transparent plane) */}
      <mesh ref={laserRef} position={[0, 1.0, 0]}>
        <planeGeometry args={[0.02, 1.4]} />
        <meshBasicMaterial 
          color="#06b6d4" 
          transparent={true} 
          opacity={0.65} 
          side={THREE.DoubleSide} 
        />
      </mesh>

      {/* Laser Illumination Spot */}
      <spotLight 
        ref={scanLightRef}
        position={[0, 1.7, 0]} 
        target-position={[0, 0.7, 0]}
        color="#06b6d4" 
        intensity={2.0} 
        angle={0.4} 
        penumbra={0.5} 
      />

      {/* Andon Signal Tower (Safety Beacon) */}
      <group position={[0, 2.3, 0.65]}>
        {/* Mast */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 12]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {/* Red light */}
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 16]} />
          <meshStandardMaterial 
            color="#ef4444" 
            emissive="#ef4444" 
            emissiveIntensity={status === 'critical' ? 2.5 : 0.1} 
          />
        </mesh>
        {/* Amber light */}
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 16]} />
          <meshStandardMaterial 
            color="#f59e0b" 
            emissive="#f59e0b" 
            emissiveIntensity={status === 'warning' ? 2.2 : 0.1} 
          />
        </mesh>
        {/* Green light */}
        <mesh position={[0, 0.52, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 16]} />
          <meshStandardMaterial 
            color="#22c55e" 
            emissive="#22c55e" 
            emissiveIntensity={status === 'running' ? 2.0 : 0.1} 
          />
        </mesh>
      </group>
    </group>
  );
}
