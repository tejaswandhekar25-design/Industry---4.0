"""
SmartFactory 4.0 - WebSocket Manager
Manages WebSocket connections and broadcasts real-time events to connected clients.
Uses a single shared connection service pattern.
"""
import json
import logging
from typing import Set, Dict, Any
from fastapi import WebSocket
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages all active WebSocket connections.
    Broadcasts structured events to all connected frontend clients.
    """

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._event_counter = 0

    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"[WS] Client connected. Total: {len(self.active_connections)}")

        # Send connection confirmation
        await self._send_to(websocket, {
            "type": "connection_established",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Connected to SmartFactory 4.0 real-time feed"
        })

    def disconnect(self, websocket: WebSocket):
        """Remove a disconnected WebSocket."""
        self.active_connections.discard(websocket)
        logger.info(f"[WS] Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Broadcast an event to all connected clients."""
        self._event_counter += 1
        message = {
            "type": event_type,
            "data": data,
            "event_id": self._event_counter,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        disconnected = set()
        for connection in self.active_connections.copy():
            try:
                await self._send_to(connection, message)
            except Exception as e:
                logger.warning(f"[WS] Failed to send to client: {e}")
                disconnected.add(connection)

        # Clean up failed connections
        for conn in disconnected:
            self.active_connections.discard(conn)

    async def broadcast_sensor_readings(self, readings: list):
        """Broadcast sensor readings update."""
        await self.broadcast("sensor_update", {"readings": readings})

    async def broadcast_machine_state(self, machine_id: str, state: dict):
        """Broadcast machine state change."""
        await self.broadcast("machine_state_change", {
            "machine_id": machine_id,
            **state
        })

    async def broadcast_fault(self, fault_data: dict):
        """Broadcast a new fault event."""
        await self.broadcast("fault_event", fault_data)

    async def broadcast_inspection(self, inspection_data: dict):
        """Broadcast an inspection result."""
        await self.broadcast("inspection_result", inspection_data)

    async def broadcast_production(self, production_data: dict):
        """Broadcast a production event."""
        await self.broadcast("production_event", production_data)

    async def broadcast_alert_update(self, alert_data: dict):
        """Broadcast alert status change (acknowledge/resolve)."""
        await self.broadcast("alert_update", alert_data)

    async def _send_to(self, websocket: WebSocket, data: dict):
        """Send JSON data to a single WebSocket."""
        await websocket.send_json(data)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# Global WebSocket manager instance
ws_manager = WebSocketManager()
