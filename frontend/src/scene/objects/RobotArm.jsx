import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 6-Axis Industrial Robotic Arm with Hierarchical Kinematics
 * Synchronized with machine status (running, warning, critical, emergency_stop).
 */
export default function RobotArm({ 
  status = 'idle', 
  jointAngles = {}, 
  wireframe = false,
  showSensors = true 
}) {
  const baseRef = useRef();
  const shoulderRef = useRef();
  const elbowRef = useRef();
  const wristRef = useRef();
  const gripperLeftRef = useRef();
  const gripperRightRef = useRef();
  const statusLightRef = useRef();

  // Status colors
  const statusColors = {
    running: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444',
    emergency_stop: '#ef4444',
    idle: '#94a3b8',
    stopped: '#64748b',
  };
  const activeColor = statusColors[status] || '#22c55e';

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const isMoving = status === 'running';

    if (isMoving) {
      // Procedural pick-and-place joint animation
      const cycle = time * 0.8;
      
      // Base rotation (-45 to 45 deg)
      if (baseRef.current) {
        baseRef.current.rotation.y = Math.sin(cycle) * 0.7;
      }
      // Shoulder tilt
      if (shoulderRef.current) {
        shoulderRef.current.rotation.z = Math.sin(cycle * 2) * 0.25 - 0.2;
      }
      // Elbow bend
      if (elbowRef.current) {
        elbowRef.current.rotation.z = Math.cos(cycle * 2) * 0.35 + 0.4;
      }
      // Wrist rotation
      if (wristRef.current) {
        wristRef.current.rotation.x = Math.sin(cycle * 1.5) * 0.4;
      }
      // Gripper open/close
      const gripOffset = (Math.sin(cycle * 2) + 1) * 0.04;
      if (gripperLeftRef.current && gripperRightRef.current) {
        gripperLeftRef.current.position.x = -0.06 - gripOffset;
        gripperRightRef.current.position.x = 0.06 + gripOffset;
      }
    }

    // Status beacon pulse animation
    if (statusLightRef.current) {
      const pulse = Math.sin(time * 6) * 0.5 + 0.5;
      statusLightRef.current.intensity = (status === 'critical' || status === 'warning') 
        ? 1.5 + pulse * 2.5 
        : 1.2;
    }
  });

  const industrialOrange = '#f97316';
  const darkMetal = '#1e293b';
  const brightSteel = '#94a3b8';

  return (
    <group position={[0, 0, 0]}>
      {/* Robot Base Mount / Pedestal */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.7, 0.8, 0.5, 32]} />
        <meshStandardMaterial 
          color={darkMetal} 
          roughness={0.4} 
          metalness={0.8} 
          wireframe={wireframe} 
        />
      </mesh>

      {/* Mounting Bolts on base */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <mesh key={i} position={[Math.cos(rad) * 0.65, 0.5, Math.sin(rad) * 0.65]}>
            <cylinderGeometry args={[0.03, 0.03, 0.06, 8]} />
            <meshStandardMaterial color={brightSteel} metalness={0.9} />
          </mesh>
        );
      })}

      {/* Joint 1: Turntable Base */}
      <group ref={baseRef} position={[0, 0.5, 0]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.55, 0.6, 0.4, 32]} />
          <meshStandardMaterial 
            color={industrialOrange} 
            roughness={0.3} 
            metalness={0.6} 
            wireframe={wireframe} 
          />
        </mesh>

        {/* Status Light Ring on Base */}
        <mesh position={[0, 0.42, 0]}>
          <torusGeometry args={[0.52, 0.04, 16, 32]} />
          <meshStandardMaterial 
            color={activeColor} 
            emissive={activeColor} 
            emissiveIntensity={status === 'running' ? 0.6 : 1.5} 
          />
        </mesh>
        <pointLight ref={statusLightRef} position={[0, 0.7, 0]} color={activeColor} distance={3} />

        {/* Shoulder Fork */}
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[0.45, 0.5, 0.45]} />
          <meshStandardMaterial color={darkMetal} roughness={0.5} metalness={0.7} wireframe={wireframe} />
        </mesh>

        {/* Joint 2: Shoulder */}
        <group ref={shoulderRef} position={[0, 0.8, 0]}>
          {/* Shoulder Motor Housing */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.55, 24]} />
            <meshStandardMaterial color={brightSteel} metalness={0.8} />
          </mesh>

          {/* Lower Arm (Bicep) */}
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[0.26, 1.4, 0.26]} />
            <meshStandardMaterial 
              color={industrialOrange} 
              roughness={0.3} 
              metalness={0.6} 
              wireframe={wireframe} 
            />
          </mesh>

          {/* Joint 3: Elbow */}
          <group ref={elbowRef} position={[0, 1.4, 0]}>
            {/* Elbow Motor Housing */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.22, 0.22, 0.45, 24]} />
              <meshStandardMaterial color={darkMetal} metalness={0.8} />
            </mesh>

            {/* Forearm */}
            <mesh position={[0, 0.6, 0]}>
              <cylinderGeometry args={[0.14, 0.18, 1.2, 24]} />
              <meshStandardMaterial 
                color={industrialOrange} 
                roughness={0.3} 
                metalness={0.6} 
                wireframe={wireframe} 
              />
            </mesh>

            {/* Joint 4 & 5: Wrist */}
            <group ref={wristRef} position={[0, 1.2, 0]}>
              <mesh position={[0, 0.1, 0]}>
                <sphereGeometry args={[0.16, 20, 20]} />
                <meshStandardMaterial color={darkMetal} metalness={0.9} />
              </mesh>

              {/* End Effector Flange */}
              <mesh position={[0, 0.25, 0]}>
                <cylinderGeometry args={[0.12, 0.14, 0.1, 24]} />
                <meshStandardMaterial color={brightSteel} metalness={0.9} />
              </mesh>

              {/* Gripper Tool Base */}
              <mesh position={[0, 0.35, 0]}>
                <boxGeometry args={[0.3, 0.1, 0.12]} />
                <meshStandardMaterial color={darkMetal} metalness={0.7} />
              </mesh>

              {/* Gripper Finger Left */}
              <mesh ref={gripperLeftRef} position={[-0.08, 0.45, 0]}>
                <boxGeometry args={[0.03, 0.16, 0.08]} />
                <meshStandardMaterial color={brightSteel} metalness={0.8} />
              </mesh>

              {/* Gripper Finger Right */}
              <mesh ref={gripperRightRef} position={[0.08, 0.45, 0]}>
                <boxGeometry args={[0.03, 0.16, 0.08]} />
                <meshStandardMaterial color={brightSteel} metalness={0.8} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* Sensor Markers (Visual indicators of physical smart sensors) */}
      {showSensors && (
        <group>
          {/* Temperature Sensor at Base/Motor */}
          <mesh position={[0.4, 0.6, 0.2]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.8} />
          </mesh>
          {/* Vibration Sensor on Shoulder */}
          <mesh position={[-0.2, 1.4, 0.2]}>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.8} />
          </mesh>
          {/* Current Sensor on Elbow */}
          <mesh position={[0.2, 2.3, -0.1]}>
            <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
}
