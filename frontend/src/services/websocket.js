/**
 * SmartFactory 4.0 - WebSocket Client Service
 * Single shared connection pattern with auto-reconnection and pub-sub listener architecture.
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.statusListeners = new Set();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 10000;
    this.url = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws');
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this._notifyStatus('connected');
        console.log('[WS] Connected to SmartFactory 4.0 backend');
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
        console.warn('[WS] Connection error');
        this.isConnected = false;
        this._notifyStatus('error');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this._notifyStatus('disconnected');
        this._scheduleReconnect();
      };
    } catch (err) {
      console.warn('[WS] Connection attempt failed:', err);
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    console.log(`[WS] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this.reconnectAttempts})...`);
    setTimeout(() => {
      this.connect();
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
  }
}

export const wsService = new WebSocketService();
