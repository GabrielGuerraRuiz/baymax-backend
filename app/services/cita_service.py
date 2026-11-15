from datetime import datetime, date, time, timedelta
from typing import List
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.usuario import Usuario, Doctor, Paciente, RolUsuario
from app.models.cita import Disponibilidad, Cita, EstadoCita
from app.schemas.cita import DisponibilidadCreate, AgendarCitaRequest

class CitaService:
    @staticmethod
    def agregar_disponibilidad(db: Session, doctor_id: UUID, datos: DisponibilidadCreate) -> Disponibilidad:
        # CU-02 Alt 1: verificar que no haya sobreposición de horarios en el mismo día
        bloques_existentes = db.query(Disponibilidad).filter(
            Disponibilidad.doctor_id == doctor_id,
            Disponibilidad.dia_semana == datos.dia_semana
        ).all()

        for b in bloques_existentes:
            if datos.hora_inicio < b.hora_fin and datos.hora_fin > b.hora_inicio:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El bloque se traslapa con un horario ya configurado ese día (CU-02 Alt 1)."
                )

        nuevo_bloque = Disponibilidad(
            doctor_id=doctor_id,
            dia_semana=datos.dia_semana,
            hora_inicio=datos.hora_inicio,
            hora_fin=datos.hora_fin,
            duracion_cita_min=datos.duracion_cita_min
        )
        db.add(nuevo_bloque)
        db.commit()
        db.refresh(nuevo_bloque)
        return nuevo_bloque

    @staticmethod
    def calcular_horarios_libres(db: Session, doctor_id: UUID, fecha: date, paciente_id: UUID = None) -> List[str]:
        dia_sem = fecha.weekday()
        bloques = db.query(Disponibilidad).filter(
            Disponibilidad.doctor_id == doctor_id,
            Disponibilidad.dia_semana == dia_sem
        ).order_by(Disponibilidad.hora_inicio).all()

        if not bloques:
            return []

        inicio_dia = datetime.combine(fecha, time.min)
        fin_dia = datetime.combine(fecha, time.max)

        # Citas activas del doctor ese día (RN-02)
        citas_doctor = db.query(Cita).filter(
            Cita.doctor_id == doctor_id,
            Cita.fecha_hora >= inicio_dia,
            Cita.fecha_hora <= fin_dia,
            Cita.estado != EstadoCita.CANCELADA
        ).all()
        horas_ocupadas_doc = {c.fecha_hora for c in citas_doctor}

        # Citas activas del paciente ese día (RN-21)
        horas_ocupadas_pac = set()
        if paciente_id:
            citas_pac = db.query(Cita).filter(
                Cita.paciente_id == paciente_id,
                Cita.fecha_hora >= inicio_dia,
                Cita.fecha_hora <= fin_dia,
                Cita.estado != EstadoCita.CANCELADA
            ).all()
            horas_ocupadas_pac = {c.fecha_hora for c in citas_pac}

        libres = []
        ahora = datetime.now()

        for bloque in bloques:
            actual = datetime.combine(fecha, bloque.hora_inicio)
            limite = datetime.combine(fecha, bloque.hora_fin)
            paso = timedelta(minutes=bloque.duracion_cita_min)

            while actual + paso <= limite:
                if (
                    actual > ahora
                    and actual not in horas_ocupadas_doc
                    and actual not in horas_ocupadas_pac
                ):
                    libres.append(actual.strftime("%H:%M"))
                actual += paso

        return libres

    @staticmethod
    def agendar_cita(db: Session, solicitante: Usuario, datos: AgendarCitaRequest) -> Cita:
        # 1. Resolver paciente destino y verificar permisos (RNF-04)
        if solicitante.rol == RolUsuario.PACIENTE:
            paciente = db.query(Paciente).filter(Paciente.usuario_id == solicitante.id).first()
            if not paciente:
                raise HTTPException(status_code=404, detail="Perfil de paciente no encontrado.")
            if datos.paciente_id and datos.paciente_id != paciente.id:
                raise HTTPException(status_code=403, detail="No puedes agendar citas para otro usuario.")
        elif solicitante.rol == RolUsuario.TUTOR:
            if not datos.paciente_id:
                raise HTTPException(status_code=400, detail="Como tutor debes indicar el paciente_id del dependiente.")
            paciente = db.query(Paciente).filter(Paciente.id == datos.paciente_id).first()
            if not paciente:
                raise HTTPException(status_code=404, detail="Dependiente no encontrado.")
            # Nota: La validación estricta de VinculoTutor activo la conectaremos en el Sprint 2
        else:
            raise HTTPException(status_code=403, detail="Los doctores no agendan citas desde este flujo.")

        # 2. Verificar que el doctor existe
        doctor = db.query(Doctor).filter(Doctor.usuario_id == datos.doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor no encontrado.")

        # Quitar zona horaria si viene en ISO-8601 con Z para comparar en local
        fecha_cita = datos.fecha_hora.replace(tzinfo=None)

        # 3. Validar que el horario solicitado es un slot libre válido (RN-01, RN-02, RN-21)
        slots_libres = CitaService.calcular_horarios_libres(
            db, datos.doctor_id, fecha_cita.date(), paciente.id
        )
        hora_str = fecha_cita.strftime("%H:%M")
        if hora_str not in slots_libres:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El horario {hora_str} no está disponible o ya fue ocupado (RN-01 / RN-02)."
            )

        # 4. Crear cita CONFIRMADA registrando quién agendó (RN-18)
        nueva_cita = Cita(
            doctor_id=datos.doctor_id,
            paciente_id=paciente.id,
            agendada_por=solicitante.id,
            fecha_hora=fecha_cita,
            estado=EstadoCita.CONFIRMADA,
            motivo=datos.motivo
        )
        db.add(nueva_cita)
        db.commit()
        db.refresh(nueva_cita)
        return nueva_cita