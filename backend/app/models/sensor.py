"""
SmartFactory 4.0 - Sensor Models
Sensor definitions and sensor readings storage.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from ..database import Base


class SensorType(str, enum.Enum):
    TEMPERATURE = "temperature"
    VIBRATION = "vibration"
    MOTOR_CURRENT = "motor_current"
    POSITION = "position"
    PROXIMITY = "proximity"
    FORCE = "force"


class ConnectionStatus(str, enum.Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    STALE = "stale"


class SourceType(str, enum.Enum):
    SIMULATED = "simulated"
    MQTT = "mqtt"
    MANUAL = "manual"


class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(String, primary_key=True)
    machine_id = Column(String, ForeignKey("machines.id"), nullable=False)
    sensor_type = Column(String(30), nullable=False)
    name = Column(String(100), nullable=False)
    unit = Column(String(20), nullable=False)
    min_value = Column(Float, default=0.0)
    max_value = Column(Float, default=100.0)
    warning_threshold = Column(Float, nullable=True)
    critical_threshold = Column(Float, nullable=True)
    connection_status = Column(String(20), default=ConnectionStatus.CONNECTED.value)
    last_reading = Column(Float, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    machine = relationship("Machine", back_populates="sensors")
    readings = relationship("SensorReading", back_populates="sensor", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Sensor(id={self.id}, type={self.sensor_type}, machine={self.machine_id})>"


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String, ForeignKey("machines.id"), nullable=False)
    sensor_id = Column(String, ForeignKey("sensors.id"), nullable=False)
    reading_value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    source_type = Column(String(20), default=SourceType.SIMULATED.value)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    sensor = relationship("Sensor", back_populates="readings")

    # Indexes for efficient querying
    __table_args__ = (
        Index("ix_sensor_readings_machine_time", "machine_id", "timestamp"),
        Index("ix_sensor_readings_sensor_time", "sensor_id", "timestamp"),
    )

    def __repr__(self):
        return f"<SensorReading(sensor={self.sensor_id}, value={self.reading_value}, time={self.timestamp})>"
