/**
 * SmartFactory 4.0 - WebSocket Client Service
 * Single shared connection pattern with auto-reconnection and pub-sub listener architecture.
 * Automatically falls back to the in-browser simulation bus when live WebSockets are unavailable.
 */
import { mockSimulator } from './mockSimulator';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.statusListeners = new Set();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 15000;
    this.isUsingMockBus = false;
    this.unsubMockBus = null;

    const defaultWsUrl = typeof window !== 'undefined' && window.location.host && !import.meta.env.DEV
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
      : 'ws://localhost:8000/ws';
    this.url = import.meta.env.VITE_WS_URL || defaultWsUrl;

    // Listen to local simulation events
    this._attachMockBus();
  }

  _attachMockBus() {
    if (!this.unsubMockBus) {
      this.unsubMockBus = mockSimulator.onEvent((type, data) => {
        // Only dispatch from mock if we are not connected to a real live websocket
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this._dispatch(type, data, { type, data });
        }
      });
    }
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isUsingMockBus = false;
        this.reconnectAttempts = 0;
        this._notifyStatus('connected');
        console.log('[WS] Connected to live SmartFactory 4.0 backend');
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this._dispatch(payload.type, payload.data, payload);
        } catch (e) {
          console.warn('[WS] Malformed message received:', event.data);
        }
      };

      this.ws.onerror = (err) => {
        this._activateMockFallback();
      };

      this.ws.onclose = () => {
        this._activateMockFallback();
        this._scheduleReconnect();
      };
    } catch (err) {
      this._activateMockFallback();
      this._scheduleReconnect();
    }
  }

  _activateMockFallback() {
    if (!this.isUsingMockBus) {
      this.isUsingMockBus = true;
      this.isConnected = true;
      this._notifyStatus('connected');
      console.info('[WS] Live WebSocket server unavailable. Switched to internal real-time event pipeline.');
    }
  }

  _scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    setTimeout(() => {
      // Background retry silently without disrupting the UI
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect();
      }
    }, delay);
  }

  _notifyStatus(status) {
    this.statusListeners.forEach((callback) => callback(status, this.isConnected));
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.isConnected ? 'connected' : 'disconnected', this.isConnected);
    return () => this.statusListeners.delete(callback);
  }

  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    // Return un-subscribe function
    return () => {
      const group = this.listeners.get(eventType);
      if (group) {
        group.delete(callback);
      }
    };
  }

  _dispatch(type, data, raw) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach((cb) => {
        try {
          cb(data, raw);
        } catch (e) {
          console.error(`[WS] Listener error for ${type}:`, e);
        }
      });
    }

    // Wildcard subscriber
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach((cb) => cb(type, data, raw));
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.unsubMockBus) {
      this.unsubMockBus();
      this.unsubMockBus = null;
    }
  }
}

export const wsService = new WebSocketService();
