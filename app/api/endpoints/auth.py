from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import RegistroUsuarioRequest, LoginRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/registro", status_code=status.HTTP_201_CREATED)
def registrar(datos: RegistroUsuarioRequest, db: Session = Depends(get_db)):
    usuario = AuthService.registrar_usuario(db, datos)
    return {
        "mensaje": "Usuario registrado correctamente",
        "id": str(usuario.id),
        "rol": usuario.rol
    }

@router.post("/login", response_model=TokenResponse)
def login(credenciales: LoginRequest, db: Session = Depends(get_db)):
    return AuthService.iniciar_sesion(db, credenciales)