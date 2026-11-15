from datetime import date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, model_validator
from app.models.usuario import RolUsuario

class RegistroUsuarioRequest(BaseModel):
    correo: EmailStr
    contrasena: str = Field(..., min_length=6)
    nombre: str = Field(..., min_length=2, max_length=120)
    telefono: Optional[str] = Field(None, max_length=20)
    rol: RolUsuario
    # Campos condicionales según rol
    cedula: Optional[str] = Field(None, max_length=20)
    especialidad: Optional[str] = Field(None, max_length=80)
    fecha_nacimiento: Optional[date] = None

    @model_validator(mode="after")
    def validar_campos_por_rol(self):
        if self.rol == RolUsuario.DOCTOR and (not self.cedula or not self.especialidad):
            raise ValueError("Un doctor debe proporcionar cédula profesional y especialidad.")
        if self.rol == RolUsuario.PACIENTE:
            if not self.fecha_nacimiento:
                raise ValueError("Un paciente con cuenta propia debe indicar su fecha de nacimiento.")
            hoy = date.today()
            edad = hoy.year - self.fecha_nacimiento.year - (
                (hoy.month, hoy.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
            )
            if edad < 18:
                raise ValueError("Los menores de 18 años deben ser registrados por un tutor (RN-14).")
        return self

class LoginRequest(BaseModel):
    correo: EmailStr
    contrasena: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: RolUsuario
    usuario_id: UUID
    nombre: str