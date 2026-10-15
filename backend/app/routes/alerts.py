"""
SmartFactory 4.0 - Alert Routes
Fault event management, acknowledgment, and resolution.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from datetime import datetime, timezone

from ..database import get_db
from ..models.fault import FaultEvent
from ..models.machine import Machine
from ..schemas.schemas import AlertAcknowledge, AlertResolve
from ..services.fault_detection import fault_detector

router = APIRouter()


@router.get("/alerts")
def get_alerts(
    machine_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get fault events / alerts with optional filters."""
    query = db.query(FaultEvent)

    if machine_id:
        query = query.filter(FaultEvent.machine_id == machine_id)
    if status:
        query = query.filter(FaultEvent.status == status)
    if severity:
        query = query.filter(FaultEvent.severity == severity)

    alerts = query.order_by(desc(FaultEvent.created_at)).limit(limit).all()

    return [
        {
            "id": a.id,
            "machine_id": a.machine_id,
            "sensor_id": a.sensor_id,
            "fault_type": a.fault_type,
            "severity": a.severity,
            "observed_value": a.observed_value,
            "threshold_value": a.threshold_value,
            "description": a.description,
            "recommended_action": a.recommended_action,
            "status": a.status,
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            "acknowledged_by": a.acknowledged_by,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
            "resolution_notes": a.resolution_notes,
        }
        for a in alerts
    ]


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int, body: AlertAcknowledge, db: Session = Depends(get_db)):
    """Acknowledge an active alert."""
    alert = db.query(FaultEvent).filter(FaultEvent.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    if alert.status != "active":
        raise HTTPException(status_code=400, detail=f"Alert is not active (current: {alert.status})")

    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.now(timezone.utc)
    alert.acknowledged_by = body.acknowledged_by
    db.commit()

    from ..services.websocket_manager import ws_manager
    await ws_manager.broadcast_alert_update({
        "id": alert.id,
        "status": "acknowledged",
        "acknowledged_by": body.acknowledged_by,
    })

    return {"message": "Alert acknowledged", "alert_id": alert_id}


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int, body: AlertResolve, db: Session = Depends(get_db)):
    """Resolve an alert (must be acknowledged first or active)."""
    alert = db.query(FaultEvent).filter(FaultEvent.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    if alert.status == "resolved":
        raise HTTPException(status_code=400, detail="Alert is already resolved")

    alert.status = "resolved"
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolution_notes = body.resolution_notes
    db.commit()

    # Recalculate health score
    health = fault_detector.calculate_health_score(alert.machine_id, db)
    machine = db.query(Machine).filter(Machine.id == alert.machine_id).first()
    if machine:
        machine.health_score = health
        # If no more active faults, set to running
        active_faults = db.query(FaultEvent).filter(
            FaultEvent.machine_id == alert.machine_id,
            FaultEvent.status.in_(["active", "acknowledged"])
        ).count()
        if active_faults == 0:
            machine.operating_status = "running"
        db.commit()

    from ..services.websocket_manager import ws_manager
    await ws_manager.broadcast_alert_update({
        "id": alert.id,
        "status": "resolved",
        "resolution_notes": body.resolution_notes,
        "machine_health": health,
    })

    return {"message": "Alert resolved", "alert_id": alert_id, "health_score": health}
