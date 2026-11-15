from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import obtener_usuario_actual, requerir_doctor
from app.models.usuario import Usuario, Doctor
from app.models.cita import Disponibilidad, Cita
from app.schemas.cita import (
    ActualizarEstadoCitaRequest,
    AgendarCitaRequest,
    CitaResponse,
    DisponibilidadCreate,
    DisponibilidadResponse,
    ReprogramarCitaRequest,
)
from app.services.cita_service import CitaService

router = APIRouter(prefix="/citas", tags=["Disponibilidad y Citas"])

@router.get("/doctores")
def listar_doctores(db: Session = Depends(get_db)):
    resultados = (
        db.query(Usuario.id, Usuario.nombre, Doctor.especialidad, Doctor.cedula)
        .join(Doctor, Usuario.id == Doctor.usuario_id)
        .all()
    )
    return [
        {"doctor_id": str(r.id), "nombre": r.nombre, "especialidad": r.especialidad, "cedula": r.cedula}
        for r in resultados
    ]

@router.post("/disponibilidad", response_model=DisponibilidadResponse, status_code=status.HTTP_201_CREATED)
def configurar_disponibilidad(
    datos: DisponibilidadCreate,
    doctor: Usuario = Depends(requerir_doctor),
    db: Session = Depends(get_db)
):
    return CitaService.agregar_disponibilidad(db, doctor.id, datos)

@router.get("/disponibilidad/{doctor_id}", response_model=List[DisponibilidadResponse])
def ver_disponibilidad_doctor(doctor_id: UUID, db: Session = Depends(get_db)):
    return db.query(Disponibilidad).filter(Disponibilidad.doctor_id == doctor_id).all()

@router.get("/horarios-libres/{doctor_id}", response_model=List[str])
def obtener_horarios_libres(
    doctor_id: UUID,
    fecha: date = Query(..., description="Formato YYYY-MM-DD"),
    paciente_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    return CitaService.calcular_horarios_libres(db, doctor_id, fecha, paciente_id)

@router.post("/", response_model=CitaResponse, status_code=status.HTTP_201_CREATED)
def agendar_cita(
    datos: AgendarCitaRequest,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db)
):
    return CitaService.agendar_cita(db, usuario, datos)

@router.get("/mis-citas", response_model=List[CitaResponse])
def listar_mis_citas(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db)
):
    return db.query(Cita).filter(Cita.agendada_por == usuario.id).all()
@router.get("/agenda-doctor", response_model=List[CitaResponse])
def ver_agenda_doctor(
    doctor: Usuario = Depends(requerir_doctor),
    db: Session = Depends(get_db),
):
    return (
        db.query(Cita)
        .filter(Cita.doctor_id == doctor.id)
        .order_by(Cita.fecha_hora.asc())
        .all()
    )


@router.patch("/{cita_id}/reprogramar", response_model=CitaResponse)
def reprogramar_cita(
    cita_id: UUID,
    datos: ReprogramarCitaRequest,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    return CitaService.reprogramar_cita(db, usuario, cita_id, datos)


@router.patch("/{cita_id}/cancelar", response_model=CitaResponse)
def cancelar_cita(
    cita_id: UUID,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    return CitaService.cancelar_cita(db, usuario, cita_id)


@router.patch("/{cita_id}/asistencia", response_model=CitaResponse)
def marcar_asistencia(
    cita_id: UUID,
    datos: ActualizarEstadoCitaRequest,
    doctor: Usuario = Depends(requerir_doctor),
    db: Session = Depends(get_db),
):
    return CitaService.registrar_asistencia_doctor(db, doctor.id, cita_id, datos.estado)

