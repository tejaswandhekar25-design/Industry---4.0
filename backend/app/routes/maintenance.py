"""
SmartFactory 4.0 - Maintenance Routes
Maintenance record tracking, technician notes, and work orders.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime, timezone
import io
import csv

from ..database import get_db
from ..models.maintenance import MaintenanceRecord
from ..models.fault import FaultEvent
from ..schemas.schemas import MaintenanceCreate, MaintenanceResponse

router = APIRouter()


@router.get("/maintenance", response_model=List[MaintenanceResponse])
def get_maintenance_records(
    machine_id: Optional[str] = Query(None),
    fault_event_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Retrieve maintenance history and logs."""
    query = db.query(MaintenanceRecord)
    if machine_id:
        query = query.filter(MaintenanceRecord.machine_id == machine_id)
    if fault_event_id:
        query = query.filter(MaintenanceRecord.fault_event_id == fault_event_id)

    records = query.order_by(desc(MaintenanceRecord.created_at)).limit(limit).all()
    return records


@router.post("/maintenance", response_model=MaintenanceResponse)
def create_maintenance_record(record_in: MaintenanceCreate, db: Session = Depends(get_db)):
    """Create a new maintenance action record."""
    if record_in.fault_event_id:
        fault = db.query(FaultEvent).filter(FaultEvent.id == record_in.fault_event_id).first()
        if not fault:
            raise HTTPException(status_code=404, detail=f"Fault event {record_in.fault_event_id} not found")

    record = MaintenanceRecord(
        machine_id=record_in.machine_id,
        fault_event_id=record_in.fault_event_id,
        action_taken=record_in.action_taken,
        technician_notes=record_in.technician_notes,
        inspection_result=record_in.inspection_result,
        parts_replaced=record_in.parts_replaced,
        downtime_minutes=record_in.downtime_minutes
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/maintenance/export/csv")
def export_maintenance_csv(db: Session = Depends(get_db)):
    """Export maintenance history as CSV."""
    records = db.query(MaintenanceRecord).order_by(desc(MaintenanceRecord.created_at)).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Machine ID", "Fault Event ID", "Action Taken", 
        "Technician Notes", "Inspection Result", "Parts Replaced", 
        "Downtime (Minutes)", "Created At (UTC)"
    ])
    
    for r in records:
        writer.writerow([
            r.id, r.machine_id, r.fault_event_id or "", r.action_taken,
            r.technician_notes or "", r.inspection_result or "", 
            r.parts_replaced or "", r.downtime_minutes or 0,
            r.created_at.isoformat() if r.created_at else ""
        ])
        
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=maintenance_records.csv"}
    )
