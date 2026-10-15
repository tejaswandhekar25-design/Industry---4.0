"""
SmartFactory 4.0 - Production Routes
Production tracking and summary statistics.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional
from datetime import datetime, timezone, timedelta

from ..database import get_db
from ..models.production import ProductionEvent
from ..models.quality import QualityInspection
from ..models.fault import FaultEvent
from ..models.machine import Machine
from ..schemas.schemas import ProductionSummary, ProductionEventCreate

router = APIRouter()


@router.get("/production/events")
def get_production_events(
    machine_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get production events."""
    query = db.query(ProductionEvent)
    if machine_id:
        query = query.filter(ProductionEvent.machine_id == machine_id)
    if event_type:
        query = query.filter(ProductionEvent.event_type == event_type)

    events = query.order_by(desc(ProductionEvent.event_timestamp)).limit(limit).all()

    return [
        {
            "id": e.id,
            "machine_id": e.machine_id,
            "product_id": e.product_id,
            "event_type": e.event_type,
            "details": e.details,
            "event_timestamp": e.event_timestamp.isoformat() if e.event_timestamp else None,
        }
        for e in events
    ]


@router.post("/production/events")
async def create_production_event(body: ProductionEventCreate, db: Session = Depends(get_db)):
    """Create a production event."""
    event = ProductionEvent(
        machine_id=body.machine_id,
        product_id=body.product_id,
        event_type=body.event_type,
        details=body.details,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    from ..services.websocket_manager import ws_manager
    await ws_manager.broadcast_production({
        "id": event.id,
        "machine_id": event.machine_id,
        "product_id": event.product_id,
        "event_type": event.event_type,
    })

    return {
        "id": event.id,
        "event_type": event.event_type,
        "event_timestamp": event.event_timestamp.isoformat() if event.event_timestamp else None,
    }


@router.get("/production/summary", response_model=ProductionSummary)
def get_production_summary(db: Session = Depends(get_db)):
    """Get production summary with calculated metrics."""
    # Products
    total_entered = db.query(ProductionEvent).filter(
        ProductionEvent.event_type == "product_entered"
    ).count()

    inspected = db.query(QualityInspection).count()
    passed = db.query(QualityInspection).filter(QualityInspection.result == "pass").count()
    rejected = db.query(QualityInspection).filter(QualityInspection.result == "defect").count()

    # Defect rate: (Defective / Total Inspected) × 100
    defect_rate = (rejected / inspected * 100) if inspected > 0 else 0.0

    # Active alerts
    active_alerts = db.query(FaultEvent).filter(
        FaultEvent.status.in_(["active", "acknowledged"])
    ).count()

    # Machine counts
    machines = db.query(Machine).all()
    machines_total = len(machines)
    machines_running = sum(1 for m in machines if m.operating_status == "running")
    machines_warning = sum(1 for m in machines if m.operating_status in ("warning", "critical"))

    # Production rate (products per hour in last hour)
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent_products = db.query(ProductionEvent).filter(
        ProductionEvent.event_type == "product_entered",
        ProductionEvent.event_timestamp >= one_hour_ago
    ).count()

    return ProductionSummary(
        total_products=total_entered,
        products_inspected=inspected,
        products_passed=passed,
        products_rejected=rejected,
        defect_rate=round(defect_rate, 2),
        active_alerts=active_alerts,
        machines_running=machines_running,
        machines_total=machines_total,
        machines_warning=machines_warning,
        current_production_rate=float(recent_products),
    )
