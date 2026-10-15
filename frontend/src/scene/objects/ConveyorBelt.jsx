import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Industrial Conveyor Belt System with Moving Workpieces
 */
export default function ConveyorBelt({ 
  status = 'idle', 
  speed = 1.0, 
  wireframe = false,
  onProductInspect = () => {} 
}) {
  const productsGroupRef = useRef();
  const conveyorLength = 9.0;
  const conveyorWidth = 0.9;
  const conveyorHeight = 0.7;

  // Track product positions along the X-axis: -4.5 to +4.5
  const initialProducts = useMemo(() => [
    { id: 'PRD-101', pos: -4.0, inspected: false, isDefect: false },
    { id: 'PRD-102', pos: -2.2, inspected: false, isDefect: false },
    { id: 'PRD-103', pos: -0.4, inspected: false, isDefect: true },
    { id: 'PRD-104', pos: 1.4, inspected: false, isDefect: false },
    { id: 'PRD-105', pos: 3.2, inspected: false, isDefect: false },
  ], []);

  const productsRef = useRef(initialProducts);

  useFrame((_, delta) => {
    if (status !== 'running') return;

    const moveStep = delta * 0.9 * speed;
    productsRef.current.forEach((prod) => {
      prod.pos += moveStep;

      // When product crosses the inspection scanner at x = 0.5
      if (!prod.inspected && prod.pos >= 0.45 && prod.pos <= 0.65) {
        prod.inspected = true;
        onProductInspect(prod);
      }

      // Loop product back to beginning
      if (prod.pos > conveyorLength / 2) {
        prod.pos = -conveyorLength / 2;
        prod.inspected = false;
        // Randomly assign slight defect probability
        prod.isDefect = Math.random() < 0.2;
      }
    });

    // Update 3D meshes positions
    if (productsGroupRef.current) {
      productsGroupRef.current.children.forEach((mesh, idx) => {
        const prod = productsRef.current[idx];
        if (prod) {
          mesh.position.x = prod.pos;
        }
      });
    }
  });

  return (
    <group position={[0, 0, 1.8]}>
      {/* Conveyor Bed / Frame */}
      <mesh position={[0, conveyorHeight / 2, 0]}>
        <boxGeometry args={[conveyorLength, conveyorHeight, conveyorWidth]} />
        <meshStandardMaterial 
          color="#1e293b" 
          metalness={0.7} 
          roughness={0.4} 
          wireframe={wireframe} 
        />
      </mesh>

      {/* Conveyor Moving Belt Top */}
      <mesh position={[0, conveyorHeight + 0.02, 0]}>
        <boxGeometry args={[conveyorLength - 0.1, 0.04, conveyorWidth - 0.1]} />
        <meshStandardMaterial 
          color="#0f172a" 
          roughness={0.9} 
          wireframe={wireframe} 
        />
      </mesh>

      {/* Guide Rails along edges */}
      <mesh position={[0, conveyorHeight + 0.12, conveyorWidth / 2 - 0.02]}>
        <boxGeometry args={[conveyorLength, 0.15, 0.04]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.8} />
      </mesh>
      <mesh position={[0, conveyorHeight + 0.12, -conveyorWidth / 2 + 0.02]}>
        <boxGeometry args={[conveyorLength, 0.15, 0.04]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.8} />
      </mesh>

      {/* Conveyor Support Legs */}
      {[-3.8, -1.9, 0, 1.9, 3.8].map((x, i) => (
        <group key={i} position={[x, conveyorHeight / 4, 0]}>
          <mesh position={[0, 0, conveyorWidth / 2 - 0.05]}>
            <cylinderGeometry args={[0.04, 0.04, conveyorHeight / 2, 16]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, -conveyorWidth / 2 + 0.05]}>
            <cylinderGeometry args={[0.04, 0.04, conveyorHeight / 2, 16]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Moving Products (Workpieces) */}
      <group ref={productsGroupRef}>
        {productsRef.current.map((prod, idx) => (
          <group key={prod.id} position={[prod.pos, conveyorHeight + 0.16, 0]}>
            {/* Machined Metal Block */}
            <mesh>
              <boxGeometry args={[0.4, 0.22, 0.35]} />
              <meshStandardMaterial 
                color={prod.isDefect ? '#e2e8f0' : '#64748b'} 
                metalness={0.85} 
                roughness={0.25} 
              />
            </mesh>
            {/* Cylindrical bore in center */}
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.15, 16]} />
              <meshStandardMaterial color="#0284c7" metalness={0.9} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
