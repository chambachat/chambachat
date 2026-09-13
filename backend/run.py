import sys
import os
import uvicorn
from app.database import engine, SessionLocal, Base
from app.models import User
from scripts.seed import seed_database

def ensure_seeded():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count < 10:
            print("Base de datos sin datos de prueba suficientes. Ejecutando seed con 100 operarios...")
            seed_database()
        else:
            print(f"Base de datos lista con {user_count} operarios registrados.")
    finally:
        db.close()

if __name__ == "__main__":
    ensure_seeded()
    print("\nIniciando servidor Chambachat V2 en http://localhost:8000 ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
