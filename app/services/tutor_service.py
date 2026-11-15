from typing import List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.usuario import Paciente, RolUsuario, Usuario, VinculoTutor
from app.schemas.tutor import (
    DependienteResponse,
    RegistrarDependienteRequest,
    VincularPacienteExistenteRequest,
)


class TutorService:
    @staticmethod
    def registrar_dependiente(
        db: Session, tutor_id: UUID, datos: RegistrarDependienteRequest
    ) -> DependienteResponse:
        # Crea el registro clínico del paciente sin cuenta de usuario (usuario_id=None)
        nuevo_paciente = Paciente(
            nombre=datos.nombre,
            fecha_nacimiento=datos.fecha_nacimiento,
            usuario_id=None,
        )
        db.add(nuevo_paciente)
        db.flush()

        vinculo = VinculoTutor(
            tutor_id=tutor_id,
            paciente_id=nuevo_paciente.id,
            parentesco=datos.parentesco,
            activo=True,
        )
        db.add(vinculo)
        db.commit()
        db.refresh(vinculo)
        db.refresh(nuevo_paciente)

        return DependienteResponse(
            vinculo_id=vinculo.id,
            paciente_id=nuevo_paciente.id,
            nombre=nuevo_paciente.nombre,
            fecha_nacimiento=nuevo_paciente.fecha_nacimiento,
            parentesco=vinculo.parentesco,
            activo=vinculo.activo,
            fecha_vinculo=vinculo.fecha_vinculo,
        )

    @staticmethod
    def vincular_paciente_existente(
        db: Session, tutor_id: UUID, datos: VincularPacienteExistenteRequest
    ) -> DependienteResponse:
        usuario_pac = (
            db.query(Usuario)
            .filter(Usuario.correo == datos.correo_paciente, Usuario.rol == RolUsuario.PACIENTE)
            .first()
        )
        if not usuario_pac:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No existe un paciente registrado con ese correo electrónico.",
            )

        paciente = db.query(Paciente).filter(Paciente.usuario_id == usuario_pac.id).first()
        if not paciente:
            raise HTTPException(status_code=404, detail="Perfil de paciente no encontrado.")

        vinculo_previo = (
            db.query(VinculoTutor)
            .filter(
                VinculoTutor.tutor_id == tutor_id,
                VinculoTutor.paciente_id == paciente.id,
                VinculoTutor.activo.is_(True),
            )
            .first()
        )
        if vinculo_previo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este paciente ya se encuentra vinculado activamente a tu cuenta.",
            )

        nuevo_vinculo = VinculoTutor(
            tutor_id=tutor_id,
            paciente_id=paciente.id,
            parentesco=datos.parentesco,
            activo=True,
        )
        db.add(nuevo_vinculo)
        db.commit()
        db.refresh(nuevo_vinculo)

        return DependienteResponse(
            vinculo_id=nuevo_vinculo.id,
            paciente_id=paciente.id,
            nombre=paciente.nombre,
            fecha_nacimiento=paciente.fecha_nacimiento,
            parentesco=nuevo_vinculo.parentesco,
            activo=nuevo_vinculo.activo,
            fecha_vinculo=nuevo_vinculo.fecha_vinculo,
        )

    @staticmethod
    def listar_dependientes(db: Session, tutor_id: UUID) -> List[DependienteResponse]:
        resultados = (
            db.query(VinculoTutor, Paciente)
            .join(Paciente, VinculoTutor.paciente_id == Paciente.id)
            .filter(VinculoTutor.tutor_id == tutor_id, VinculoTutor.activo.is_(True))
            .all()
        )
        return [
            DependienteResponse(
                vinculo_id=v.id,
                paciente_id=p.id,
                nombre=p.nombre,
                fecha_nacimiento=p.fecha_nacimiento,
                parentesco=v.parentesco,
                activo=v.activo,
                fecha_vinculo=v.fecha_vinculo,
            )
            for v, p in resultados
        ]

    @staticmethod
    def revocar_vinculo(db: Session, tutor_id: UUID, vinculo_id: UUID) -> dict:
        vinculo = (
            db.query(VinculoTutor)
            .filter(VinculoTutor.id == vinculo_id, VinculoTutor.tutor_id == tutor_id)
            .first()
        )
        if not vinculo:
            raise HTTPException(status_code=404, detail="Vínculo no encontrado.")

        vinculo.activo = False
        db.commit()
        return {"mensaje": "Vínculo revocado correctamente. El historial clínico se conserva."}