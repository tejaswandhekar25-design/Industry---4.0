/**
 * SmartFactory 4.0 - API Client
 * Centralized service for REST calls to FastAPI backend with automatic
 * in-browser simulation fallback for static deployments (e.g. Vercel).
 */
import { mockSimulator } from './mockSimulator';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');

let isBackendAvailable = null;

function handleMockRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const [path, queryString] = endpoint.split('?');
  const query = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    for (const [k, v] of searchParams.entries()) {
      query[k] = v;
    }
  }

  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

  // Health
  if (path === '/health') {
    return Promise.resolve({
      status: 'healthy',
      app: 'SmartFactory 4.0 (Autonomous Simulation Mode)',
      version: '1.0.0',
      simulation: mockSimulator.getSimulationState(),
      websocket_clients: 1,
      mqtt_enabled: false,
      timestamp: new Date().toISOString(),
    });
  }

  // Simulation Controls
  if (path === '/simulation/state') {
    return Promise.resolve(mockSimulator.getSimulationState());
  }
  if (path === '/simulation/start' && method === 'POST') {
    return Promise.resolve(mockSimulator.startSimulation());
  }
  if (path === '/simulation/pause' && method === 'POST') {
    return Promise.resolve(mockSimulator.pauseSimulation());
  }
  if (path === '/simulation/resume' && method === 'POST') {
    return Promise.resolve(mockSimulator.resumeSimulation());
  }
  if (path === '/simulation/stop' && method === 'POST') {
    return Promise.resolve(mockSimulator.stopSimulation());
  }
  if (path === '/simulation/reset' && method === 'POST') {
    return Promise.resolve(mockSimulator.resetSimulation());
  }
  if (path === '/simulation/emergency-stop' && method === 'POST') {
    return Promise.resolve(mockSimulator.emergencyStop());
  }
  if (path === '/simulation/speed' && method === 'POST') {
    return Promise.resolve(mockSimulator.setSpeed(query.speed || 1.0));
  }
  if (path === '/simulation/faults' && method === 'POST') {
    return Promise.resolve(
      mockSimulator.injectFault(body.fault_type, body.machine_id, body.severity, body.value_override)
    );
  }
  if (path === '/simulation/faults/clear' && method === 'POST') {
    return Promise.resolve(mockSimulator.clearFaults(query.machine_id || 'ROBOT-01'));
  }

  // Machines
  if (path === '/machines' && method === 'GET') {
    return Promise.resolve(mockSimulator.getMachines());
  }
  if (path.startsWith('/machines/') && path.endsWith('/sensors') && method === 'GET') {
    const machineId = path.split('/')[2];
    return Promise.resolve(mockSimulator.getMachineSensors(machineId));
  }
  if (path.startsWith('/machines/') && path.endsWith('/status') && method === 'PATCH') {
    const machineId = path.split('/')[2];
    const machine = mockSimulator.getMachine(machineId);
    if (machine) {
      if (body.operating_status) machine.operating_status = body.operating_status;
      if (body.health_score !== undefined) machine.health_score = body.health_score;
    }
    return Promise.resolve(machine);
  }
  if (path.startsWith('/machines/') && method === 'GET') {
    const machineId = path.split('/')[2];
    return Promise.resolve(mockSimulator.getMachine(machineId));
  }

  // Sensors & Telemetry
  if (path === '/sensors/readings') {
    return Promise.resolve(mockSimulator.getSensorReadings(query));
  }
  if (path.startsWith('/sensors/') && path.endsWith('/thresholds') && method === 'PATCH') {
    const sensorId = path.split('/')[2];
    const sensor = mockSimulator.sensors.find((s) => s.id === sensorId);
    if (sensor) {
      if (body.warning_threshold !== undefined) sensor.warning_threshold = body.warning_threshold;
      if (body.critical_threshold !== undefined) sensor.critical_threshold = body.critical_threshold;
    }
    return Promise.resolve({ message: 'Thresholds updated', sensor_id: sensorId });
  }
  if (path.startsWith('/sensors/') && method === 'GET') {
    const sensorId = path.split('/')[2];
    const sensor = mockSimulator.sensors.find((s) => s.id === sensorId);
    return Promise.resolve(sensor || {});
  }

  // Alerts & Faults
  if (path === '/alerts' && method === 'GET') {
    return Promise.resolve(mockSimulator.getAlerts(query));
  }
  if (path.startsWith('/alerts/') && path.endsWith('/acknowledge') && method === 'POST') {
    const alertId = path.split('/')[2];
    return Promise.resolve(mockSimulator.acknowledgeAlert(alertId, body.acknowledged_by));
  }
  if (path.startsWith('/alerts/') && path.endsWith('/resolve') && method === 'POST') {
    const alertId = path.split('/')[2];
    return Promise.resolve(mockSimulator.resolveAlert(alertId, body.resolution_notes));
  }

  // Quality Inspections
  if (path === '/quality/inspections' && method === 'GET') {
    return Promise.resolve(mockSimulator.getInspections(query));
  }
  if (path === '/quality/inspections' && method === 'POST') {
    return Promise.resolve(mockSimulator.createInspection(body));
  }
  if (path === '/quality/summary') {
    return Promise.resolve(mockSimulator.getQualitySummary(query.machine_id));
  }

  // Production
  if (path === '/production/summary') {
    return Promise.resolve(mockSimulator.getProductionSummary());
  }
  if (path === '/production/events') {
    return Promise.resolve(mockSimulator.getProductionEvents(query));
  }

  // Maintenance
  if (path === '/maintenance' && method === 'GET') {
    return Promise.resolve(mockSimulator.getMaintenanceRecords(query));
  }
  if (path === '/maintenance' && method === 'POST') {
    return Promise.resolve(mockSimulator.createMaintenanceRecord(body));
  }

  // Analytics
  if (path === '/analytics/summary') {
    return Promise.resolve(mockSimulator.getAnalyticsSummary());
  }
  if (path === '/analytics/fault-frequency') {
    return Promise.resolve(mockSimulator.getFaultFrequency());
  }
  if (path === '/analytics/sensor-trends') {
    return Promise.resolve(mockSimulator.getSensorTrends(query.sensor_type, query.minutes));
  }

  // Default fallback
  console.warn(`[Mock API] Unhandled route: ${method} ${path}`);
  return Promise.resolve({ message: 'Success (simulation mode)' });
}

