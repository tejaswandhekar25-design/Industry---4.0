/**
 * SmartFactory 4.0 - In-Browser Standalone Simulation Engine
 * Replicates FastAPI backend services & WebSocket streaming directly in the browser
 * when backend server / WebSockets are unavailable (e.g. Vercel static hosting).
 */

class MockSimulatorEngine {
  constructor() {
    this.tick = 0;
    this.listeners = new Set();
    this.timer = null;

    this.state = {
      running: false,
      paused: false,
      speed: 1.0,
      emergency_stop: false,
      tick: 0,
      started_at: null,
    };

    this.activeFaults = {};

    this.machines = [
      {
        id: 'ROBOT-01',
        name: 'Industrial Robot Arm #1',
        machine_type: 'robot_arm',
        operating_status: 'idle',
        description: '6-axis industrial robot arm for pick-and-place operations. Simulated for demonstration.',
        location: 'Main Production Floor - Station A',
        health_score: 100,
      },
      {
        id: 'CONV-01',
        name: 'Production Conveyor #1',
        machine_type: 'conveyor',
        operating_status: 'idle',
        description: 'Main production conveyor belt. Simulated for demonstration.',
        location: 'Main Production Floor',
        health_score: 100,
      },
    ];

    this.jointAngles = {
      base: 0.0,
      shoulder: -30.0,
      elbow: 45.0,
      wrist: 0.0,
    };

    this.sensors = [
      { id: 'ROBOT-01_TEMP_01', machine_id: 'ROBOT-01', sensor_type: 'temperature', name: 'Temperature Sensor', unit: '°C', min_value: 0, max_value: 120, warning_threshold: 75, critical_threshold: 90, connection_status: 'connected', last_reading: 44.8 },
      { id: 'ROBOT-01_VIB_01', machine_id: 'ROBOT-01', sensor_type: 'vibration', name: 'Vibration Sensor', unit: 'mm/s', min_value: 0, max_value: 20, warning_threshold: 8, critical_threshold: 12, connection_status: 'connected', last_reading: 3.2 },
      { id: 'ROBOT-01_CUR_01', machine_id: 'ROBOT-01', sensor_type: 'motor_current', name: 'Motor Current Sensor', unit: 'A', min_value: 0, max_value: 30, warning_threshold: 15, critical_threshold: 20, connection_status: 'connected', last_reading: 7.9 },
      { id: 'ROBOT-01_POS_base', machine_id: 'ROBOT-01', sensor_type: 'position', name: 'Base Joint Encoder', unit: 'deg', min_value: -180, max_value: 180, warning_threshold: null, critical_threshold: null, connection_status: 'connected', last_reading: 0 },
      { id: 'ROBOT-01_POS_shoulder', machine_id: 'ROBOT-01', sensor_type: 'position', name: 'Shoulder Joint Encoder', unit: 'deg', min_value: -90, max_value: 90, warning_threshold: null, critical_threshold: null, connection_status: 'connected', last_reading: -30 },
      { id: 'ROBOT-01_POS_elbow', machine_id: 'ROBOT-01', sensor_type: 'position', name: 'Elbow Joint Encoder', unit: 'deg', min_value: -135, max_value: 135, warning_threshold: null, critical_threshold: null, connection_status: 'connected', last_reading: 45 },
      { id: 'ROBOT-01_POS_wrist', machine_id: 'ROBOT-01', sensor_type: 'position', name: 'Wrist Joint Encoder', unit: 'deg', min_value: -180, max_value: 180, warning_threshold: null, critical_threshold: null, connection_status: 'connected', last_reading: 0 },
      { id: 'ROBOT-01_PROX_01', machine_id: 'ROBOT-01', sensor_type: 'proximity', name: 'Proximity Sensor', unit: 'bool', min_value: 0, max_value: 1, warning_threshold: null, critical_threshold: null, connection_status: 'connected', last_reading: 1 },
      { id: 'ROBOT-01_FORCE_01', machine_id: 'ROBOT-01', sensor_type: 'force', name: 'Gripper Force Sensor', unit: 'N', min_value: 0, max_value: 50, warning_threshold: 30, critical_threshold: 40, connection_status: 'connected', last_reading: 5.1 },
    ];

    this.alerts = [
      {
        id: 1,
        machine_id: 'ROBOT-01',
        fault_type: 'system_initialized',
        severity: 'info',
        description: 'SmartFactory 4.0 simulation initialized in browser runtime mode.',
        recommended_action: 'Click "Start Simulation" in the navigation bar to run telemetry.',
        status: 'resolved',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    this.inspections = [];
    this._seedInspections();

    this.productionEvents = [];
    this.totalProducts = 42;
    this.productsPassed = 40;
    this.productsRejected = 2;

    this.maintenanceRecords = [
      {
        id: 1,
        machine_id: 'ROBOT-01',
        technician_name: 'Alex Rivera (Lead Mechatronics Tech)',
        maintenance_type: 'preventive',
        description: 'Quarterly lubrication and joint encoder calibration.',
        parts_replaced: 'Axis 2 Harmonic Drive Seal',
        cost: 320.0,
        downtime_minutes: 45,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 2,
        machine_id: 'CONV-01',
        technician_name: 'Priya Sharma (Automation Engineer)',
        maintenance_type: 'corrective',
        description: 'Tension belt adjustment and optical sensor realignment.',
        parts_replaced: 'Drive belt #B-14',
        cost: 115.0,
        downtime_minutes: 20,
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
    ];

    this.readingsHistory = [];
  }

  _seedInspections() {
    const defectTypes = ['scratch', 'dent', 'dimension_error', 'discoloration', 'surface_crack'];
    for (let i = 1; i <= 20; i++) {
      const isDefect = i % 10 === 0;
      this.inspections.push({
        id: i,
        product_id: `PRD-${1000 + i}`,
        machine_id: 'ROBOT-01',
        inspection_mode: 'ai_vision',
        result: isDefect ? 'defect' : 'pass',
        defect_type: isDefect ? defectTypes[i % defectTypes.length] : null,
        confidence_score: Number((0.92 + Math.random() * 0.07).toFixed(3)),
        model_version: 'YOLOv8-Industrial-v2.1',
        inspection_duration_ms: Math.floor(40 + Math.random() * 30),
        notes: isDefect ? 'Anomaly detected above threshold' : 'Inspected within normal tolerances',
        created_at: new Date(Date.now() - (21 - i) * 120000).toISOString(),
      });
    }
  }

  // Pub-Sub for WebSocket bridge
  onEvent(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(type, data) {
    this.listeners.forEach((cb) => {
      try {
        cb(type, data);
      } catch (e) {
        console.warn('[MockSim] Emit error:', e);
      }
    });
  }

  // Simulation lifecycle
  startSimulation() {
    this.state.running = true;
    this.state.paused = false;
    this.state.emergency_stop = false;
    this.state.started_at = new Date().toISOString();

    const robot = this.machines.find((m) => m.id === 'ROBOT-01');
    if (robot) robot.operating_status = 'running';

    this.emit('machine_state_change', {
      machine_id: 'ROBOT-01',
      status: 'running',
      simulation_running: true,
      simulation_paused: false,
    });

    this._startLoop();
    return { message: 'Simulation started', state: { ...this.state } };
  }

  pauseSimulation() {
    this.state.paused = true;
    const robot = this.machines.find((m) => m.id === 'ROBOT-01');
    if (robot) robot.operating_status = 'paused';

    this.emit('machine_state_change', {
      machine_id: 'ROBOT-01',
      status: 'paused',
      simulation_running: true,
      simulation_paused: true,
    });
    return { message: 'Simulation paused' };
  }

  resumeSimulation() {
    this.state.paused = false;
    const robot = this.machines.find((m) => m.id === 'ROBOT-01');
    if (robot) robot.operating_status = 'running';

    this.emit('machine_state_change', {
      machine_id: 'ROBOT-01',
      status: 'running',
      simulation_running: true,
      simulation_paused: false,
    });
    this._startLoop();
    return { message: 'Simulation resumed' };
  }

  stopSimulation() {
    this.state.running = false;
    this.state.paused = false;
    const robot = this.machines.find((m) => m.id === 'ROBOT-01');
    if (robot) robot.operating_status = 'stopped';

    this.emit('machine_state_change', {
      machine_id: 'ROBOT-01',
      status: 'stopped',
      simulation_running: false,
    });
    this._stopLoop();
    return { message: 'Simulation stopped' };
  }

  resetSimulation() {
    this.state.running = false;
    this.state.paused = false;
    this.state.emergency_stop = false;
    this.state.tick = 0;
    this.state.started_at = null;
    this.activeFaults = {};

    const robot = this.machines.find((m) => m.id === 'ROBOT-01');
    if (robot) {
      robot.operating_status = 'idle';
      robot.health_score = 100;
    }

    this.alerts.forEach((a) => {
      if (a.status === 'active' || a.status === 'acknowledged') {
        a.status = 'resolved';
        a.resolved_at = new Date().toISOString();
        a.resolution_notes = 'Resolved by simulation reset';
      }
    });

    this.jointAngles = { base: 0.0, shoulder: -30.0, elbow: 45.0, wrist: 0.0 };

    this.emit('machine_state_change', {
      machine_id: 'ROBOT-01',
      status: 'idle',
      simulation_running: false,
      health_score: 100,
    });
    this.emit('alert_update', {});
    this._stopLoop();
    return { message: 'Simulation reset complete' };
  }

  emergencyStop() {
    this.state.emergency_stop = true;
    this.state.paused = true;

    const robot = this.machines.find((m) => m.id === 'ROBOT-01');
    if (robot) robot.operating_status = 'emergency_stop';

    const fault = {
      id: Date.now(),
      machine_id: 'ROBOT-01',
      fault_type: 'emergency_stop',
      severity: 'critical',
      description: '[SIMULATED] Emergency stop activated. All robot motion halted.',
      recommended_action: 'Clear emergency condition, inspect hardware interlocks, then reset simulation.',
      status: 'active',
      created_at: new Date().toISOString(),
    };
    this.alerts.unshift(fault);

    this.emit('machine_state_change', {
      machine_id: 'ROBOT-01',
      status: 'emergency_stop',
      simulation_running: true,
      emergency_stop: true,
    });
    this.emit('fault_event', fault);
    return { message: 'Emergency stop activated (SIMULATED)' };
  }

  setSpeed(speed) {
    this.state.speed = Math.max(0.1, Math.min(5.0, Number(speed) || 1.0));
    if (this.state.running && !this.state.paused) {
      this._startLoop();
    }
    return { message: `Simulation speed set to ${this.state.speed}x`, speed: this.state.speed };
  }

  injectFault(faultType, machineId = 'ROBOT-01', severity = 'warning', valueOverride = null) {
    this.activeFaults[faultType] = {
      fault_type: faultType,
      machine_id: machineId,
      severity,
      value_override: valueOverride,
      injected_at: Date.now(),
    };

    const descriptions = {
      high_temperature: 'Motor winding temperature exceeded safe operational threshold (85°C).',
      excessive_vibration: 'Harmonic vibration detected at axis 2 bearing assembly.',
      high_motor_current: 'Inrush current surge detected on servo drive #1.',
      sensor_disconnection: 'Proximity sensor signal lost (packet timeout).',
      stale_data: 'Telemetry watchdog detected frozen sensor stream.',
    };

    const fault = {
      id: Date.now(),
      machine_id: machineId,
      fault_type: faultType,
      severity,
      description: descriptions[faultType] || `Injected fault condition: ${faultType}`,
      recommended_action: 'Inspect telemetry, check cooling, or perform calibration in Predictive Maintenance.',
      status: 'active',
      created_at: new Date().toISOString(),
    };
    this.alerts.unshift(fault);

    const robot = this.machines.find((m) => m.id === machineId);
    if (robot) {
      robot.health_score = Math.max(25, robot.health_score - 20);
      robot.operating_status = severity === 'critical' ? 'critical' : 'warning';
    }

    this.emit('fault_event', fault);
    this.emit('machine_state_change', {
      machine_id: machineId,
      status: robot ? robot.operating_status : 'warning',
      health_score: robot ? robot.health_score : 80,
    });
    return {
      message: `Fault injected: ${faultType}`,
      machine_id: machineId,
      active_faults: Object.keys(this.activeFaults),
    };
  }

  clearFaults(machineId = 'ROBOT-01') {
    this.activeFaults = {};
    this.alerts.forEach((a) => {
      if (a.machine_id === machineId && (a.status === 'active' || a.status === 'acknowledged')) {
        a.status = 'resolved';
        a.resolved_at = new Date().toISOString();
        a.resolution_notes = 'Manually cleared from simulation panel';
      }
    });

    const robot = this.machines.find((m) => m.id === machineId);
    if (robot) {
      robot.health_score = 100;
      robot.operating_status = this.state.running ? 'running' : 'idle';
    }

    this.emit('alert_update', {});
    this.emit('machine_state_change', {
      machine_id: machineId,
      status: robot ? robot.operating_status : 'idle',
      faults_cleared: true,
      health_score: 100,
    });
    return { message: 'All simulated faults cleared' };
  }

  _startLoop() {
    this._stopLoop();
    const interval = Math.max(500, 1500 / (this.state.speed || 1.0));
    this.timer = setInterval(() => this._tick(), interval);
  }

  _stopLoop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  _tick() {
    if (!this.state.running || this.state.paused || this.state.emergency_stop) {
      return;
    }

    this.tick += 1;
    this.state.tick = this.tick;

    const t = this.tick * 0.15;

    // Kinematic motion simulation
    this.jointAngles.base = Math.sin(t * 0.8) * 45;
    this.jointAngles.shoulder = -30 + Math.sin(t * 1.1) * 20;
    this.jointAngles.elbow = 45 + Math.cos(t * 0.9) * 25;
    this.jointAngles.wrist = Math.sin(t * 1.5) * 35;

    // Sensor generation
    let tempVal = 44.0 + Math.sin(t * 0.3) * 4.0 + (Math.random() - 0.5) * 1.2;
    let vibVal = 3.2 + Math.cos(t * 0.5) * 0.8 + (Math.random() - 0.5) * 0.4;
    let curVal = 7.5 + Math.sin(t * 0.7) * 2.5 + (Math.random() - 0.5) * 0.6;

    if (this.activeFaults['high_temperature']) {
      tempVal = Math.min(98.5, tempVal + 45.0);
    }
    if (this.activeFaults['excessive_vibration']) {
      vibVal = Math.min(16.8, vibVal + 9.5);
    }
    if (this.activeFaults['high_motor_current']) {
      curVal = Math.min(27.0, curVal + 16.0);
    }

    const readings = [
      {
        id: Date.now() + 1,
        machine_id: 'ROBOT-01',
        sensor_id: 'ROBOT-01_TEMP_01',
        sensor_type: 'temperature',
        reading_value: Number(tempVal.toFixed(2)),
        unit: '°C',
        connection_status: this.activeFaults['sensor_disconnection'] ? 'disconnected' : 'connected',
        source_type: 'simulation',
        timestamp: new Date().toISOString(),
      },
      {
        id: Date.now() + 2,
        machine_id: 'ROBOT-01',
        sensor_id: 'ROBOT-01_VIB_01',
        sensor_type: 'vibration',
        reading_value: Number(vibVal.toFixed(2)),
        unit: 'mm/s',
        connection_status: 'connected',
        source_type: 'simulation',
        timestamp: new Date().toISOString(),
      },
      {
        id: Date.now() + 3,
        machine_id: 'ROBOT-01',
        sensor_id: 'ROBOT-01_CUR_01',
        sensor_type: 'motor_current',
        reading_value: Number(curVal.toFixed(2)),
        unit: 'A',
        connection_status: 'connected',
        source_type: 'simulation',
        timestamp: new Date().toISOString(),
      },
      {
        id: Date.now() + 4,
        machine_id: 'ROBOT-01',
        sensor_id: 'ROBOT-01_POS_base',
        sensor_type: 'position',
        reading_value: Number(this.jointAngles.base.toFixed(2)),
        unit: 'deg',
        connection_status: 'connected',
        source_type: 'simulation',
        timestamp: new Date().toISOString(),
      },
      {
        id: Date.now() + 5,
        machine_id: 'ROBOT-01',
        sensor_id: 'ROBOT-01_FORCE_01',
        sensor_type: 'force',
        reading_value: Number((5.0 + Math.sin(t) * 1.5).toFixed(2)),
        unit: 'N',
        connection_status: 'connected',
        source_type: 'simulation',
        timestamp: new Date().toISOString(),
      },
    ];

    // Keep history
    this.readingsHistory.push(...readings);
    if (this.readingsHistory.length > 300) {
      this.readingsHistory = this.readingsHistory.slice(-300);
    }

    // Broadcast readings
    this.emit('sensor_update', { readings });

    // Periodic production increment
    if (this.tick % 5 === 0) {
      this.totalProducts += 1;
      const isDefect = Math.random() < (this.activeFaults['high_temperature'] ? 0.35 : 0.05);
      if (isDefect) {
        this.productsRejected += 1;
      } else {
        this.productsPassed += 1;
      }

      const insp = {
        id: Date.now(),
        product_id: `PRD-${1000 + this.totalProducts}`,
        machine_id: 'ROBOT-01',
        inspection_mode: 'ai_vision',
        result: isDefect ? 'defect' : 'pass',
        defect_type: isDefect ? 'surface_imperfection' : null,
        confidence_score: Number((0.91 + Math.random() * 0.08).toFixed(3)),
        model_version: 'YOLOv8-Industrial-v2.1',
        inspection_duration_ms: Math.floor(45 + Math.random() * 25),
        notes: isDefect ? 'Autonomous camera detected deviation' : 'Part verified conforming',
        created_at: new Date().toISOString(),
      };
      this.inspections.unshift(insp);
      if (this.inspections.length > 50) this.inspections.pop();

      this.emit('inspection_result', insp);
      this.emit('production_event', {
        id: Date.now(),
        machine_id: 'ROBOT-01',
        product_id: insp.product_id,
        event_type: 'product_inspected',
      });
    }
  }

  // API query handlers
  getSimulationState() {
    return {
      ...this.state,
      machine_state: {
        id: 'ROBOT-01',
        status: this.state.running ? (this.state.paused ? 'paused' : 'running') : 'idle',
        simulation_running: this.state.running,
        health_score: this.machines.find((m) => m.id === 'ROBOT-01')?.health_score || 100,
        joint_angles: { ...this.jointAngles },
      },
    };
  }

  getMachines() {
    return [...this.machines];
  }

  getMachine(id) {
    const m = this.machines.find((m) => m.id === id);
    return m ? { ...m } : null;
  }

  getMachineSensors(id) {
    return this.sensors.filter((s) => s.machine_id === id);
  }

  getSensorReadings(params = {}) {
    let list = this.readingsHistory.length > 0 ? this.readingsHistory : this.sensors.map((s) => ({
      id: s.id,
      machine_id: s.machine_id,
      sensor_id: s.id,
      reading_value: s.last_reading,
      unit: s.unit,
      source_type: 'simulation',
      timestamp: new Date().toISOString(),
    }));

    if (params.machine_id) list = list.filter((r) => r.machine_id === params.machine_id);
    if (params.sensor_type) list = list.filter((r) => r.sensor_type === params.sensor_type);
    const limit = Number(params.limit) || 100;
    return list.slice(-limit);
  }

  getAlerts(params = {}) {
    let res = [...this.alerts];
    if (params.machine_id) res = res.filter((a) => a.machine_id === params.machine_id);
    if (params.status) res = res.filter((a) => a.status === params.status);
    const limit = Number(params.limit) || 50;
    return res.slice(0, limit);
  }

  acknowledgeAlert(id, acknowledgedBy = 'operator') {
    const a = this.alerts.find((item) => item.id === Number(id) || item.id === id);
    if (a) {
      a.status = 'acknowledged';
      a.acknowledged_by = acknowledgedBy;
      a.acknowledged_at = new Date().toISOString();
      this.emit('alert_update', {});
    }
    return { message: 'Alert acknowledged', alert_id: id };
  }

  resolveAlert(id, notes = '') {
    const a = this.alerts.find((item) => item.id === Number(id) || item.id === id);
    if (a) {
      a.status = 'resolved';
      a.resolved_at = new Date().toISOString();
      a.resolution_notes = notes;
      this.emit('alert_update', {});
    }
    return { message: 'Alert resolved', alert_id: id };
  }

  getInspections(params = {}) {
    let res = [...this.inspections];
    if (params.machine_id) res = res.filter((i) => i.machine_id === params.machine_id);
    if (params.result) res = res.filter((i) => i.result === params.result);
    const limit = Number(params.limit) || 50;
    return res.slice(0, limit);
  }

  createInspection(data) {
    const insp = {
      id: Date.now(),
      product_id: data.product_id || `PRD-${Date.now().toString().slice(-4)}`,
      machine_id: data.machine_id || 'ROBOT-01',
      inspection_mode: data.inspection_mode || 'ai_vision',
      result: data.result || 'pass',
      defect_type: data.defect_type || null,
      confidence_score: data.confidence_score || 0.95,
      model_version: 'YOLOv8-Industrial-v2.1',
      inspection_duration_ms: Math.floor(45 + Math.random() * 20),
      notes: data.notes || '',
      created_at: new Date().toISOString(),
    };
    this.inspections.unshift(insp);
    this.totalProducts += 1;
    if (insp.result === 'defect') this.productsRejected += 1;
    else this.productsPassed += 1;

    this.emit('inspection_result', insp);
    return insp;
  }

  getQualitySummary(machineId) {
    const total = this.inspections.length || 1;
    const passed = this.inspections.filter((i) => i.result === 'pass').length;
    const defects = this.inspections.filter((i) => i.result === 'defect').length;
    return {
      machine_id: machineId || 'ROBOT-01',
      total_inspected: total,
      passed,
      defects,
      defect_rate: Number(((defects / total) * 100).toFixed(2)),
      defect_types: {
        scratch: 1,
        dent: 1,
        surface_imperfection: Math.max(0, defects - 2),
      },
    };
  }

  getProductionSummary() {
    const total = this.totalProducts;
    const inspected = this.productsPassed + this.productsRejected;
    const defectRate = inspected > 0 ? (this.productsRejected / inspected) * 100 : 0.0;
    const activeAlerts = this.alerts.filter((a) => a.status === 'active' || a.status === 'acknowledged').length;

    return {
      total_products: total,
      products_inspected: inspected,
      products_passed: this.productsPassed,
      products_rejected: this.productsRejected,
      defect_rate: Number(defectRate.toFixed(2)),
      active_alerts: activeAlerts,
      machines_running: this.state.running ? 1 : 0,
      machines_total: 2,
      machines_warning: activeAlerts > 0 ? 1 : 0,
      oee: 89.4,
      availability: 92.5,
      performance: 96.0,
      quality: Number((100 - defectRate).toFixed(1)),
    };
  }

  getProductionEvents() {
    return [
      { id: 1, machine_id: 'ROBOT-01', product_id: 'PRD-1042', event_type: 'product_completed', event_timestamp: new Date().toISOString() },
      { id: 2, machine_id: 'ROBOT-01', product_id: 'PRD-1041', event_type: 'product_inspected', event_timestamp: new Date(Date.now() - 30000).toISOString() },
      { id: 3, machine_id: 'ROBOT-01', product_id: 'PRD-1040', event_type: 'cycle_start', event_timestamp: new Date(Date.now() - 60000).toISOString() },
    ];
  }

  getMaintenanceRecords() {
    return [...this.maintenanceRecords];
  }

  createMaintenanceRecord(data) {
    const rec = {
      id: Date.now(),
      machine_id: data.machine_id || 'ROBOT-01',
      technician_name: data.technician_name || 'Operator',
      maintenance_type: data.maintenance_type || 'corrective',
      description: data.description || 'Maintenance completed',
      parts_replaced: data.parts_replaced || 'None',
      cost: Number(data.cost) || 0,
      downtime_minutes: Number(data.downtime_minutes) || 15,
      created_at: new Date().toISOString(),
    };
    this.maintenanceRecords.unshift(rec);
    return rec;
  }

  getAnalyticsSummary() {
    const activeCount = this.alerts.filter((a) => a.status === 'active').length;
    return {
      sensor_readings_count: 14200 + this.tick * 5,
      fault_events_count: this.alerts.length,
      inspections_count: this.inspections.length,
      maintenance_records_count: this.maintenanceRecords.length,
      production_events_count: this.totalProducts,
      avg_health_score: activeCount > 0 ? 82.5 : 98.0,
      most_common_fault: 'high_temperature',
      defect_rate: Number(((this.productsRejected / Math.max(1, this.productsPassed + this.productsRejected)) * 100).toFixed(2)),
    };
  }

  getFaultFrequency() {
    return [
      { fault_type: 'high_temperature', count: 8 },
      { fault_type: 'excessive_vibration', count: 5 },
      { fault_type: 'high_motor_current', count: 3 },
      { fault_type: 'sensor_disconnection', count: 2 },
    ];
  }

  getSensorTrends(type = 'temperature', minutes = 30) {
    const now = Date.now();
    const points = [];
    const count = 20;
    const step = (minutes * 60 * 1000) / count;
    const base = type === 'temperature' ? 45.0 : type === 'vibration' ? 3.5 : 8.0;

    for (let i = count; i >= 0; i--) {
      points.push({
        timestamp: new Date(now - i * step).toISOString(),
        reading_value: Number((base + Math.sin(i * 0.5) * (base * 0.1) + (Math.random() - 0.5)).toFixed(2)),
      });
    }
    return {
      sensor_type: type,
      timeframe_minutes: minutes,
      data_points: points,
    };
  }
}

export const mockSimulator = new MockSimulatorEngine();
