from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import obtener_usuario_actual, requerir_doctor
from app.models.usuario import Usuario
from app.schemas.clinico import (
    EmitirRecetaRequest,
    EstudioResponse,
    RecetaResponse,
    RegistrarResultadoEstudioRequest,
    SolicitarEstudioRequest,
    TomaResponse,
)
from app.services.clinico_service import ClinicoService

router = APIRouter(prefix="/clinico", tags=["Estudios Clínicos y Recetas"])


@router.post("/estudios", response_model=EstudioResponse, status_code=status.HTTP_201_CREATED)
def ordenar_estudio(
    datos: SolicitarEstudioRequest,
    doctor: Usuario = Depends(requerir_doctor),
    db: Session = Depends(get_db),
):
    return ClinicoService.solicitar_estudio(db, doctor.id, datos)


@router.patch("/estudios/{estudio_id}/resultado", response_model=EstudioResponse)
def subir_resultado_estudio(
    estudio_id: UUID,
    datos: RegistrarResultadoEstudioRequest,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    return ClinicoService.registrar_resultado_estudio(db, usuario, estudio_id, datos)


@router.get("/estudios/paciente/{paciente_id}", response_model=List[EstudioResponse])
def consultar_estudios_paciente(
    paciente_id: UUID,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    return ClinicoService.listar_estudios_paciente(db, usuario, paciente_id)


@router.post("/recetas", response_model=RecetaResponse, status_code=status.HTTP_201_CREATED)
def crear_receta(
    datos: EmitirRecetaRequest,
    doctor: Usuario = Depends(requerir_doctor),
    db: Session = Depends(get_db),
):
    return ClinicoService.emitir_receta(db, doctor.id, datos)


@router.get("/tomas/paciente/{paciente_id}", response_model=List[TomaResponse])
def consultar_cronograma_tomas(
    paciente_id: UUID,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    return ClinicoService.listar_tomas_paciente(db, usuario, paciente_id)


@router.patch("/tomas/{toma_id}/marcar")
def confirmar_toma(
    toma_id: UUID,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    return ClinicoService.marcar_toma_completada(db, usuario, toma_id)