"""
SmartFactory 4.0 - MQTT Service
Handles IoT telemetry publication and subscription with Eclipse Mosquitto or external brokers.
Operates gracefully in standalone simulation-only mode when broker is unavailable.
"""
import json
import logging
from typing import Optional
from datetime import datetime, timezone

from ..core.config import settings

logger = logging.getLogger(__name__)

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False
    logger.warning("[MQTT] paho-mqtt package not installed. Operating in simulation-only mode.")


class MQTTService:
    def __init__(self):
        self.client: Optional[object] = None
        self.connected: bool = False
        self.enabled: bool = settings.mqtt_enabled and MQTT_AVAILABLE

    def start(self):
        """Initialize and connect MQTT client if enabled."""
        if not self.enabled:
            logger.info("[MQTT] Disabled in settings or library unavailable. Using simulation pipeline.")
            return

        try:
            self.client = mqtt.Client(client_id="smartfactory-backend-service")
            if settings.mqtt_username and settings.mqtt_password:
                self.client.username_pw_set(settings.mqtt_username, settings.mqtt_password)

            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message

            logger.info(f"[MQTT] Connecting to broker at {settings.mqtt_broker_host}:{settings.mqtt_broker_port}...")
            self.client.connect_async(settings.mqtt_broker_host, settings.mqtt_broker_port, 60)
            self.client.loop_start()
        except Exception as e:
            logger.warning(f"[MQTT] Could not connect to broker ({e}). Fallback to local simulation mode.")
            self.connected = False

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.connected = True
            logger.info("[MQTT] Successfully connected to MQTT Broker")
            # Subscribe to command and status topics
            prefix = settings.mqtt_topic_prefix
            client.subscribe(f"{prefix}/machines/+/commands")
            client.subscribe(f"{prefix}/machines/+/telemetry")
        else:
            self.connected = False
            logger.warning(f"[MQTT] Connection returned code {rc}")

    def _on_disconnect(self, client, userdata, rc):
        self.connected = False
        logger.info(f"[MQTT] Disconnected from broker (rc={rc}). Reconnecting in background...")

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
            topic = msg.topic
            logger.debug(f"[MQTT] Received message on {topic}: {payload}")
            # Extension point: dispatch external sensor telemetry directly into pipeline
        except Exception as e:
            logger.error(f"[MQTT] Error parsing message on {msg.topic}: {e}")

    def publish_telemetry(self, machine_id: str, sensor_data: dict):
        """Publish sensor telemetry to MQTT topic."""
        if not self.connected or not self.client:
            return
        topic = f"{settings.mqtt_topic_prefix}/machines/{machine_id}/telemetry"
        payload = json.dumps({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **sensor_data
        })
        self.client.publish(topic, payload, qos=0)

    def publish_alert(self, machine_id: str, alert_data: dict):
        """Publish alert to MQTT topic."""
        if not self.connected or not self.client:
            return
        topic = f"{settings.mqtt_topic_prefix}/machines/{machine_id}/alerts"
        self.client.publish(topic, json.dumps(alert_data), qos=1)

    def stop(self):
        """Stop MQTT client loop."""
        if self.client:
            try:
                self.client.loop_stop()
                self.client.disconnect()
            except Exception:
                pass


mqtt_service = MQTTService()
