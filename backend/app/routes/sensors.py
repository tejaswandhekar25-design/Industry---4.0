"""
SmartFactory 4.0 - Sensor Routes
Sensor readings, history, and threshold management.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from ..database import get_db
from ..models.sensor import Sensor, SensorReading
from ..schemas.schemas import SensorReadingResponse, SensorThresholdUpdate

router = APIRouter()


@router.get("/sensors/readings")
def get_sensor_readings(
    machine_id: Optional[str] = Query(None),
    sensor_id: Optional[str] = Query(None),
    sensor_type: Optional[str] = Query(None),
    minutes: int = Query(30, ge=1, le=1440),
    limit: int = Query(500, ge=1, le=5000),
    db: Session = Depends(get_db)
):
    """Get sensor readings with optional filters."""
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    query = db.query(SensorReading).filter(SensorReading.timestamp >= since)

    if machine_id:
        query = query.filter(SensorReading.machine_id == machine_id)
    if sensor_id:
        query = query.filter(SensorReading.sensor_id == sensor_id)

    readings = query.order_by(desc(SensorReading.timestamp)).limit(limit).all()

    result = []
    for r in readings:
        result.append({
            "id": r.id,
            "machine_id": r.machine_id,
            "sensor_id": r.sensor_id,
            "reading_value": r.reading_value,
            "unit": r.unit,
            "source_type": r.source_type,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        })

    return result


@router.get("/sensors/{sensor_id}")
def get_sensor(sensor_id: str, db: Session = Depends(get_db)):
    """Get sensor details."""
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail=f"Sensor {sensor_id} not found")
    return {
        "id": sensor.id,
        "machine_id": sensor.machine_id,
        "sensor_type": sensor.sensor_type,
        "name": sensor.name,
        "unit": sensor.unit,
        "min_value": sensor.min_value,
        "max_value": sensor.max_value,
        "warning_threshold": sensor.warning_threshold,
        "critical_threshold": sensor.critical_threshold,
        "connection_status": sensor.connection_status,
        "last_reading": sensor.last_reading,
        "last_seen_at": sensor.last_seen_at.isoformat() if sensor.last_seen_at else None,
    }


@router.patch("/sensors/{sensor_id}/thresholds")
def update_sensor_thresholds(sensor_id: str, update: SensorThresholdUpdate, db: Session = Depends(get_db)):
    """Update sensor warning/critical thresholds."""
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail=f"Sensor {sensor_id} not found")

    if update.warning_threshold is not None:
        sensor.warning_threshold = update.warning_threshold
    if update.critical_threshold is not None:
        sensor.critical_threshold = update.critical_threshold

    db.commit()

    # Also update fault detector thresholds
    from ..services.fault_detection import fault_detector
    if sensor.sensor_type in ["temperature", "vibration", "motor_current"]:
        fault_detector.update_thresholds(
            sensor.sensor_type,
            sensor.warning_threshold or 0,
            sensor.critical_threshold or 0,
        )

    return {"message": "Thresholds updated", "sensor_id": sensor_id}
