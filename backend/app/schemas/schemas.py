"""
SmartFactory 4.0 - Pydantic Schemas
Request/response validation schemas for the REST API.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Machine Schemas ───────────────────────────────────────

class MachineBase(BaseModel):
    name: str
    machine_type: str = "robot_arm"
    description: str = ""
    location: str = "Main Production Floor"

class MachineResponse(MachineBase):
    id: str
    operating_status: str
    health_score: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MachineStatusUpdate(BaseModel):
    operating_status: str
    health_score: Optional[int] = None


# ─── Sensor Schemas ────────────────────────────────────────

class SensorBase(BaseModel):
    sensor_type: str
    name: str
    unit: str
    min_value: float = 0.0
    max_value: float = 100.0
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None

class SensorResponse(SensorBase):
    id: str
    machine_id: str
    connection_status: str
    last_reading: Optional[float] = None
    last_seen_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SensorReadingCreate(BaseModel):
    machine_id: str
    sensor_id: str
    reading_value: float
    unit: str
    source_type: str = "simulated"

class SensorReadingResponse(BaseModel):
    id: int
    machine_id: str
    sensor_id: str
    reading_value: float
    unit: str
    source_type: str
    timestamp: datetime

    class Config:
        from_attributes = True

class SensorThresholdUpdate(BaseModel):
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None


# ─── Fault / Alert Schemas ─────────────────────────────────

class FaultEventCreate(BaseModel):
    machine_id: str
    sensor_id: Optional[str] = None
    fault_type: str
    severity: str = "warning"
    observed_value: Optional[float] = None
    threshold_value: Optional[float] = None
    description: str
    recommended_action: str = "Inspect the machine and sensor readings."

class FaultEventResponse(BaseModel):
    id: int
    machine_id: str
    sensor_id: Optional[str] = None
    fault_type: str
    severity: str
    observed_value: Optional[float] = None
    threshold_value: Optional[float] = None
    description: str
    recommended_action: str
    status: str
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True

class AlertAcknowledge(BaseModel):
    acknowledged_by: str = "operator"

class AlertResolve(BaseModel):
    resolution_notes: str = ""


# ─── Quality Inspection Schemas ────────────────────────────

class InspectionCreate(BaseModel):
    product_id: str
    machine_id: str
    inspection_mode: str = "simulated"
    result: str = "pending"
    defect_type: str = "none"
    confidence_score: Optional[float] = None
    notes: Optional[str] = None

class InspectionResponse(BaseModel):
    id: int
    product_id: str
    machine_id: str
    inspection_mode: str
    result: str
    defect_type: str
    confidence_score: Optional[float] = None
    model_version: Optional[str] = None
    inspection_duration_ms: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Maintenance Schemas ──────────────────────────────────

class MaintenanceCreate(BaseModel):
    machine_id: str
    fault_event_id: Optional[int] = None
    action_taken: str
    technician_notes: Optional[str] = None
    inspection_result: Optional[str] = None
    parts_replaced: Optional[str] = None
    downtime_minutes: Optional[int] = None

class MaintenanceResponse(BaseModel):
    id: int
    machine_id: str
    fault_event_id: Optional[int] = None
    action_taken: str
    technician_notes: Optional[str] = None
    inspection_result: Optional[str] = None
    parts_replaced: Optional[str] = None
    downtime_minutes: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Production Schemas ───────────────────────────────────

class ProductionEventCreate(BaseModel):
    machine_id: str
    product_id: Optional[str] = None
    event_type: str
    details: Optional[str] = None

class ProductionEventResponse(BaseModel):
    id: int
    machine_id: str
    product_id: Optional[str] = None
    event_type: str
    details: Optional[str] = None
    event_timestamp: datetime

    class Config:
        from_attributes = True

class ProductionSummary(BaseModel):
    total_products: int = 0
    products_inspected: int = 0
    products_passed: int = 0
    products_rejected: int = 0
    defect_rate: float = 0.0
    active_alerts: int = 0
    machines_running: int = 0
    machines_total: int = 0
    machines_warning: int = 0
    current_production_rate: float = 0.0


# ─── Simulation Schemas ───────────────────────────────────

class SimulationCommand(BaseModel):
    action: str  # start, pause, resume, reset, emergency_stop
    speed: Optional[float] = 1.0

class FaultInjection(BaseModel):
    fault_type: str
    machine_id: str = "ROBOT-01"
    severity: str = "warning"
    value_override: Optional[float] = None


# ─── Analytics Schemas ────────────────────────────────────

class AnalyticsSummary(BaseModel):
    sensor_readings_count: int = 0
    fault_events_count: int = 0
    inspections_count: int = 0
    maintenance_records_count: int = 0
    production_events_count: int = 0
    avg_health_score: float = 100.0
    most_common_fault: Optional[str] = None
    defect_rate: float = 0.0


# ─── Settings Schemas ─────────────────────────────────────

class SimulationSettings(BaseModel):
    simulation_speed: float = Field(1.0, ge=0.1, le=5.0)
    sensor_update_interval_ms: int = Field(2000, ge=500, le=10000)
    defect_probability: float = Field(0.15, ge=0.0, le=1.0)
    temp_warning: float = Field(75.0, ge=0.0)
    temp_critical: float = Field(90.0, ge=0.0)
    vibration_warning: float = Field(8.0, ge=0.0)
    vibration_critical: float = Field(12.0, ge=0.0)
    current_warning: float = Field(15.0, ge=0.0)
    current_critical: float = Field(20.0, ge=0.0)
    auto_start: bool = False
