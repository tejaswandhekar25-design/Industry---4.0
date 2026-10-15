"""
SmartFactory 4.0 - Quality Inspection Routes
Product inspection management and results.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional
from datetime import datetime, timezone
import random

from ..database import get_db
from ..models.quality import QualityInspection, InspectionResult, DefectType
from ..schemas.schemas import InspectionCreate, InspectionResponse
from ..core.config import settings

router = APIRouter()


@router.get("/quality/inspections")
def get_inspections(
    machine_id: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get inspection records."""
    query = db.query(QualityInspection)
    if machine_id:
        query = query.filter(QualityInspection.machine_id == machine_id)
    if result:
        query = query.filter(QualityInspection.result == result)

    inspections = query.order_by(desc(QualityInspection.created_at)).limit(limit).all()

    return [
        {
            "id": i.id,
            "product_id": i.product_id,
            "machine_id": i.machine_id,
            "inspection_mode": i.inspection_mode,
            "result": i.result,
            "defect_type": i.defect_type,
            "confidence_score": i.confidence_score,
            "model_version": i.model_version,
            "inspection_duration_ms": i.inspection_duration_ms,
            "notes": i.notes,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in inspections
    ]


@router.post("/quality/inspections")
async def create_inspection(body: InspectionCreate, db: Session = Depends(get_db)):
    """Create a new inspection record."""
    inspection = QualityInspection(
        product_id=body.product_id,
        machine_id=body.machine_id,
        inspection_mode=body.inspection_mode,
        result=body.result,
        defect_type=body.defect_type,
        confidence_score=body.confidence_score,
        notes=body.notes,
        inspection_duration_ms=random.randint(200, 800),
    )

    # If simulated mode, auto-determine result
    if body.inspection_mode == "simulated" and body.result == "pending":
        is_defective = random.random() < settings.default_defect_probability
        if is_defective:
            inspection.result = "defect"
            defect_types = ["surface_scratch", "missing_component", "visible_crack", "incorrect_placement"]
            inspection.defect_type = random.choice(defect_types)
            inspection.notes = f"[SIMULATED] Defect detected: {inspection.defect_type}"
        else:
            inspection.result = "pass"
            inspection.defect_type = "none"
            inspection.notes = "[SIMULATED] Product passed quality inspection"

    db.add(inspection)
    db.commit()
    db.refresh(inspection)

    # Broadcast
    from ..services.websocket_manager import ws_manager
    await ws_manager.broadcast_inspection({
        "id": inspection.id,
        "product_id": inspection.product_id,
        "result": inspection.result,
        "defect_type": inspection.defect_type,
        "inspection_mode": inspection.inspection_mode,
    })

    # Create production event
    from ..models.production import ProductionEvent
    event_type = "product_passed" if inspection.result == "pass" else "product_rejected"
    pe = ProductionEvent(
        machine_id=body.machine_id,
        product_id=body.product_id,
        event_type=event_type,
        details=f"Inspection: {inspection.result} ({inspection.inspection_mode})",
    )
    db.add(pe)
    db.commit()

    return {
        "id": inspection.id,
        "product_id": inspection.product_id,
        "result": inspection.result,
        "defect_type": inspection.defect_type,
        "inspection_mode": inspection.inspection_mode,
        "inspection_duration_ms": inspection.inspection_duration_ms,
        "created_at": inspection.created_at.isoformat() if inspection.created_at else None,
    }


@router.get("/quality/summary")
def get_quality_summary(machine_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Get quality inspection summary statistics."""
    query = db.query(QualityInspection)
    if machine_id:
        query = query.filter(QualityInspection.machine_id == machine_id)

    total = query.count()
    passed = query.filter(QualityInspection.result == "pass").count()
    defective = query.filter(QualityInspection.result == "defect").count()
    defect_rate = (defective / total * 100) if total > 0 else 0.0

    # Defect type breakdown
    defect_breakdown = {}
    if defective > 0:
        defects = query.filter(QualityInspection.result == "defect").all()
        for d in defects:
            dt = d.defect_type or "unknown"
            defect_breakdown[dt] = defect_breakdown.get(dt, 0) + 1

    return {
        "total_inspected": total,
        "passed": passed,
        "defective": defective,
        "defect_rate": round(defect_rate, 2),
        "defect_breakdown": defect_breakdown,
    }
