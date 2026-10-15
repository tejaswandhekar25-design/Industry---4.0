import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Overview from './pages/Overview';
import DigitalTwin from './pages/DigitalTwin';
import SensorMonitoring from './pages/SensorMonitoring';
import PredictiveMaintenance from './pages/PredictiveMaintenance';
import QualityInspection from './pages/QualityInspection';
import ProductionAnalytics from './pages/ProductionAnalytics';
import MachineManagement from './pages/MachineManagement';
import EventHistory from './pages/EventHistory';
import Settings from './pages/Settings';

import { api } from './services/api';
import { wsService } from './services/websocket';

export default function App() {
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState('ROBOT-01');
  const [machineStatus, setMachineStatus] = useState('idle');
  const [telemetry, setTelemetry] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [productionSummary, setProductionSummary] = useState({});
  const [simState, setSimState] = useState({ running: false, paused: false, speed: 1.0 });

  useEffect(() => {
    // 1. Initial REST data fetch
    fetchInitialData();

    // 2. Connect single shared WebSocket
    wsService.connect();

    // 3. Status listener
    const unsubStatus = wsService.onStatusChange((status, connected) => {
      setWsConnected(connected);
      if (connected) {
        fetchInitialData();
      }
    });

    // 4. WebSocket subscriptions
    const unsubTelemetry = wsService.subscribe('sensor_update', (data) => {
      if (data && data.readings) {
        setTelemetry(data.readings);
      }
    });

    const unsubState = wsService.subscribe('machine_state_change', (data) => {
      if (data && data.status) {
        setMachineStatus(data.status);
      }
      refreshSimState();
    });

    const unsubFault = wsService.subscribe('fault_event', (faultData) => {
      setAlerts(prev => [faultData, ...prev.filter(a => a.id !== faultData.id)]);
      refreshProductionSummary();
    });

    const unsubAlertUpdate = wsService.subscribe('alert_update', () => {
      fetchAlerts();
      refreshProductionSummary();
    });

    const unsubInspection = wsService.subscribe('inspection_result', () => {
      refreshProductionSummary();
    });

    const unsubProduction = wsService.subscribe('production_event', () => {
      refreshProductionSummary();
    });

    return () => {
      unsubStatus();
      unsubTelemetry();
      unsubState();
      unsubFault();
      unsubAlertUpdate();
      unsubInspection();
      unsubProduction();
      wsService.disconnect();
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      const [stateRes, alertsRes, prodRes, machineRes] = await Promise.all([
        api.getSimulationState(),
        api.getAlerts({ limit: 50 }),
        api.getProductionSummary(),
        api.getMachine('ROBOT-01').catch(() => null)
      ]);

      setSimState(stateRes);
      setAlerts(alertsRes);
      setProductionSummary(prodRes);
      if (machineRes) {
        setMachineStatus(machineRes.operating_status);
      }
    } catch (e) {
      console.warn('Initial sync warning:', e);
    }
  };

  const refreshSimState = async () => {
    try {
      const res = await api.getSimulationState();
      setSimState(res);
      if (res.machine_state?.status) {
        setMachineStatus(res.machine_state.status);
      }
    } catch (e) {
      console.warn('Sim state sync failed:', e);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await api.getAlerts({ limit: 50 });
      setAlerts(res);
    } catch (e) {
      console.warn('Alerts fetch failed:', e);
    }
  };

  const refreshProductionSummary = async () => {
    try {
      const res = await api.getProductionSummary();
      setProductionSummary(res);
    } catch (e) {
      console.warn('Prod summary fetch failed:', e);
    }
  };

  // Simulation Controls Handlers
  const handleStart = async () => {
    try {
      await api.startSimulation();
      setMachineStatus('running');
      refreshSimState();
    } catch (e) {
      alert('Failed to start simulation: ' + e.message);
    }
  };

  const handlePause = async () => {
    try {
      await api.pauseSimulation();
      refreshSimState();
    } catch (e) {
      alert('Failed to pause simulation: ' + e.message);
    }
  };

  const handleResume = async () => {
    try {
      await api.resumeSimulation();
      refreshSimState();
    } catch (e) {
      alert('Failed to resume simulation: ' + e.message);
    }
  };

  const handleReset = async () => {
    try {
      await api.resetSimulation();
      setMachineStatus('idle');
      fetchInitialData();
    } catch (e) {
      alert('Failed to reset simulation: ' + e.message);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      await api.emergencyStop();
      setMachineStatus('emergency_stop');
      fetchAlerts();
      refreshSimState();
    } catch (e) {
      alert('E-Stop execution failed: ' + e.message);
    }
  };

  const activeAlertCount = alerts.filter(a => a.status === 'active').length;

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Left Navigation Sidebar */}
        <Sidebar alertCount={activeAlertCount} />

        {/* Main Content Area */}
        <div className="main-content">
          {/* Top Header Bar */}
          <Header
            simState={simState}
            wsConnected={wsConnected}
            selectedMachine={selectedMachine}
            onSelectMachine={setSelectedMachine}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onReset={handleReset}
            onEmergencyStop={handleEmergencyStop}
          />

          {/* Routed Views */}
          <Routes>
            <Route 
              path="/" 
              element={
                <Overview 
                  telemetry={telemetry}
                  machineStatus={machineStatus}
                  simState={simState}
                  alerts={alerts}
                  productionSummary={productionSummary}
                  onSelectMachine={setSelectedMachine}
                />
              } 
            />
            <Route 
              path="/digital-twin" 
              element={
                <DigitalTwin 
                  machineStatus={machineStatus}
                  telemetry={telemetry}
                  simState={simState}
                />
              } 
            />
            <Route 
              path="/sensors" 
              element={<SensorMonitoring telemetry={telemetry} />} 
            />
            <Route 
              path="/predictive-maintenance" 
              element={
                <PredictiveMaintenance 
                  alerts={alerts} 
                  onRefreshAlerts={fetchAlerts} 
                />
              } 
            />
            <Route 
              path="/quality-inspection" 
              element={<QualityInspection />} 
            />
            <Route 
              path="/production-analytics" 
              element={<ProductionAnalytics />} 
            />
            <Route 
              path="/machines" 
              element={<MachineManagement selectedMachine={selectedMachine} />} 
            />
            <Route 
              path="/events" 
              element={<EventHistory />} 
            />
            <Route 
              path="/settings" 
              element={
                <Settings 
                  simState={simState} 
                  onRefreshSim={() => { refreshSimState(); fetchAlerts(); }} 
                />
              } 
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
