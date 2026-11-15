from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.models import usuario, cita  # Crea tablas de usuarios, disponibilidades y citas
from app.api.endpoints import auth, citas, tutores

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Baymax API",
    description="Plataforma web de gestión de citas médicas y estudios clínicos",
    version="1.0.0"
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

@app.get("/")
def health_check():
    return {"estado": "activo", "sistema": "Baymax API"}