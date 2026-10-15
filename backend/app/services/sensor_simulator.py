"""
SmartFactory 4.0 - Sensor Simulator Service
Generates realistic simulated sensor data for the demo factory.
Provides configurable normal ranges, drift, noise, and fault injection.
"""
import random
import math
import time
from datetime import datetime, timezone
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class SensorSimulator:
    """
    Generates simulated sensor readings for demo/development.
    This is NOT real sensor hardware - all values are generated in software.
    """

    def __init__(self, seed: Optional[int] = None):
        self.rng = random.Random(seed)
        self.start_time = time.time()
        self.tick = 0

        # Active fault injections
        self.active_faults: Dict[str, dict] = {}

        # Sensor baselines (demo values, not real industrial limits)
        self.baselines = {
            "temperature": {"base": 45.0, "noise": 2.0, "drift_rate": 0.05, "unit": "°C"},
            "vibration": {"base": 3.5, "noise": 0.5, "drift_rate": 0.02, "unit": "mm/s"},
            "motor_current": {"base": 8.0, "noise": 1.0, "drift_rate": 0.03, "unit": "A"},
            "position": {"base": 0.0, "noise": 0.1, "drift_rate": 0.0, "unit": "deg"},
            "proximity": {"base": 0.0, "noise": 0.0, "drift_rate": 0.0, "unit": "bool"},
            "force": {"base": 5.0, "noise": 0.3, "drift_rate": 0.01, "unit": "N"},
        }

        # Robot joint angles for position simulation
        self.joint_angles = {
            "base": 0.0,
            "shoulder": -30.0,
            "elbow": 45.0,
            "wrist": 0.0,
        }

        # Track current values for smooth transitions
        self._current_values: Dict[str, float] = {}
        self._disconnected_sensors: set = set()
        self._stale_sensors: Dict[str, float] = {}

    def inject_fault(self, fault_type: str, machine_id: str = "ROBOT-01",
                     value_override: Optional[float] = None):
        """Inject a simulated fault condition."""
        fault_configs = {
            "high_temperature": {
                "sensor_type": "temperature",
                "target_value": value_override or 95.0,
                "ramp_rate": 5.0,
            },
            "excessive_vibration": {
                "sensor_type": "vibration",
                "target_value": value_override or 15.0,
                "ramp_rate": 2.0,
            },
            "high_motor_current": {
                "sensor_type": "motor_current",
                "target_value": value_override or 25.0,
                "ramp_rate": 3.0,
            },
            "sensor_disconnection": {
                "sensor_type": "temperature",
                "disconnect": True,
            },
            "stale_data": {
                "sensor_type": "vibration",
                "stale": True,
            },
        }

        if fault_type in fault_configs:
            config = fault_configs[fault_type]
            config["machine_id"] = machine_id
            config["injected_at"] = time.time()
            self.active_faults[fault_type] = config

            if config.get("disconnect"):
                sensor_key = f"{machine_id}_{config['sensor_type']}"
                self._disconnected_sensors.add(sensor_key)
                logger.info(f"[SIMULATOR] Injected sensor disconnection: {sensor_key}")

            if config.get("stale"):
                sensor_key = f"{machine_id}_{config['sensor_type']}"
                current = self._current_values.get(sensor_key, 
                    self.baselines[config['sensor_type']]['base'])
                self._stale_sensors[sensor_key] = current
                logger.info(f"[SIMULATOR] Injected stale data: {sensor_key}")

            logger.info(f"[SIMULATOR] Fault injected: {fault_type} on {machine_id}")
        else:
            logger.warning(f"[SIMULATOR] Unknown fault type: {fault_type}")

    def clear_fault(self, fault_type: str, machine_id: str = "ROBOT-01"):
        """Clear a specific simulated fault."""
        if fault_type in self.active_faults:
            config = self.active_faults[fault_type]
            sensor_key = f"{machine_id}_{config.get('sensor_type', '')}"
            self._disconnected_sensors.discard(sensor_key)
            self._stale_sensors.pop(sensor_key, None)
            del self.active_faults[fault_type]
            logger.info(f"[SIMULATOR] Fault cleared: {fault_type}")

    def clear_all_faults(self):
        """Clear all simulated faults."""
        self.active_faults.clear()
        self._disconnected_sensors.clear()
        self._stale_sensors.clear()
        self._current_values.clear()
        logger.info("[SIMULATOR] All faults cleared")

    def generate_reading(self, sensor_type: str, sensor_id: str,
                         machine_id: str = "ROBOT-01") -> dict:
        """
        Generate a single sensor reading.
        Returns a dict with value, unit, timestamp, connection_status.
        """
        self.tick += 1
        sensor_key = f"{machine_id}_{sensor_type}"
        elapsed = time.time() - self.start_time

        # Check disconnection
        if sensor_key in self._disconnected_sensors:
            return {
                "sensor_id": sensor_id,
                "machine_id": machine_id,
                "sensor_type": sensor_type,
                "reading_value": None,
                "unit": self.baselines.get(sensor_type, {}).get("unit", ""),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "connection_status": "disconnected",
                "source_type": "simulated",
            }

        # Check stale data
        if sensor_key in self._stale_sensors:
            return {
                "sensor_id": sensor_id,
                "machine_id": machine_id,
                "sensor_type": sensor_type,
                "reading_value": self._stale_sensors[sensor_key],
                "unit": self.baselines.get(sensor_type, {}).get("unit", ""),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "connection_status": "stale",
                "source_type": "simulated",
            }

        config = self.baselines.get(sensor_type, {"base": 50, "noise": 1, "drift_rate": 0, "unit": ""})
        base = config["base"]
        noise = config["noise"]
        drift = config["drift_rate"]

        # Calculate value with natural variation
        # Add slow sinusoidal drift for realism
        drift_component = drift * math.sin(elapsed * 0.01) * 10
        noise_component = self.rng.gauss(0, noise)

        # Add slight time-based variation
        time_variation = math.sin(elapsed * 0.05) * noise * 0.5

        value = base + drift_component + noise_component + time_variation

        # Apply fault overrides with smooth ramping
        for fault_type, fault_config in self.active_faults.items():
            if fault_config.get("sensor_type") == sensor_type and \
               fault_config.get("machine_id", "ROBOT-01") == machine_id:
                target = fault_config.get("target_value", base)
                ramp = fault_config.get("ramp_rate", 1.0)
                fault_elapsed = time.time() - fault_config.get("injected_at", time.time())

                # Smooth ramp toward target
                current = self._current_values.get(sensor_key, base)
                if current < target:
                    value = min(current + ramp * (fault_elapsed * 0.1 + 0.5), target)
                else:
                    value = max(current - ramp * (fault_elapsed * 0.1 + 0.5), target)

                # Add fault-mode noise
                value += self.rng.gauss(0, noise * 0.5)

        # Special handling for position sensor (joint angles)
        if sensor_type == "position":
            joint_name = sensor_id.split("_")[-1] if "_" in sensor_id else "base"
            base_angle = self.joint_angles.get(joint_name, 0.0)
            value = base_angle + math.sin(elapsed * 0.3) * 15 + self.rng.gauss(0, 0.5)

        # Special handling for proximity (binary-ish)
        if sensor_type == "proximity":
            value = 1.0 if math.sin(elapsed * 0.2) > 0.3 else 0.0

        # Clamp and round
        value = round(max(0, value), 2)
        self._current_values[sensor_key] = value

        return {
            "sensor_id": sensor_id,
            "machine_id": machine_id,
            "sensor_type": sensor_type,
            "reading_value": value,
            "unit": config["unit"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "connection_status": "connected",
            "source_type": "simulated",
        }

    def generate_all_readings(self, machine_id: str = "ROBOT-01") -> list:
        """Generate readings for all sensors of a machine."""
        sensor_configs = [
            ("temperature", f"{machine_id}_TEMP_01"),
            ("vibration", f"{machine_id}_VIB_01"),
            ("motor_current", f"{machine_id}_CUR_01"),
            ("position", f"{machine_id}_POS_base"),
            ("position", f"{machine_id}_POS_shoulder"),
            ("position", f"{machine_id}_POS_elbow"),
            ("position", f"{machine_id}_POS_wrist"),
            ("proximity", f"{machine_id}_PROX_01"),
            ("force", f"{machine_id}_FORCE_01"),
        ]

        readings = []
        for sensor_type, sensor_id in sensor_configs:
            reading = self.generate_reading(sensor_type, sensor_id, machine_id)
            readings.append(reading)

        return readings

    def get_machine_state(self, machine_id: str = "ROBOT-01") -> dict:
        """Get aggregated machine state from current sensor values."""
        has_faults = any(
            f.get("machine_id", "ROBOT-01") == machine_id
            for f in self.active_faults.values()
        )

        has_disconnected = any(
            k.startswith(machine_id) for k in self._disconnected_sensors
        )

        if has_disconnected:
            status = "warning"
        elif has_faults:
            # Check severity
            critical_faults = ["high_temperature", "excessive_vibration", "high_motor_current"]
            has_critical = any(
                ft in critical_faults and f.get("machine_id") == machine_id
                for ft, f in self.active_faults.items()
            )
            status = "critical" if has_critical else "warning"
        else:
            status = "running"

        return {
            "machine_id": machine_id,
            "status": status,
            "active_faults": list(self.active_faults.keys()),
            "disconnected_sensors": [s for s in self._disconnected_sensors if s.startswith(machine_id)],
            "stale_sensors": [s for s in self._stale_sensors if s.startswith(machine_id)],
            "joint_angles": self.joint_angles.copy(),
            "tick": self.tick,
        }


# Global simulator instance
simulator = SensorSimulator()
