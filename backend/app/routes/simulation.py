"""
SmartFactory 4.0 - Simulation Control Routes
Start, pause, reset simulation and inject faults.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from ..database import get_db
from ..models.machine import Machine
from ..models.fault import FaultEvent
from ..services.sensor_simulator import simulator
from ..services.fault_detection import fault_detector
from ..schemas.schemas import SimulationCommand, FaultInjection

router = APIRouter()


def _get_sim_state():
    from ..main import simulation_state
    return simulation_state


@router.get("/simulation/state")
def get_simulation_state():
    """Get current simulation state."""
    state = _get_sim_state()
    machine_state = simulator.get_machine_state("ROBOT-01")
    return {
        **state,
        "machine_state": machine_state,
    }


@router.post("/simulation/start")
async def start_simulation(db: Session = Depends(get_db)):
    """Start the simulation."""
    state = _get_sim_state()
    state["running"] = True
    state["paused"] = False
    state["emergency_stop"] = False
    state["started_at"] = datetime.now(timezone.utc).isoformat()

    # Update machine status
    machine = db.query(Machine).filter(Machine.id == "ROBOT-01").first()
    if machine:
        machine.operating_status = "running"
        db.commit()

    from ..services.websocket_manager import ws_manager
    await ws_manager.broadcast_machine_state("ROBOT-01", {
        "status": "running",
        "simulation_running": True,
    })

    return {"message": "Simulation started", "state": state}


@router.post("/simulation/pause")
async def pause_simulation():
    """Pause the simulation."""
    state = _get_sim_state()
    state["paused"] = True

    from ..services.websocket_manager import ws_manager
    await ws_manager.broadcast_machine_state("ROBOT-01", {
        "status": "paused",
        "simulation_running": True,
        "simulation_paused": True,
    })

    return {"message": "Simulation paused"}


@router.post("/simulation/resume")
async def resume_simulation():
    """Resume a paused simulation."""
    state = _get_sim_state()
    state["paused"] = False

    from ..services.websocket_manager import ws_manager
    await ws_manager.broadcast_machine_state("ROBOT-01", {
        "status": "running",
        "simulation_running": True,
        "simulation_paused": False,
    })

    return {"message": "Simulation resumed"}


@router.post("/simulation/stop")
async def stop_simulation(db: Session = Depends(get_db)):
    """Stop the simulation."""
    state = _get_sim_state()
    state["running"] = False
    state["paused"] = False

    machine = db.query(Machine).filter(Machine.id == "ROBOT-01").first()
    if machine:
        machine.operating_status = "stopped"
        db.commit()

    from ..services.websocket_manager import ws_manager
    await ws_manager.broadcast_machine_state("ROBOT-01", {
        "status": "stopped",
        "simulation_running": False,
    })

    return {"message": "Simulation stopped"}


@router.post("/simulation/emergency-stop")
async def emergency_stop(db: Session = Depends(get_db)):
    """
    Trigger simulated emergency stop.
    NOTE: This is a SOFTWARE SIMULATION only. Real industrial robots
    require certified hardware safety interlocks and E-stop circuits.
    """
    state = _get_sim_state()
    state["emergency_stop"] = True
    state["paused"] = True

    machine = db.query(Machine).filter(Machine.id == "ROBOT-01").first()
    if machine:
        machine.operating_status = "emergency_stop"
        db.commit()

    # Create fault event
    fault = FaultEvent(
        machine_id="ROBOT-01",
        fault_type="emergency_stop",
        severity="critical",
        description="[SIMULATED] Emergency stop activated. All motion halted.",
        recommended_action="Clear the emergency condition, inspect the machine, then reset.",
        status="active",
    )
    db.add(fault)
    db.commit()

    from ..services.websocket_manager import ws_manager
    await ws_manager.broadcast_machine_state("ROBOT-01", {
        "status": "emergency_stop",
        "simulation_running": True,
        "emergency_stop": True,
    })
    await ws_manager.broadcast_fault({
        "id": fault.id,
        "fault_type": "emergency_stop",
        "severity": "critical",
        "description": fault.description,
    })

    return {"message": "Emergency stop activated (SIMULATED)"}


@router.post("/simulation/reset")
async def reset_simulation(db: Session = Depends(get_db)):
    """Reset simulation state. Clears faults, resets machine state."""
    state = _get_sim_state()
    state["running"] = False
    state["paused"] = False
    state["emergency_stop"] = False
    state["tick"] = 0
    state["started_at"] = None

    # Clear simulator faults
    simulator.clear_all_faults()
    fault_detector.clear_dedup_for_machine("ROBOT-01")

    # Reset machine
    machine = db.query(Machine).filter(Machine.id == "ROBOT-01").first()
    if machine:
        machine.operating_status = "idle"
        machine.health_score = 100
        db.commit()

    # Resolve all active alerts
    active_faults = db.query(FaultEvent).filter(
        FaultEvent.status.in_(["active", "acknowledged"])
    ).all()
    for f in active_faults:
        f.status = "resolved"
        f.resolved_at = datetime.now(timezone.utc)
        f.resolution_notes = "Resolved by simulation reset"
    db.commit()

    from ..services.websocket_manager import ws_manager
    await ws_manager.broadcast_machine_state("ROBOT-01", {
        "status": "idle",
        "simulation_running": False,
        "health_score": 100,
    })

    return {"message": "Simulation reset complete"}


@router.post("/simulation/speed")
async def set_simulation_speed(speed: float = 1.0):
    """Set simulation speed (0.1x to 5x)."""
    speed = max(0.1, min(5.0, speed))
    state = _get_sim_state()
    state["speed"] = speed
    return {"message": f"Simulation speed set to {speed}x", "speed": speed}


@router.post("/simulation/faults")
async def inject_fault(body: FaultInjection, db: Session = Depends(get_db)):
    """Inject a simulated fault for demonstration."""
    simulator.inject_fault(body.fault_type, body.machine_id, body.value_override)

    from ..services.websocket_manager import ws_manager
    await ws_manager.broadcast("fault_injection", {
        "fault_type": body.fault_type,
        "machine_id": body.machine_id,
        "severity": body.severity,
    })

    return {
        "message": f"Fault injected: {body.fault_type}",
        "machine_id": body.machine_id,
        "active_faults": list(simulator.active_faults.keys()),
    }


@router.post("/simulation/faults/clear")
async def clear_faults(machine_id: str = "ROBOT-01", db: Session = Depends(get_db)):
    """Clear all simulated faults."""
    simulator.clear_all_faults()
    fault_detector.clear_dedup_for_machine(machine_id)

    # Reset machine status
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if machine:
        # Recalculate based on remaining DB faults
        health = fault_detector.calculate_health_score(machine_id, db)
        machine.health_score = health
        active_count = db.query(FaultEvent).filter(
            FaultEvent.machine_id == machine_id,
            FaultEvent.status.in_(["active", "acknowledged"])
        ).count()
        if active_count == 0:
            machine.operating_status = "running" if _get_sim_state()["running"] else "idle"
        db.commit()

    from ..services.websocket_manager import ws_manager
    await ws_manager.broadcast_machine_state(machine_id, {
        "status": machine.operating_status if machine else "idle",
        "faults_cleared": True,
    })

    return {"message": "All simulated faults cleared"}
