"""
SmartFactory 4.0 - FastAPI Application Entry Point
Main application with startup initialization, CORS, routes, and WebSocket.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.config import settings
from .database import init_db, SessionLocal
from .services.websocket_manager import ws_manager
from .services.sensor_simulator import simulator
from .services.fault_detection import fault_detector
from .routes import machines, sensors, alerts, quality, production, simulation, analytics, maintenance

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Simulation state
simulation_state = {
    "running": False,
    "paused": False,
    "speed": 1.0,
    "emergency_stop": False,
    "tick": 0,
    "started_at": None,
}

# Background task reference
_sensor_task = None


async def sensor_loop():
    """Background task that generates and processes simulated sensor data."""
    logger.info("[SENSOR LOOP] Started")
    while True:
        try:
            if simulation_state["running"] and not simulation_state["paused"] and not simulation_state["emergency_stop"]:
                # Generate readings
                readings = simulator.generate_all_readings("ROBOT-01")

                # Store in database and evaluate faults
                db = SessionLocal()
                try:
                    from .models.sensor import SensorReading, Sensor
                    for reading in readings:
                        if reading["reading_value"] is not None:
                            sr = SensorReading(
                                machine_id=reading["machine_id"],
                                sensor_id=reading["sensor_id"],
                                reading_value=reading["reading_value"],
                                unit=reading["unit"],
                                source_type=reading["source_type"],
                            )
                            db.add(sr)

                            # Update sensor last reading
                            sensor = db.query(Sensor).filter(Sensor.id == reading["sensor_id"]).first()
                            if sensor:
                                sensor.last_reading = reading["reading_value"]
                                sensor.last_seen_at = datetime.now(timezone.utc)
                                sensor.connection_status = reading["connection_status"]

                        # Evaluate fault detection rules
                        fault_data = fault_detector.evaluate_reading(reading, db)
                        if fault_data:
                            await ws_manager.broadcast_fault(fault_data)

                            # Update machine state
                            machine_state = simulator.get_machine_state("ROBOT-01")
                            await ws_manager.broadcast_machine_state("ROBOT-01", machine_state)

                    db.commit()
                except Exception as e:
                    logger.error(f"[SENSOR LOOP] DB error: {e}")
                    db.rollback()
                finally:
                    db.close()

                # Broadcast readings to connected clients
                await ws_manager.broadcast_sensor_readings(readings)

                simulation_state["tick"] += 1

            # Wait for next cycle
            interval = settings.sensor_update_interval_ms / 1000.0 / simulation_state.get("speed", 1.0)
            await asyncio.sleep(max(0.5, interval))

        except asyncio.CancelledError:
            logger.info("[SENSOR LOOP] Cancelled")
            break
        except Exception as e:
            logger.error(f"[SENSOR LOOP] Error: {e}")
            await asyncio.sleep(2)


def seed_demo_data():
    """Create initial demo machine and sensors if not present."""
    db = SessionLocal()
    try:
        from .models.machine import Machine
        from .models.sensor import Sensor

        # Check if already seeded
        existing = db.query(Machine).filter(Machine.id == "ROBOT-01").first()
        if existing:
            logger.info("[SEED] Demo data already exists")
            return

        # Create demo robot
        robot = Machine(
            id="ROBOT-01",
            name="Industrial Robot Arm #1",
            machine_type="robot_arm",
            operating_status="idle",
            description="6-axis industrial robot arm for pick-and-place operations. Simulated for demonstration.",
            location="Main Production Floor - Station A",
            health_score=100,
        )
        db.add(robot)

        # Create demo conveyor
        conveyor = Machine(
            id="CONV-01",
            name="Production Conveyor #1",
            machine_type="conveyor",
            operating_status="idle",
            description="Main production conveyor belt. Simulated for demonstration.",
            location="Main Production Floor",
            health_score=100,
        )
        db.add(conveyor)

        # Create sensors for the robot
        sensors_config = [
            ("ROBOT-01_TEMP_01", "ROBOT-01", "temperature", "Temperature Sensor", "°C", 0, 120, 75, 90),
            ("ROBOT-01_VIB_01", "ROBOT-01", "vibration", "Vibration Sensor", "mm/s", 0, 20, 8, 12),
            ("ROBOT-01_CUR_01", "ROBOT-01", "motor_current", "Motor Current Sensor", "A", 0, 30, 15, 20),
            ("ROBOT-01_POS_base", "ROBOT-01", "position", "Base Joint Encoder", "deg", -180, 180, None, None),
            ("ROBOT-01_POS_shoulder", "ROBOT-01", "position", "Shoulder Joint Encoder", "deg", -90, 90, None, None),
            ("ROBOT-01_POS_elbow", "ROBOT-01", "position", "Elbow Joint Encoder", "deg", -135, 135, None, None),
            ("ROBOT-01_POS_wrist", "ROBOT-01", "position", "Wrist Joint Encoder", "deg", -180, 180, None, None),
            ("ROBOT-01_PROX_01", "ROBOT-01", "proximity", "Proximity Sensor", "bool", 0, 1, None, None),
            ("ROBOT-01_FORCE_01", "ROBOT-01", "force", "Gripper Force Sensor", "N", 0, 50, 30, 40),
        ]

        for sid, mid, stype, name, unit, minv, maxv, warn, crit in sensors_config:
            sensor = Sensor(
                id=sid,
                machine_id=mid,
                sensor_type=stype,
                name=name,
                unit=unit,
                min_value=minv,
                max_value=maxv,
                warning_threshold=warn,
                critical_threshold=crit,
                connection_status="connected",
            )
            db.add(sensor)

        db.commit()
        logger.info("[SEED] Demo data created successfully")

    except Exception as e:
        logger.error(f"[SEED] Error: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    global _sensor_task

    # Startup
    logger.info("=" * 60)
    logger.info(f"  SmartFactory 4.0 - Starting...")
    logger.info(f"  Version: {settings.app_version}")
    logger.info(f"  Database: {settings.database_url}")
    logger.info(f"  MQTT: {'Enabled' if settings.mqtt_enabled else 'Disabled (simulation mode)'}")
    logger.info("=" * 60)

    # Initialize database
    init_db()
    seed_demo_data()

    # Start sensor loop
    _sensor_task = asyncio.create_task(sensor_loop())

    # Auto-start if configured
    if settings.simulation_auto_start:
        simulation_state["running"] = True
        simulation_state["started_at"] = datetime.now(timezone.utc).isoformat()
        logger.info("[SIM] Auto-started simulation")

    yield

    # Shutdown
    if _sensor_task:
        _sensor_task.cancel()
        try:
            await _sensor_task
        except asyncio.CancelledError:
            pass
    logger.info("SmartFactory 4.0 - Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="SmartFactory 4.0 API",
    description="Intelligent Digital Twin and Industrial Monitoring Platform API",
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(machines.router, prefix="/api", tags=["Machines"])
app.include_router(sensors.router, prefix="/api", tags=["Sensors"])
app.include_router(alerts.router, prefix="/api", tags=["Alerts"])
app.include_router(quality.router, prefix="/api", tags=["Quality"])
app.include_router(production.router, prefix="/api", tags=["Production"])
app.include_router(simulation.router, prefix="/api", tags=["Simulation"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(maintenance.router, prefix="/api", tags=["Maintenance"])


# ─── Health Check ──────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "simulation": simulation_state,
        "websocket_clients": ws_manager.connection_count,
        "mqtt_enabled": settings.mqtt_enabled,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─── WebSocket Endpoint ───────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, handle client messages
            data = await websocket.receive_text()
            # Could handle client commands here
            logger.debug(f"[WS] Received: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"[WS] Error: {e}")
        ws_manager.disconnect(websocket)
