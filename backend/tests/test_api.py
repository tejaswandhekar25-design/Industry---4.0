"""
SmartFactory 4.0 - Backend Test Suite
Automated tests for health check, machine endpoints, simulation, alerts, and production metrics.
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_check(client):
    """Verify health endpoint returns status, version, and simulation state."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "simulation" in data


def test_get_machines(client):
    """Verify machine listing."""
    response = client.get("/api/machines")
    assert response.status_code == 200
    machines = response.json()
    assert isinstance(machines, list)
    assert len(machines) >= 1
    robot = next((m for m in machines if m["id"] == "ROBOT-01"), None)
    assert robot is not None
    assert robot["machine_type"] == "robot_arm"


def test_get_machine_sensors(client):
    """Verify sensors associated with ROBOT-01."""
    response = client.get("/api/machines/ROBOT-01/sensors")
    assert response.status_code == 200
    sensors = response.json()
    assert len(sensors) >= 4
    sensor_types = [s["sensor_type"] for s in sensors]
    assert "temperature" in sensor_types
    assert "vibration" in sensor_types
    assert "motor_current" in sensor_types


def test_simulation_lifecycle(client):
    """Verify starting, pausing, and resetting simulation."""
    res_start = client.post("/api/simulation/start")
    assert res_start.status_code == 200

    res_pause = client.post("/api/simulation/pause")
    assert res_pause.status_code == 200

    res_resume = client.post("/api/simulation/resume")
    assert res_resume.status_code == 200

    res_reset = client.post("/api/simulation/reset")
    assert res_reset.status_code == 200


def test_fault_injection(client):
    """Inject a temperature fault."""
    payload = {
        "fault_type": "high_temperature",
        "machine_id": "ROBOT-01",
        "severity": "critical",
        "value_override": 98.5
    }
    res_inj = client.post("/api/simulation/faults", json=payload)
    assert res_inj.status_code == 200

    res_alerts = client.get("/api/alerts?machine_id=ROBOT-01")
    assert res_alerts.status_code == 200


def test_quality_inspection_creation(client):
    """Create a simulated inspection and verify summary."""
    insp_payload = {
        "product_id": "TEST-PROD-999",
        "machine_id": "ROBOT-01",
        "inspection_mode": "simulated",
        "result": "pass",
        "defect_type": "none"
    }
    res_create = client.post("/api/quality/inspections", json=insp_payload)
    assert res_create.status_code == 200
    data = res_create.json()
    assert data["product_id"] == "TEST-PROD-999"
    assert data["result"] == "pass"

    res_summary = client.get("/api/quality/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_inspected"] >= 1


def test_production_summary(client):
    """Verify production summary calculations."""
    response = client.get("/api/production/summary")
    assert response.status_code == 200
    data = response.json()
    assert "defect_rate" in data
    assert "total_products" in data
    assert "active_alerts" in data
