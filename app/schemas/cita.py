from datetime import time, datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, model_validator
from app.models.cita import EstadoCita

class DisponibilidadCreate(BaseModel):
    dia_semana: int = Field(..., ge=0, le=6, description="0=Lunes, 1=Martes, ..., 6=Domingo")
    hora_inicio: time
    hora_fin: time
    duracion_cita_min: int = Field(..., gt=0, le=180)

    @model_validator(mode="after")
    def validar_horas(self):
        if self.hora_inicio >= self.hora_fin:
            raise ValueError("La hora de inicio debe ser estrictamente menor que la hora de fin.")
        return self

class DisponibilidadResponse(DisponibilidadCreate):
    id: UUID
    doctor_id: UUID

    class Config:
        from_attributes = True

class AgendarCitaRequest(BaseModel):
    doctor_id: UUID
    paciente_id: Optional[UUID] = None  # Obligatorio si agenda un tutor; opcional si es el propio paciente
    fecha_hora: datetime
    motivo: Optional[str] = Field(None, max_length=255)

class CitaResponse(BaseModel):
    id: UUID
    doctor_id: UUID
    paciente_id: UUID
    agendada_por: UUID
    fecha_hora: datetime
    estado: EstadoCita
    motivo: Optional[str]

    class Config:
        from_attributes = True