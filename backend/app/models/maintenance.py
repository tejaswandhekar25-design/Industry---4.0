"""
SmartFactory 4.0 - Maintenance Record Model
Tracks maintenance actions, technician notes, and resolution history.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from ..database import Base


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String, ForeignKey("machines.id"), nullable=False)
    fault_event_id = Column(Integer, ForeignKey("fault_events.id"), nullable=True)
    action_taken = Column(Text, nullable=False)
    technician_notes = Column(Text, nullable=True)
    inspection_result = Column(String(50), nullable=True)
    parts_replaced = Column(Text, nullable=True)
    downtime_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    machine = relationship("Machine", back_populates="maintenance_records")
    fault_event = relationship("FaultEvent", back_populates="maintenance_records")

    def __repr__(self):
        return f"<MaintenanceRecord(id={self.id}, machine={self.machine_id}, action={self.action_taken[:30]})>"
