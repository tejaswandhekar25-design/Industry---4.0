"""
SmartFactory 4.0 - Core Configuration
Centralized application settings loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Application
    app_name: str = "SmartFactory 4.0"
    app_version: str = "1.0.0"
    debug: bool = True
    
    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    
    # Database
    database_url: str = "sqlite:///./data/smartfactory.db"
    
    # Security
    secret_key: str = "smartfactory-dev-secret-change-in-production"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
    # MQTT
    mqtt_enabled: bool = False
    mqtt_broker_host: str = "localhost"
    mqtt_broker_port: int = 1883
    mqtt_username: Optional[str] = None
    mqtt_password: Optional[str] = None
    mqtt_topic_prefix: str = "smartfactory"
    
    # Simulation
    simulation_auto_start: bool = False
    sensor_update_interval_ms: int = 2000
    default_defect_probability: float = 0.15
    
    # Data Retention
    sensor_history_retention_hours: int = 24
    max_sensor_readings: int = 50000
    
    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
