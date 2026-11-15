from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import requerir_tutor
from app.models.usuario import Usuario
from app.schemas.tutor import (
    DependienteResponse,
    RegistrarDependienteRequest,
    VincularPacienteExistenteRequest,
)
from app.services.tutor_service import TutorService

router = APIRouter(prefix="/tutores", tags=["Tutores y Dependientes"])


@router.post("/dependientes", response_model=DependienteResponse, status_code=status.HTTP_201_CREATED)
def crear_dependiente(
    datos: RegistrarDependienteRequest,
    tutor: Usuario = Depends(requerir_tutor),
    db: Session = Depends(get_db),
):
    return TutorService.registrar_dependiente(db, tutor.id, datos)


@router.post("/vincular", response_model=DependienteResponse, status_code=status.HTTP_201_CREATED)
def vincular_adulto(
    datos: VincularPacienteExistenteRequest,
    tutor: Usuario = Depends(requerir_tutor),
    db: Session = Depends(get_db),
):
    return TutorService.vincular_paciente_existente(db, tutor.id, datos)


@router.get("/dependientes", response_model=List[DependienteResponse])
def obtener_mis_dependientes(
    tutor: Usuario = Depends(requerir_tutor),
    db: Session = Depends(get_db),
):
    return TutorService.listar_dependientes(db, tutor.id)


@router.delete("/vinculos/{vinculo_id}")
def desactivar_vinculo(
    vinculo_id: UUID,
    tutor: Usuario = Depends(requerir_tutor),
    db: Session = Depends(get_db),
):
    return TutorService.revocar_vinculo(db, tutor.id, vinculo_id)