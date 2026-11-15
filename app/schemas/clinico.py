from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.clinico import EstadoEstudio


class SolicitarEstudioRequest(BaseModel):
    cita_id: UUID
    tipo_estudio: str = Field(..., min_length=3, max_length=120, example="Biometría Hemática Completa")
    indicaciones: Optional[str] = Field(None, example="Acudir con ayuno de 8 horas")


class RegistrarResultadoEstudioRequest(BaseModel):
    resultado_texto: str = Field(..., min_length=3)
    archivo_url: Optional[str] = Field(None, max_length=255)


class EstudioResponse(BaseModel):
    id: UUID
    cita_id: UUID
    paciente_id: UUID
    doctor_id: UUID
    tipo_estudio: str
    indicaciones: Optional[str]
    estado: EstadoEstudio
    resultado_texto: Optional[str]
    archivo_url: Optional[str]
    fecha_solicitud: datetime
    fecha_resultado: Optional[datetime]

    class Config:
        from_attributes = True


class MedicamentoItemCreate(BaseModel):
    nombre_medicamento: str = Field(..., min_length=2, max_length=120, example="Amoxicilina 500mg")
    dosis: str = Field(..., min_length=1, max_length=80, example="1 cápsula")
    frecuencia_horas: int = Field(..., gt=0, le=72, example=8)
    duracion_dias: int = Field(..., gt=0, le=90, example=5)
    indicaciones_extra: Optional[str] = Field(None, max_length=255, example="Tomar después de alimentos")


class EmitirRecetaRequest(BaseModel):
    cita_id: UUID
    diagnostico: str = Field(..., min_length=3)
    observaciones: Optional[str] = None
    medicamentos: List[MedicamentoItemCreate] = Field(..., min_length=1)


class MedicamentoResponse(MedicamentoItemCreate):
    id: UUID

    class Config:
        from_attributes = True


class RecetaResponse(BaseModel):
    id: UUID
    cita_id: UUID
    paciente_id: UUID
    doctor_id: UUID
    diagnostico: str
    observaciones: Optional[str]
    fecha_emision: datetime
    medicamentos: List[MedicamentoResponse]


class TomaResponse(BaseModel):
    id: UUID
    medicamento_id: UUID
    nombre_medicamento: str
    dosis: str
    fecha_hora_programada: datetime
    tomada: bool
    fecha_hora_toma: Optional[datetime]