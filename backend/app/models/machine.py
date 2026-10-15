"""
SmartFactory 4.0 - Machine Model
Represents industrial machines in the factory.
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from ..database import Base


class MachineStatus(str, enum.Enum):
    IDLE = "idle"
    RUNNING = "running"
    WARNING = "warning"
    CRITICAL = "critical"
    STOPPED = "stopped"
    EMERGENCY_STOP = "emergency_stop"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"


class MachineType(str, enum.Enum):
    ROBOT_ARM = "robot_arm"
    CONVEYOR = "conveyor"
    INSPECTION_STATION = "inspection_station"
    CNC_MACHINE = "cnc_machine"


class Machine(Base):
    __tablename__ = "machines"

    id = Column(String, primary_key=True)
    name = Column(String(100), nullable=False)
    machine_type = Column(String(50), nullable=False, default=MachineType.ROBOT_ARM.value)
    operating_status = Column(String(30), nullable=False, default=MachineStatus.IDLE.value)
    description = Column(String(500), default="")
    location = Column(String(100), default="Main Production Floor")
    health_score = Column(Integer, default=100)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    sensors = relationship("Sensor", back_populates="machine", cascade="all, delete-orphan")
    fault_events = relationship("FaultEvent", back_populates="machine", cascade="all, delete-orphan")
    quality_inspections = relationship("QualityInspection", back_populates="machine", cascade="all, delete-orphan")
    production_events = relationship("ProductionEvent", back_populates="machine", cascade="all, delete-orphan")
    maintenance_records = relationship("MaintenanceRecord", back_populates="machine", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Machine(id={self.id}, name={self.name}, status={self.operating_status})>"
