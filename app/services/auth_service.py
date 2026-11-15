from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.usuario import Usuario, Doctor, Tutor, Paciente, RolUsuario
from app.schemas.auth import RegistroUsuarioRequest, LoginRequest, TokenResponse
from app.core.security import hashear_contrasena, verificar_contrasena, crear_token_acceso

class AuthService:
    @staticmethod
    def registrar_usuario(db: Session, datos: RegistroUsuarioRequest) -> Usuario:
        existente = db.query(Usuario).filter(Usuario.correo == datos.correo).first()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ya está registrado."
            )

        nuevo_usuario = Usuario(
            correo=datos.correo,
            contrasena_hash=hashear_contrasena(datos.contrasena),
            nombre=datos.nombre,
            telefono=datos.telefono,
            rol=datos.rol
        )
        db.add(nuevo_usuario)
        db.flush()  # Obtiene el UUID generado antes de confirmar la transacción

        if datos.rol == RolUsuario.DOCTOR:
            db.add(Doctor(
                usuario_id=nuevo_usuario.id,
                cedula=datos.cedula,
                especialidad=datos.especialidad
            ))
        elif datos.rol == RolUsuario.TUTOR:
            db.add(Tutor(usuario_id=nuevo_usuario.id))
        elif datos.rol == RolUsuario.PACIENTE:
            db.add(Paciente(
                nombre=datos.nombre,
                fecha_nacimiento=datos.fecha_nacimiento,
                usuario_id=nuevo_usuario.id
            ))

        db.commit()
        db.refresh(nuevo_usuario)
        return nuevo_usuario

    @staticmethod
    def iniciar_sesion(db: Session, credenciales: LoginRequest) -> TokenResponse:
        usuario = db.query(Usuario).filter(Usuario.correo == credenciales.correo).first()
        # Mensaje genérico para cumplir con CU-01 Alt 2 y PA-02
        if not usuario or not verificar_contrasena(credenciales.contrasena, usuario.contrasena_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas."
            )

        token = crear_token_acceso(str(usuario.id), usuario.rol.value)
        return TokenResponse(
            access_token=token,
            rol=usuario.rol,
            usuario_id=usuario.id,
            nombre=usuario.nombre
        )