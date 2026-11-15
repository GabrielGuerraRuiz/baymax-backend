from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegistrarDependienteRequest(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=120)
    fecha_nacimiento: date
    parentesco: str = Field(..., min_length=2, max_length=40, example="Hijo")


class VincularPacienteExistenteRequest(BaseModel):
    correo_paciente: EmailStr
    parentesco: str = Field(..., min_length=2, max_length=40, example="Madre")


class DependienteResponse(BaseModel):
    vinculo_id: UUID
    paciente_id: UUID
    nombre: str
    fecha_nacimiento: date
    parentesco: str
    activo: bool
    fecha_vinculo: datetime