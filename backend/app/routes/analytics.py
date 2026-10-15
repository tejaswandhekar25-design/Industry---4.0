"""
SmartFactory 4.0 - Analytics Routes
Aggregated metrics, historical trends, and CSV data export endpoints.
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional
from datetime import datetime, timezone, timedelta
import io
import csv

from ..database import get_db
from ..models.sensor import SensorReading, Sensor
from ..models.fault import FaultEvent
from ..models.quality import QualityInspection
from ..models.production import ProductionEvent
from ..models.maintenance import MaintenanceRecord
from ..models.machine import Machine
from ..schemas.schemas import AnalyticsSummary

router = APIRouter()


@router.get("/analytics/summary", response_model=AnalyticsSummary)
def get_analytics_summary(db: Session = Depends(get_db)):
    """Summary metrics across all factory modules."""
    readings_count = db.query(SensorReading).count()
    faults_count = db.query(FaultEvent).count()
    inspections_count = db.query(QualityInspection).count()
    maintenance_count = db.query(MaintenanceRecord).count()
    production_count = db.query(ProductionEvent).count()

    # Health score average
    machines = db.query(Machine).all()
    avg_health = sum(m.health_score for m in machines) / len(machines) if machines else 100.0

    # Most common fault
    fault_counts = (
        db.query(FaultEvent.fault_type, func.count(FaultEvent.id).label("cnt"))
        .group_by(FaultEvent.fault_type)
        .order_by(desc("cnt"))
        .first()
    )
    most_common_fault = fault_counts[0] if fault_counts else None

    # Defect rate
    defective_count = db.query(QualityInspection).filter(QualityInspection.result == "defect").count()
    defect_rate = (defective_count / inspections_count * 100) if inspections_count > 0 else 0.0

    return AnalyticsSummary(
        sensor_readings_count=readings_count,
        fault_events_count=faults_count,
        inspections_count=inspections_count,
        maintenance_records_count=maintenance_count,
        production_events_count=production_count,
        avg_health_score=round(avg_health, 1),
        most_common_fault=most_common_fault,
        defect_rate=round(defect_rate, 2),
    )


@router.get("/analytics/fault-frequency")
def get_fault_frequency(db: Session = Depends(get_db)):
    """Count of faults grouped by fault_type and severity."""
    stats = (
        db.query(FaultEvent.fault_type, FaultEvent.severity, func.count(FaultEvent.id).label("count"))
        .group_by(FaultEvent.fault_type, FaultEvent.severity)
        .all()
    )
    return [{"fault_type": s[0], "severity": s[1], "count": s[2]} for s in stats]


@router.get("/analytics/sensor-trends")
def get_sensor_trends(
    sensor_type: str = Query("temperature"),
    minutes: int = Query(30, ge=5, le=1440),
    db: Session = Depends(get_db)
):
    """Retrieve time-bucketed or recent trends for temperature, vibration, current."""
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    readings = (
        db.query(SensorReading)
        .join(Sensor, SensorReading.sensor_id == Sensor.id)
        .filter(Sensor.sensor_type == sensor_type, SensorReading.timestamp >= since)
        .order_by(SensorReading.timestamp.asc())
        .limit(200)
        .all()
    )
    return [
        {
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "sensor_id": r.sensor_id,
            "value": r.reading_value,
            "unit": r.unit
        }
        for r in readings
    ]


@router.get("/analytics/export/sensors/csv")
def export_sensors_csv(limit: int = Query(5000, le=10000), db: Session = Depends(get_db)):
    """Export recent sensor telemetry as CSV."""
    readings = db.query(SensorReading).order_by(desc(SensorReading.timestamp)).limit(limit).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Machine ID", "Sensor ID", "Value", "Unit", "Source Type", "Timestamp (UTC)"])
    for r in readings:
        writer.writerow([
            r.id, r.machine_id, r.sensor_id, r.reading_value, r.unit, r.source_type,
            r.timestamp.isoformat() if r.timestamp else ""
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sensor_telemetry.csv"}
    )


@router.get("/analytics/export/faults/csv")
def export_faults_csv(db: Session = Depends(get_db)):
    """Export fault events history as CSV."""
    faults = db.query(FaultEvent).order_by(desc(FaultEvent.created_at)).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Machine ID", "Sensor ID", "Fault Type", "Severity", 
        "Observed Value", "Threshold Value", "Description", "Status", 
        "Created At (UTC)", "Resolved At (UTC)"
    ])
    for f in faults:
        writer.writerow([
            f.id, f.machine_id, f.sensor_id or "", f.fault_type, f.severity,
            f.observed_value if f.observed_value is not None else "",
            f.threshold_value if f.threshold_value is not None else "",
            f.description, f.status,
            f.created_at.isoformat() if f.created_at else "",
            f.resolved_at.isoformat() if f.resolved_at else ""
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=fault_history.csv"}
    )


@router.get("/analytics/export/inspections/csv")
def export_inspections_csv(db: Session = Depends(get_db)):
    """Export quality inspections as CSV."""
    inspections = db.query(QualityInspection).order_by(desc(QualityInspection.created_at)).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Product ID", "Machine ID", "Inspection Mode", "Result", "Defect Type", "Confidence Score", "Created At (UTC)"])
    for i in inspections:
        writer.writerow([
            i.id, i.product_id, i.machine_id, i.inspection_mode, i.result,
            i.defect_type, i.confidence_score or "",
            i.created_at.isoformat() if i.created_at else ""
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=quality_inspections.csv"}
    )
