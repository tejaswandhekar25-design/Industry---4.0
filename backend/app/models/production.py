"""
SmartFactory 4.0 - Production Event Model
Tracks production line events and throughput.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from ..database import Base


class ProductionEventType(str, enum.Enum):
    PRODUCT_ENTERED = "product_entered"
    PRODUCT_INSPECTED = "product_inspected"
    PRODUCT_PASSED = "product_passed"
    PRODUCT_REJECTED = "product_rejected"
    LINE_STARTED = "line_started"
    LINE_STOPPED = "line_stopped"
    LINE_PAUSED = "line_paused"
    DOWNTIME_START = "downtime_start"
    DOWNTIME_END = "downtime_end"


class ProductionEvent(Base):
    __tablename__ = "production_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String, ForeignKey("machines.id"), nullable=False)
    product_id = Column(String(50), nullable=True)
    event_type = Column(String(30), nullable=False)
    details = Column(Text, nullable=True)
    event_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    machine = relationship("Machine", back_populates="production_events")

    def __repr__(self):
        return f"<ProductionEvent(id={self.id}, type={self.event_type}, product={self.product_id})>"
