from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.cita import Cita, EstadoCita
from app.models.clinico import (
    Estudio,
    EstadoEstudio,
    MedicamentoRecetado,
    Receta,
    TomaMedicamento,
)
from app.models.usuario import Paciente, RolUsuario, Usuario, VinculoTutor
from app.schemas.clinico import (
    EmitirRecetaRequest,
    MedicamentoResponse,
    RecetaResponse,
    RegistrarResultadoEstudioRequest,
    SolicitarEstudioRequest,
    TomaResponse,
)


class ClinicoService:
    @staticmethod
    def _verificar_acceso_paciente(db: Session, solicitante: Usuario, paciente_id: UUID) -> None:
        if solicitante.rol == RolUsuario.PACIENTE:
            pac = db.query(Paciente).filter(Paciente.usuario_id == solicitante.id).first()
            if not pac or pac.id != paciente_id:
                raise HTTPException(status_code=403, detail="No tienes permiso sobre este expediente.")
        elif solicitante.rol == RolUsuario.TUTOR:
            vinculo = (
                db.query(VinculoTutor)
                .filter(
                    VinculoTutor.tutor_id == solicitante.id,
                    VinculoTutor.paciente_id == paciente_id,
                    VinculoTutor.activo.is_(True),
                )
                .first()
            )
            if not vinculo:
                raise HTTPException(status_code=403, detail="No tienes vínculo activo con este paciente.")

    @staticmethod
    def solicitar_estudio(
        db: Session, doctor_id: UUID, datos: SolicitarEstudioRequest
    ) -> Estudio:
        cita = db.query(Cita).filter(Cita.id == datos.cita_id, Cita.doctor_id == doctor_id).first()
        if not cita:
            raise HTTPException(status_code=404, detail="Cita no encontrada en tu agenda médica.")

        if cita.estado == EstadoCita.CANCELADA:
            raise HTTPException(status_code=400, detail="No se pueden ordenar estudios en una cita cancelada.")

        estudio = Estudio(
            cita_id=cita.id,
            paciente_id=cita.paciente_id,
            doctor_id=doctor_id,
            tipo_estudio=datos.tipo_estudio,
            indicaciones=datos.indicaciones,
            estado=EstadoEstudio.SOLICITADO,
        )
        db.add(estudio)
        db.commit()
        db.refresh(estudio)
        return estudio

    @staticmethod
    def registrar_resultado_estudio(
        db: Session, solicitante: Usuario, estudio_id: UUID, datos: RegistrarResultadoEstudioRequest
    ) -> Estudio:
        estudio = db.query(Estudio).filter(Estudio.id == estudio_id).first()
        if not estudio:
            raise HTTPException(status_code=404, detail="Orden de estudio no encontrada.")

        if solicitante.rol == RolUsuario.DOCTOR and estudio.doctor_id != solicitante.id:
            raise HTTPException(status_code=403, detail="Solo el doctor solicitante puede actualizar este estudio.")
        elif solicitante.rol in [RolUsuario.PACIENTE, RolUsuario.TUTOR]:
            ClinicoService._verificar_acceso_paciente(db, solicitante, estudio.paciente_id)

        estudio.resultado_texto = datos.resultado_texto
        estudio.archivo_url = datos.archivo_url
        estudio.estado = EstadoEstudio.COMPLETADO
        estudio.fecha_resultado = datetime.now(timezone.utc)

        db.commit()
        db.refresh(estudio)
        return estudio

    @staticmethod
    def listar_estudios_paciente(
        db: Session, solicitante: Usuario, paciente_id: UUID
    ) -> List[Estudio]:
        if solicitante.rol != RolUsuario.DOCTOR:
            ClinicoService._verificar_acceso_paciente(db, solicitante, paciente_id)

        return (
            db.query(Estudio)
            .filter(Estudio.paciente_id == paciente_id)
            .order_by(Estudio.fecha_solicitud.desc())
            .all()
        )

    @staticmethod
    def emitir_receta(
        db: Session, doctor_id: UUID, datos: EmitirRecetaRequest
    ) -> RecetaResponse:
        cita = db.query(Cita).filter(Cita.id == datos.cita_id, Cita.doctor_id == doctor_id).first()
        if not cita:
            raise HTTPException(status_code=404, detail="Cita no encontrada en tu agenda médica.")

        if cita.estado == EstadoCita.CANCELADA:
            raise HTTPException(status_code=400, detail="No se puede emitir receta para una cita cancelada.")

        receta_previa = db.query(Receta).filter(Receta.cita_id == cita.id).first()
        if receta_previa:
            raise HTTPException(status_code=400, detail="Esta cita ya cuenta con una receta emitida.")

        nueva_receta = Receta(
            cita_id=cita.id,
            paciente_id=cita.paciente_id,
            doctor_id=doctor_id,
            diagnostico=datos.diagnostico,
            observaciones=datos.observaciones,
        )
        db.add(nueva_receta)
        db.flush()

        ahora = datetime.now(timezone.utc)
        meds_guardados: List[MedicamentoResponse] = []

        for item in datos.medicamentos:
            med = MedicamentoRecetado(
                receta_id=nueva_receta.id,
                nombre_medicamento=item.nombre_medicamento,
                dosis=item.dosis,
                frecuencia_horas=item.frecuencia_horas,
                duracion_dias=item.duracion_dias,
                indicaciones_extra=item.indicaciones_extra,
            )
            db.add(med)
            db.flush()

            # Generar cronograma automático de tomas (total_horas / frecuencia_horas)
            total_tomas = (item.duracion_dias * 24) // item.frecuencia_horas
            for i in range(total_tomas):
                toma = TomaMedicamento(
                    medicamento_id=med.id,
                    paciente_id=cita.paciente_id,
                    fecha_hora_programada=ahora + timedelta(hours=i * item.frecuencia_horas),
                    tomada=False,
                )
                db.add(toma)

            meds_guardados.append(
                MedicamentoResponse(
                    id=med.id,
                    nombre_medicamento=med.nombre_medicamento,
                    dosis=med.dosis,
                    frecuencia_horas=med.frecuencia_horas,
                    duracion_dias=med.duracion_dias,
                    indicaciones_extra=med.indicaciones_extra,
                )
            )

        # Marcar automáticamente la cita como ATENDIDA al emitir la receta
        cita.estado = EstadoCita.ATENDIDA
        cita.asistencia_confirmada = True

        db.commit()
        db.refresh(nueva_receta)

        return RecetaResponse(
            id=nueva_receta.id,
            cita_id=nueva_receta.cita_id,
            paciente_id=nueva_receta.paciente_id,
            doctor_id=nueva_receta.doctor_id,
            diagnostico=nueva_receta.diagnostico,
            observaciones=nueva_receta.observaciones,
            fecha_emision=nueva_receta.fecha_emision,
            medicamentos=meds_guardados,
        )

    @staticmethod
    def listar_tomas_paciente(
        db: Session, solicitante: Usuario, paciente_id: UUID
    ) -> List[TomaResponse]:
        if solicitante.rol != RolUsuario.DOCTOR:
            ClinicoService._verificar_acceso_paciente(db, solicitante, paciente_id)

        filas = (
            db.query(TomaMedicamento, MedicamentoRecetado)
            .join(MedicamentoRecetado, TomaMedicamento.medicamento_id == MedicamentoRecetado.id)
            .filter(TomaMedicamento.paciente_id == paciente_id)
            .order_by(TomaMedicamento.fecha_hora_programada.asc())
            .all()
        )
        return [
            TomaResponse(
                id=t.id,
                medicamento_id=m.id,
                nombre_medicamento=m.nombre_medicamento,
                dosis=m.dosis,
                fecha_hora_programada=t.fecha_hora_programada,
                tomada=t.tomada,
                fecha_hora_toma=t.fecha_hora_toma,
            )
            for t, m in filas
        ]

    @staticmethod
    def marcar_toma_completada(db: Session, solicitante: Usuario, toma_id: UUID) -> dict:
        toma = db.query(TomaMedicamento).filter(TomaMedicamento.id == toma_id).first()
        if not toma:
            raise HTTPException(status_code=404, detail="Registro de toma no encontrado.")

        ClinicoService._verificar_acceso_paciente(db, solicitante, toma.paciente_id)

        toma.tomada = True
        toma.fecha_hora_toma = datetime.now(timezone.utc)
        db.commit()
        return {"mensaje": "Toma registrada correctamente.", "toma_id": str(toma.id)}