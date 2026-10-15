import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei';
import RobotArm from './objects/RobotArm';
import ConveyorBelt from './objects/ConveyorBelt';
import InspectionStation from './objects/InspectionStation';
import { Eye, Layers, Camera, AlertTriangle } from 'lucide-react';

/**
 * 3D Factory Simulation Canvas
 * Complete interactive Industry 4.0 scene
 */
export default function FactoryScene({
  machineStatus = 'idle',
  jointAngles = {},
  simulationSpeed = 1.0,
  onProductInspect = () => {},
}) {
  const [wireframe, setWireframe] = useState(false);
  const [showSensors, setShowSensors] = useState(true);
  const controlsRef = useRef();

  // Camera presets
  const setCameraPreset = (preset) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    if (preset === 'overview') {
      controls.object.position.set(5.5, 4.5, 6.0);
      controls.target.set(0, 1.2, 0.8);
    } else if (preset === 'robot') {
      controls.object.position.set(2.2, 2.5, 2.8);
      controls.target.set(0, 1.2, 0);
    } else if (preset === 'inspection') {
      controls.object.position.set(1.5, 2.0, 3.8);
      controls.target.set(0.5, 1.0, 1.8);
    } else if (preset === 'top') {
      controls.object.position.set(0, 8.5, 1.0);
      controls.target.set(0, 0, 1.0);
    }
    controls.update();
  };

  return (
    <div className="scene-canvas-container" style={{ minHeight: '440px', width: '100%', position: 'relative' }}>
      {/* Overlay Quick Controls */}
      <div className="scene-overlay-controls">
        <button 
          className={`btn ${wireframe ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          onClick={() => setWireframe(!wireframe)}
          title="Toggle Wireframe Mode"
        >
          <Layers size={14} /> {wireframe ? 'Solid Mode' : 'Wireframe'}
        </button>
        <button 
          className={`btn ${showSensors ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          onClick={() => setShowSensors(!showSensors)}
          title="Toggle Smart Sensor Markers"
        >
          <Eye size={14} /> Sensors {showSensors ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Camera Presets Selector */}
      <div className="scene-view-presets">
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Camera size={13} /> Views:
        </span>
        <button className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setCameraPreset('overview')}>
          Overview
        </button>
        <button className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setCameraPreset('robot')}>
          Robot
        </button>
        <button className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setCameraPreset('inspection')}>
          Inspection
        </button>
        <button className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setCameraPreset('top')}>
          Top
        </button>
      </div>

      {/* Emergency Stop / Status Banner in 3D scene if critical */}
      {machineStatus === 'emergency_stop' && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 6,
          background: 'rgba(239, 68, 68, 0.9)',
          padding: '8px 20px',
          borderRadius: '8px',
          color: 'white',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.8)'
        }}>
          <AlertTriangle size={18} /> SIMULATED EMERGENCY STOP ACTIVE — MOTION HALTED
        </div>
      )}

      {/* Canvas */}
      <Canvas
        camera={{ position: [5.5, 4.5, 6.0], fov: 45 }}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[10, 15, 10]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024} 
        />
        {/* Soft Industrial Cyan Accents */}
        <pointLight position={[-4, 3, -2]} intensity={0.8} color="#06b6d4" />
        <pointLight position={[4, 3, 4]} intensity={0.6} color="#38bdf8" />

        {/* Industrial Floor & Grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[25, 25]} />
          <meshStandardMaterial color="#0b1329" roughness={0.7} metalness={0.2} />
        </mesh>
        
        {/* Floor Grid Marking */}
        <Grid 
          position={[0, 0, 0]} 
          args={[25, 25]} 
          cellSize={1} 
          cellThickness={1} 
          cellColor="#1e293b" 
          sectionSize={5} 
          sectionThickness={1.5} 
          sectionColor="#38bdf8" 
          fadeDistance={22} 
        />

        {/* Safety Zone Perimeter Line (Yellow / Black Hatch Pattern) */}
        <mesh position={[0, 0.01, 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.2, 3.3, 32]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>

        {/* 3D Scene Objects */}
        <RobotArm 
          status={machineStatus} 
          jointAngles={jointAngles} 
          wireframe={wireframe} 
          showSensors={showSensors} 
        />

        <ConveyorBelt 
          status={machineStatus} 
          speed={simulationSpeed} 
          wireframe={wireframe} 
          onProductInspect={onProductInspect} 
        />

        <InspectionStation 
          status={machineStatus} 
          wireframe={wireframe} 
        />

        {/* Soft Contact Shadows on Ground */}
        <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={15} blur={2} far={4} />

        {/* Orbit Camera Controls */}
        <OrbitControls 
          ref={controlsRef} 
          enableDamping 
          dampingFactor={0.05} 
          maxPolarAngle={Math.PI / 2 - 0.05} 
          minDistance={2} 
          maxDistance={18} 
        />
      </Canvas>
    </div>
  );
}