async function request(endpoint, options = {}) {
  // If backend is already detected as unavailable, resolve immediately with local simulator
  if (isBackendAvailable === false) {
    return handleMockRequest(endpoint, options);
  }

  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      console.warn(`[API] Server returned ${res.status} for ${endpoint}. Switching to built-in simulation engine.`);
      isBackendAvailable = false;
      return handleMockRequest(endpoint, options);
    }
    isBackendAvailable = true;
    return await res.json();
  } catch (error) {
    console.warn(`[API] Network request failed for ${endpoint}. Switching to built-in simulation engine.`);
    isBackendAvailable = false;
    return handleMockRequest(endpoint, options);
  }
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Machines
  getMachines: () => request('/machines'),
  getMachine: (id) => request(`/machines/${id}`),
  getMachineSensors: (id) => request(`/machines/${id}/sensors`),
  updateMachineStatus: (id, status, health_score) =>
    request(`/machines/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ operating_status: status, health_score }),
    }),

  // Sensors & Telemetry
  getSensorReadings: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/sensors/readings${query ? `?${query}` : ''}`);
  },
  getSensor: (id) => request(`/sensors/${id}`),
  updateSensorThresholds: (id, thresholds) =>
    request(`/sensors/${id}/thresholds`, {
      method: 'PATCH',
      body: JSON.stringify(thresholds),
    }),

  // Alerts & Faults
  getAlerts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/alerts${query ? `?${query}` : ''}`);
  },
  acknowledgeAlert: (id, acknowledgedBy = 'operator') =>
    request(`/alerts/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
    }),
  resolveAlert: (id, notes = '') =>
    request(`/alerts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_notes: notes }),
    }),

  // Quality Inspections
  getInspections: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/quality/inspections${query ? `?${query}` : ''}`);
  },
  createInspection: (data) =>
    request('/quality/inspections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getQualitySummary: (machineId) =>
    request(`/quality/summary${machineId ? `?machine_id=${machineId}` : ''}`),

  // Production
  getProductionSummary: () => request('/production/summary'),
  getProductionEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/production/events${query ? `?${query}` : ''}`);
  },

  // Maintenance
  getMaintenanceRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/maintenance${query ? `?${query}` : ''}`);
  },
  createMaintenanceRecord: (data) =>
    request('/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Analytics
  getAnalyticsSummary: () => request('/analytics/summary'),
  getFaultFrequency: () => request('/analytics/fault-frequency'),
  getSensorTrends: (sensorType = 'temperature', minutes = 30) =>
    request(`/analytics/sensor-trends?sensor_type=${sensorType}&minutes=${minutes}`),

  // Simulation Controls
  getSimulationState: () => request('/simulation/state'),
  startSimulation: () => request('/simulation/start', { method: 'POST' }),
  pauseSimulation: () => request('/simulation/pause', { method: 'POST' }),
  resumeSimulation: () => request('/simulation/resume', { method: 'POST' }),
  stopSimulation: () => request('/simulation/stop', { method: 'POST' }),
  resetSimulation: () => request('/simulation/reset', { method: 'POST' }),
  emergencyStop: () => request('/simulation/emergency-stop', { method: 'POST' }),
  setSpeed: (speed) =>
    request(`/simulation/speed?speed=${speed}`, { method: 'POST' }),
  injectFault: (faultType, machineId = 'ROBOT-01', severity = 'warning', valueOverride = null) =>
    request('/simulation/faults', {
      method: 'POST',
      body: JSON.stringify({
        fault_type: faultType,
        machine_id: machineId,
        severity,
        value_override: valueOverride,
      }),
    }),
  clearFaults: (machineId = 'ROBOT-01') =>
    request(`/simulation/faults/clear?machine_id=${machineId}`, { method: 'POST' }),

  // Exports
  getExportUrl: (type) => `${API_BASE}/analytics/export/${type}/csv`,
};
