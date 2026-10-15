"""
SmartFactory 4.0 - Fault Event Model
Tracks abnormal operating conditions and alerts.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from ..database import Base


class FaultSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class FaultStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class FaultType(str, enum.Enum):
    HIGH_TEMPERATURE = "high_temperature"
    EXCESSIVE_VIBRATION = "excessive_vibration"
    HIGH_MOTOR_CURRENT = "high_motor_current"
    SENSOR_DISCONNECTION = "sensor_disconnection"
    STALE_DATA = "stale_data"
    ABNORMAL_READING = "abnormal_reading"
    EMERGENCY_STOP = "emergency_stop"
    MULTIPLE_FAULTS = "multiple_faults"


class FaultEvent(Base):
    __tablename__ = "fault_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String, ForeignKey("machines.id"), nullable=False)
    sensor_id = Column(String, ForeignKey("sensors.id"), nullable=True)
    fault_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False, default=FaultSeverity.WARNING.value)
    observed_value = Column(Float, nullable=True)
    threshold_value = Column(Float, nullable=True)
    description = Column(Text, nullable=False)
    recommended_action = Column(Text, default="Inspect the machine and sensor readings.")
    status = Column(String(20), nullable=False, default=FaultStatus.ACTIVE.value)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Relationships
    machine = relationship("Machine", back_populates="fault_events")
    maintenance_records = relationship("MaintenanceRecord", back_populates="fault_event")

    def __repr__(self):
        return f"<FaultEvent(id={self.id}, type={self.fault_type}, severity={self.severity}, status={self.status})>"
