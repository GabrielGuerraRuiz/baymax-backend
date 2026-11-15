import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base

class RolUsuario(str, enum.Enum):
    DOCTOR = "DOCTOR"
    PACIENTE = "PACIENTE"
    TUTOR = "TUTOR"

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    correo = Column(String(120), unique=True, nullable=False, index=True)
    contrasena_hash = Column(String(255), nullable=False)
    nombre = Column(String(120), nullable=False)
    telefono = Column(String(20), nullable=True)
    rol = Column(Enum(RolUsuario), nullable=False)

class Doctor(Base):
    __tablename__ = "doctores"

    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), primary_key=True)
    cedula = Column(String(20), nullable=False)
    especialidad = Column(String(80), nullable=False)

class Tutor(Base):
    __tablename__ = "tutores"

    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), primary_key=True)

class Paciente(Base):
    __tablename__ = "pacientes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(120), nullable=False)
    fecha_nacimiento = Column(Date, nullable=False)
    # Opcional porque los dependientes menores de edad no tienen cuenta propia
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)

class VinculoTutor(Base):
    __tablename__ = "vinculos_tutor"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutor_id = Column(UUID(as_uuid=True), ForeignKey("tutores.usuario_id"), nullable=False)
    paciente_id = Column(UUID(as_uuid=True), ForeignKey("pacientes.id"), nullable=False)
    parentesco = Column(String(40), nullable=False)  # Ej. "Padre", "Madre", "Hijo/a", "Tutor legal"
    activo = Column(Boolean, default=True, nullable=False)
    fecha_vinculo = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )