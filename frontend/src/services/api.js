/**
 * SmartFactory 4.0 - API Client
 * Centralized service for REST calls to FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');

async function request(endpoint, options = {}) {
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
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP Error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
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
};
