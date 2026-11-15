from typing import Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    mensaje: str = Field(..., min_length=1, max_length=1000, example="¿Qué medicamentos me toca tomar hoy y cuándo es mi próxima cita?")


class ChatResponse(BaseModel):
    respuesta: str
    intencion_detectada: str
    modo_respaldo: bool = False