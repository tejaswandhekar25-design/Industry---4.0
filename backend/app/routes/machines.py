"""
SmartFactory 4.0 - Machine Routes
CRUD operations for machines.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.machine import Machine
from ..schemas.schemas import MachineResponse, MachineStatusUpdate

router = APIRouter()


@router.get("/machines", response_model=List[MachineResponse])
def get_machines(db: Session = Depends(get_db)):
    """Get all registered machines."""
    return db.query(Machine).all()


@router.get("/machines/{machine_id}", response_model=MachineResponse)
def get_machine(machine_id: str, db: Session = Depends(get_db)):
    """Get a specific machine by ID."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")
    return machine


@router.get("/machines/{machine_id}/sensors")
def get_machine_sensors(machine_id: str, db: Session = Depends(get_db)):
    """Get all sensors for a machine."""
    from ..models.sensor import Sensor
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")
    sensors = db.query(Sensor).filter(Sensor.machine_id == machine_id).all()
    return [
        {
            "id": s.id,
            "machine_id": s.machine_id,
            "sensor_type": s.sensor_type,
            "name": s.name,
            "unit": s.unit,
            "min_value": s.min_value,
            "max_value": s.max_value,
            "warning_threshold": s.warning_threshold,
            "critical_threshold": s.critical_threshold,
            "connection_status": s.connection_status,
            "last_reading": s.last_reading,
            "last_seen_at": s.last_seen_at.isoformat() if s.last_seen_at else None,
        }
        for s in sensors
    ]


@router.patch("/machines/{machine_id}/status")
def update_machine_status(machine_id: str, update: MachineStatusUpdate, db: Session = Depends(get_db)):
    """Update machine operating status."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")
    machine.operating_status = update.operating_status
    if update.health_score is not None:
        machine.health_score = update.health_score
    db.commit()
    return {"message": "Machine status updated", "machine_id": machine_id, "status": update.operating_status}
