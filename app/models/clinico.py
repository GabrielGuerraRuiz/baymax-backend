import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class EstadoEstudio(str, enum.Enum):
    SOLICITADO = "SOLICITADO"
    EN_PROCESO = "EN_PROCESO"
    COMPLETADO = "COMPLETADO"
    CANCELADO = "CANCELADO"


class Estudio(Base):
    __tablename__ = "estudios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cita_id = Column(UUID(as_uuid=True), ForeignKey("citas.id"), nullable=False)
    paciente_id = Column(UUID(as_uuid=True), ForeignKey("pacientes.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctores.usuario_id"), nullable=False)
    tipo_estudio = Column(String(120), nullable=False)
    indicaciones = Column(Text, nullable=True)
    estado = Column(Enum(EstadoEstudio), default=EstadoEstudio.SOLICITADO, nullable=False)
    resultado_texto = Column(Text, nullable=True)
    archivo_url = Column(String(255), nullable=True)
    fecha_solicitud = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    fecha_resultado = Column(DateTime(timezone=True), nullable=True)


class Receta(Base):
    __tablename__ = "recetas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cita_id = Column(UUID(as_uuid=True), ForeignKey("citas.id"), unique=True, nullable=False)
    paciente_id = Column(UUID(as_uuid=True), ForeignKey("pacientes.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctores.usuario_id"), nullable=False)
    diagnostico = Column(Text, nullable=False)
    observaciones = Column(Text, nullable=True)
    fecha_emision = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class MedicamentoRecetado(Base):
    __tablename__ = "medicamentos_recetados"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receta_id = Column(UUID(as_uuid=True), ForeignKey("recetas.id"), nullable=False)
    nombre_medicamento = Column(String(120), nullable=False)
    dosis = Column(String(80), nullable=False)
    frecuencia_horas = Column(Integer, nullable=False)
    duracion_dias = Column(Integer, nullable=False)
    indicaciones_extra = Column(String(255), nullable=True)


class TomaMedicamento(Base):
    __tablename__ = "tomas_medicamento"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medicamento_id = Column(
        UUID(as_uuid=True), ForeignKey("medicamentos_recetados.id"), nullable=False
    )
    paciente_id = Column(UUID(as_uuid=True), ForeignKey("pacientes.id"), nullable=False)
    fecha_hora_programada = Column(DateTime(timezone=True), nullable=False)
    tomada = Column(Boolean, default=False, nullable=False)
    fecha_hora_toma = Column(DateTime(timezone=True), nullable=True)