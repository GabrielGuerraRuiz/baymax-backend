from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import asistente, auth, citas, clinico, tutores
from app.core.database import Base, engine
from app.models import cita, clinico as clinico_models, usuario

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Baymax API",
    description="Plataforma web de gestión de citas médicas y estudios clínicos",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(citas.router, prefix="/api/v1")
app.include_router(tutores.router, prefix="/api/v1")
app.include_router(clinico.router, prefix="/api/v1")
app.include_router(asistente.router, prefix="/api/v1")


@app.get("/")
def health_check():
    return {"estado": "activo", "sistema": "Baymax API"}