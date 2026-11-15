from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import obtener_usuario_actual
from app.models.usuario import Usuario
from app.schemas.asistente import ChatRequest, ChatResponse
from app.services.asistente_service import AsistenteService

router = APIRouter(prefix="/asistente", tags=["Asistente Virtual Baymax (IA)"])


@router.post("/chat", response_model=ChatResponse)
def conversar_con_baymax(
    datos: ChatRequest,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    return AsistenteService.procesar_mensaje(db, usuario, datos.mensaje)