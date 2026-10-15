"""
SmartFactory 4.0 - Fault Detection Service
Rule-based abnormal condition detection with alert deduplication.
This is a configurable threshold-based system, not AI/ML.
Extension point provided for statistical anomaly detection.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List
from sqlalchemy.orm import Session

from ..models.fault import FaultEvent, FaultSeverity, FaultStatus
from ..models.machine import Machine
from ..models.sensor import Sensor

logger = logging.getLogger(__name__)


class FaultDetectionService:
    """
    Rule-based fault detection using configurable thresholds.
    
    NOTE: This is threshold-based detection, NOT AI/ML prediction.
    Default thresholds are demo values for the simulated environment.
    They should be calibrated for any real industrial application.
    """

    def __init__(self):
        # Default thresholds (DEMO VALUES - not real industrial limits)
        self.thresholds = {
            "temperature": {"warning": 75.0, "critical": 90.0, "unit": "°C"},
            "vibration": {"warning": 8.0, "critical": 12.0, "unit": "mm/s"},
            "motor_current": {"warning": 15.0, "critical": 20.0, "unit": "A"},
        }

        # Alert deduplication - track active alerts per sensor
        self._active_alerts: Dict[str, datetime] = {}
        self._alert_cooldown = timedelta(seconds=30)  # Min time between duplicate alerts

        # Track consecutive abnormal readings for sustained fault detection
        self._abnormal_counts: Dict[str, int] = {}
        self._sustained_threshold = 3  # readings before alert

    def update_thresholds(self, sensor_type: str, warning: float, critical: float):
        """Update detection thresholds for a sensor type."""
        if sensor_type in self.thresholds:
            self.thresholds[sensor_type]["warning"] = warning
            self.thresholds[sensor_type]["critical"] = critical
            logger.info(f"[FAULT] Updated thresholds for {sensor_type}: warn={warning}, crit={critical}")

    def evaluate_reading(self, reading: dict, db: Session) -> Optional[dict]:
        """
        Evaluate a single sensor reading against configured thresholds.
        Returns fault data dict if a new alert should be created, else None.
        """
        sensor_type = reading.get("sensor_type")
        value = reading.get("reading_value")
        sensor_id = reading.get("sensor_id")
        machine_id = reading.get("machine_id")
        connection_status = reading.get("connection_status", "connected")

        # Check sensor disconnection
        if connection_status == "disconnected":
            return self._create_fault_if_new(
                machine_id=machine_id,
                sensor_id=sensor_id,
                fault_type="sensor_disconnection",
                severity="warning",
                observed_value=None,
                threshold_value=None,
                description=f"Sensor {sensor_id} has lost connection.",
                recommended_action="Check sensor wiring, power supply, and communication interface.",
                db=db
            )

        # Check stale data
        if connection_status == "stale":
            return self._create_fault_if_new(
                machine_id=machine_id,
                sensor_id=sensor_id,
                fault_type="stale_data",
                severity="warning",
                observed_value=value,
                threshold_value=None,
                description=f"Sensor {sensor_id} is reporting stale (unchanged) data.",
                recommended_action="Verify sensor is functioning. Check for frozen readings or communication issues.",
                db=db
            )

        if value is None or sensor_type not in self.thresholds:
            return None

        thresholds = self.thresholds[sensor_type]
        warning_val = thresholds["warning"]
        critical_val = thresholds["critical"]

        # Check critical threshold
        if value >= critical_val:
            self._increment_abnormal(sensor_id)
            if self._abnormal_counts.get(sensor_id, 0) >= self._sustained_threshold:
                return self._create_fault_if_new(
                    machine_id=machine_id,
                    sensor_id=sensor_id,
                    fault_type=f"high_{sensor_type}",
                    severity="critical",
                    observed_value=value,
                    threshold_value=critical_val,
                    description=f"CRITICAL: {sensor_type.replace('_', ' ').title()} reading of {value} {thresholds['unit']} exceeds critical threshold of {critical_val} {thresholds['unit']}.",
                    recommended_action=self._get_recommended_action(sensor_type, "critical"),
                    db=db
                )

        # Check warning threshold
        elif value >= warning_val:
            self._increment_abnormal(sensor_id)
            if self._abnormal_counts.get(sensor_id, 0) >= self._sustained_threshold:
                return self._create_fault_if_new(
                    machine_id=machine_id,
                    sensor_id=sensor_id,
                    fault_type=f"high_{sensor_type}",
                    severity="warning",
                    observed_value=value,
                    threshold_value=warning_val,
                    description=f"WARNING: {sensor_type.replace('_', ' ').title()} reading of {value} {thresholds['unit']} exceeds warning threshold of {warning_val} {thresholds['unit']}.",
                    recommended_action=self._get_recommended_action(sensor_type, "warning"),
                    db=db
                )

        else:
            # Reading is normal - reset abnormal counter
            self._abnormal_counts[sensor_id] = 0

        return None

    def _increment_abnormal(self, sensor_id: str):
        """Track consecutive abnormal readings."""
        self._abnormal_counts[sensor_id] = self._abnormal_counts.get(sensor_id, 0) + 1

    def _create_fault_if_new(self, machine_id: str, sensor_id: str,
                              fault_type: str, severity: str,
                              observed_value: Optional[float],
                              threshold_value: Optional[float],
                              description: str, recommended_action: str,
                              db: Session) -> Optional[dict]:
        """Create a fault only if no active duplicate exists (deduplication)."""
        dedup_key = f"{machine_id}_{sensor_id}_{fault_type}"
        now = datetime.now(timezone.utc)

        # Check cooldown
        if dedup_key in self._active_alerts:
            last_alert_time = self._active_alerts[dedup_key]
            if now - last_alert_time < self._alert_cooldown:
                return None  # Still in cooldown

        # Check for existing active fault in database
        existing = db.query(FaultEvent).filter(
            FaultEvent.machine_id == machine_id,
            FaultEvent.fault_type == fault_type,
            FaultEvent.status.in_(["active", "acknowledged"])
        ).first()

        if existing:
            return None  # Active fault already exists

        # Create new fault
        fault = FaultEvent(
            machine_id=machine_id,
            sensor_id=sensor_id,
            fault_type=fault_type,
            severity=severity,
            observed_value=observed_value,
            threshold_value=threshold_value,
            description=description,
            recommended_action=recommended_action,
            status=FaultStatus.ACTIVE.value,
        )
        db.add(fault)
        db.commit()
        db.refresh(fault)

        # Update machine status
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        if machine:
            if severity == "critical":
                machine.operating_status = "critical"
                machine.health_score = max(0, machine.health_score - 25)
            elif severity == "warning":
                if machine.operating_status not in ("critical", "emergency_stop"):
                    machine.operating_status = "warning"
                machine.health_score = max(0, machine.health_score - 10)
            db.commit()

        # Record in dedup tracker
        self._active_alerts[dedup_key] = now

        logger.info(f"[FAULT] Created: {fault_type} ({severity}) on {machine_id}")

        return {
            "id": fault.id,
            "machine_id": machine_id,
            "sensor_id": sensor_id,
            "fault_type": fault_type,
            "severity": severity,
            "observed_value": observed_value,
            "threshold_value": threshold_value,
            "description": description,
            "recommended_action": recommended_action,
            "status": "active",
            "created_at": fault.created_at.isoformat() if fault.created_at else now.isoformat(),
        }

    def _get_recommended_action(self, sensor_type: str, severity: str) -> str:
        """Return context-appropriate recommended inspection action."""
        actions = {
            "temperature": {
                "warning": "Monitor temperature trend. Check cooling system, ventilation, and ambient conditions. Schedule inspection if temperature continues to rise.",
                "critical": "IMMEDIATE: Reduce machine load or stop operation. Inspect cooling system, motor bearings, and lubrication. Do not resume until temperature returns to safe range.",
            },
            "vibration": {
                "warning": "Check for loose components, worn bearings, or unbalanced loads. Monitor vibration trend and schedule preventive maintenance.",
                "critical": "IMMEDIATE: Stop machine operation. Inspect bearings, mounting bolts, shaft alignment, and structural integrity before resuming.",
            },
            "motor_current": {
                "warning": "Check for increased mechanical resistance, binding, or overloading. Verify motor and drive parameters. Schedule electrical inspection.",
                "critical": "IMMEDIATE: Reduce load or stop motor. Check for mechanical binding, short circuits, or insulation breakdown. Inspect motor windings and connections.",
            },
        }
        return actions.get(sensor_type, {}).get(severity, "Inspect the machine and sensor readings.")

    def calculate_health_score(self, machine_id: str, db: Session) -> int:
        """
        Calculate a machine health score (0-100) based on active faults.
        
        Score calculation (documented, not arbitrary):
        - Start at 100
        - Each active critical fault: -25
        - Each active warning: -10
        - Each acknowledged (unresolved) fault: -5
        - Minimum score: 0
        
        This is a simplified scoring model for demonstration.
        Real predictive health requires validated training data.
        """
        score = 100

        active_faults = db.query(FaultEvent).filter(
            FaultEvent.machine_id == machine_id,
            FaultEvent.status.in_(["active", "acknowledged"])
        ).all()

        for fault in active_faults:
            if fault.severity == "critical":
                score -= 25
            elif fault.severity == "warning":
                score -= 10
            if fault.status == "acknowledged":
                score += 5  # Partially mitigated

        return max(0, min(100, score))

    def clear_dedup_for_machine(self, machine_id: str):
        """Clear deduplication state for a machine (e.g., after reset)."""
        keys_to_remove = [k for k in self._active_alerts if k.startswith(machine_id)]
        for k in keys_to_remove:
            del self._active_alerts[k]
        keys_to_remove = [k for k in self._abnormal_counts if k.startswith(machine_id)]
        for k in keys_to_remove:
            del self._abnormal_counts[k]


# Global instance
fault_detector = FaultDetectionService()
