from fastapi import FastAPI
from app.core.database import engine, Base
from app.models import usuario  # Asegura que SQLAlchemy registre los modelos

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Baymax API",
    description="Plataforma web de gestión de citas médicas y estudios clínicos",
    version="1.0.0"
)

@app.get("/")
def health_check():
    return {"estado": "activo", "sistema": "Baymax API"}