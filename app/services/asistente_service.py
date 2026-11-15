import os
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.models.cita import Cita, EstadoCita
from app.models.clinico import MedicamentoRecetado, TomaMedicamento
from app.models.usuario import Doctor, Paciente, RolUsuario, Usuario, VinculoTutor
from app.schemas.asistente import ChatResponse

load_dotenv()


class AsistenteService:
    @staticmethod
    def _construir_contexto_usuario(db: Session, usuario: Usuario) -> str:
        ahora = datetime.now()
        lineas = [
            f"Usuario autenticado: {usuario.nombre} (Rol: {usuario.rol.value}).",
            f"Fecha y hora actual del sistema: {ahora.strftime('%Y-%m-%d %H:%M')}.",
        ]

        # Directorio de doctores disponibles
        doctores = (
            db.query(Usuario.nombre, Doctor.especialidad)
            .join(Doctor, Usuario.id == Doctor.usuario_id)
            .all()
        )
        if doctores:
            docs_str = ", ".join([f"{d.nombre} ({d.especialidad})" for d in doctores])
            lineas.append(f"Doctores registrados en Baymax: {docs_str}.")

        # Resolver IDs de pacientes visibles según rol
        pacientes_ids = []
        if usuario.rol == RolUsuario.PACIENTE:
            pac = db.query(Paciente).filter(Paciente.usuario_id == usuario.id).first()
            if pac:
                pacientes_ids.append(pac.id)
        elif usuario.rol == RolUsuario.TUTOR:
            vinculos = (
                db.query(VinculoTutor)
                .filter(VinculoTutor.tutor_id == usuario.id, VinculoTutor.activo.is_(True))
                .all()
            )
            pacientes_ids = [v.paciente_id for v in vinculos]

        # Citas próximas
        if usuario.rol == RolUsuario.DOCTOR:
            citas = (
                db.query(Cita)
                .filter(Cita.doctor_id == usuario.id, Cita.estado != EstadoCita.CANCELADA)
                .order_by(Cita.fecha_hora.asc())
                .limit(5)
                .all()
            )
        elif pacientes_ids:
            citas = (
                db.query(Cita)
                .filter(Cita.paciente_id.in_(pacientes_ids), Cita.estado != EstadoCita.CANCELADA)
                .order_by(Cita.fecha_hora.asc())
                .limit(5)
                .all()
            )
        else:
            citas = []

        if citas:
            citas_str = "; ".join(
                [f"{c.fecha_hora.strftime('%Y-%m-%d %H:%M')} (Estado: {c.estado.value}, Motivo: {c.motivo or 'General'})" for c in citas]
            )
            lineas.append(f"Citas registradas: {citas_str}.")
        else:
            lineas.append("Citas registradas: Ninguna.")

        # Tomas de medicamentos pendientes (para pacientes/tutores)
        if pacientes_ids:
            ahora_utc = datetime.now(timezone.utc)
            tomas = (
                db.query(TomaMedicamento, MedicamentoRecetado)
                .join(MedicamentoRecetado, TomaMedicamento.medicamento_id == MedicamentoRecetado.id)
                .filter(
                    TomaMedicamento.paciente_id.in_(pacientes_ids),
                    TomaMedicamento.tomada.is_(False),
                    TomaMedicamento.fecha_hora_programada >= ahora_utc,
                )
                .order_by(TomaMedicamento.fecha_hora_programada.asc())
                .limit(5)
                .all()
            )
            if tomas:
                tomas_str = "; ".join(
                    [
                        f"{m.nombre_medicamento} ({m.dosis}) a las {t.fecha_hora_programada.strftime('%Y-%m-%d %H:%M UTC')}"
                        for t, m in tomas
                    ]
                )
                lineas.append(f"Próximas tomas de medicamentos pendientes: {tomas_str}.")
            else:
                lineas.append("Próximas tomas de medicamentos pendientes: Ninguna.")

        return "\n".join(lineas)

    @staticmethod
    def procesar_mensaje(db: Session, usuario: Usuario, mensaje: str) -> ChatResponse:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()

        # RNF-16: Degradación elegante si no hay API key configurada
        if not api_key:
            return ChatResponse(
                respuesta=(
                    "El módulo de IA de Baymax aún no tiene configurada la clave GEMINI_API_KEY en el servidor. "
                    "Puedes seguir gestionando tus citas, estudios y medicamentos desde los módulos manuales."
                ),
                intencion_detectada="SIN_CONFIGURACION_IA",
                modo_respaldo=True,
            )

        contexto = AsistenteService._construir_contexto_usuario(db, usuario)

        instrucciones_sistema = (
            "Eres Baymax, el asistente virtual de la plataforma web de gestión de citas médicas y estudios clínicos. "
            "Responde de forma empática, clara, breve y estructurada en español. "
            "Usa únicamente los datos reales proporcionados en el CONTEXTO DEL USUARIO para responder sobre sus citas, "
            "medicamentos o doctores disponibles. Nunca emitas diagnósticos médicos ni prescribas fármacos; si el usuario "
            "describe síntomas graves, recomiéndale agendar una cita médica de inmediato en la plataforma.\n\n"
            f"CONTEXTO DEL USUARIO:\n{contexto}"
        )

        modelos_candidatos = [
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash",
        ]
        payload = {
            "system_instruction": {"parts": [{"text": instrucciones_sistema}]},
            "contents": [{"parts": [{"text": mensaje}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 300,
            },
        }

        with httpx.Client(timeout=15.0) as client:
            for modelo in modelos_candidatos:
                url = (
                    "https://generativelanguage.googleapis.com/v1beta/models/"
                    f"{modelo}:generateContent?key={api_key}"
                )
                try:
                    response = client.post(url, json=payload)
                    response.raise_for_status()
                    data = response.json()
                    texto_respuesta = (
                        data["candidates"][0]["content"]["parts"][0]["text"]
                        or "No pude generar una respuesta en este momento."
                    )
                    return ChatResponse(
                        respuesta=texto_respuesta,
                        intencion_detectada="CONSULTA_ASISTENTE",
                        modo_respaldo=False,
                    )
                except Exception:
                    continue

        # RNF-16: Tolerancia ante fallos de red o saturación de API externa
        return ChatResponse(
            respuesta=(
                "En este momento el asistente inteligente no está disponible temporalmente. "
                "Por favor utiliza las secciones directas de Citas y Recetas en el menú."
            ),
            intencion_detectada="FALLO_SERVICIO_EXTERNO",
            modo_respaldo=True,
        )
        
        