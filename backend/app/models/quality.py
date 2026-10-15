"""
SmartFactory 4.0 - Quality Inspection Model
Tracks product inspection results and defect types.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from ..database import Base


class InspectionResult(str, enum.Enum):
    PASS = "pass"
    DEFECT = "defect"
    PENDING = "pending"


class InspectionMode(str, enum.Enum):
    SIMULATED = "simulated"
    MANUAL = "manual"
    AI_VISION = "ai_vision"


class DefectType(str, enum.Enum):
    NONE = "none"
    SURFACE_SCRATCH = "surface_scratch"
    MISSING_COMPONENT = "missing_component"
    VISIBLE_CRACK = "visible_crack"
    INCORRECT_PLACEMENT = "incorrect_placement"
    DIMENSIONAL_ERROR = "dimensional_error"


class QualityInspection(Base):
    __tablename__ = "quality_inspections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(50), nullable=False, index=True)
    machine_id = Column(String, ForeignKey("machines.id"), nullable=False)
    inspection_mode = Column(String(20), default=InspectionMode.SIMULATED.value)
    result = Column(String(20), default=InspectionResult.PENDING.value)
    defect_type = Column(String(50), default=DefectType.NONE.value)
    confidence_score = Column(Float, nullable=True)
    model_version = Column(String(50), nullable=True)
    inspection_duration_ms = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    image_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    machine = relationship("Machine", back_populates="quality_inspections")

    def __repr__(self):
        return f"<QualityInspection(id={self.id}, product={self.product_id}, result={self.result})>"
