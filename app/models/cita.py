import enum
import uuid
from sqlalchemy import Column, String, SmallInteger, Time, DateTime, Boolean, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class EstadoCita(str, enum.Enum):
    SOLICITADA = "SOLICITADA"
    CONFIRMADA = "CONFIRMADA"
    REPROGRAMADA = "REPROGRAMADA"
    RECORDADA = "RECORDADA"
    ATENDIDA = "ATENDIDA"
    NO_ASISTIO = "NO_ASISTIO"
    CANCELADA = "CANCELADA"

class Disponibilidad(Base):
    __tablename__ = "disponibilidades"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctores.usuario_id"), nullable=False)
    dia_semana = Column(SmallInteger, nullable=False)  # 0 = Lunes ... 6 = Domingo (Python weekday)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    duracion_cita_min = Column(SmallInteger, nullable=False)

class Cita(Base):
    __tablename__ = "citas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctores.usuario_id"), nullable=False)
    paciente_id = Column(UUID(as_uuid=True), ForeignKey("pacientes.id"), nullable=False)
    agendada_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    fecha_hora = Column(DateTime, nullable=False)
    estado = Column(Enum(EstadoCita), default=EstadoCita.CONFIRMADA, nullable=False)
    asistencia_confirmada = Column(Boolean, default=False, nullable=False)
    cancelacion_tardia = Column(Boolean, default=False, nullable=False)
    motivo = Column(String(255), nullable=True)