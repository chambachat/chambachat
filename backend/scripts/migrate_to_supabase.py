import sys
import os
from sqlalchemy import create_engine

# Asegurar path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models import Base
from scripts.seed import seed_database

def migrate_supabase(database_url: str):
    """
    Crea las tablas en Supabase PostgreSQL y siembra 100 operarios de Nuevo León.
    """
    if not database_url:
        print("ERROR: Debes proporcionar la URL de conexión de Supabase.")
        return

    # Fix para SQLAlchemy si la url viene con postgres:// en lugar de postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    print(f"\n1. Conectando a Supabase PostgreSQL...")
    engine = create_engine(database_url)

    print("2. Creando tablas oficiales en Supabase PostgreSQL...")
    # Limpiar tablas previas con esquema inconsistente
    Base.metadata.drop_all(bind=engine)
    # Crear todas las tablas con sus llaves foráneas e índices
    Base.metadata.create_all(bind=engine)
    print("[OK] Tablas creadas con exito en Supabase: users, jobs, hiring_history, bot_flow_config, chat_sessions.")

    print("\n3. Poblando datos sinteticos de 100 operarios de Nuevo Leon en Supabase...")
    os.environ["DATABASE_URL"] = database_url
    
    # Re-enlazar engine en app.database para que seed use la conexión a Supabase
    import app.database
    app.database.engine = engine
    app.database.SessionLocal.configure(bind=engine)

    seed_database()

    print("\n[OK] Migracion y poblado a Supabase completado con exito!")
    print("Ahora puedes ver y modificar todas las tablas directamente en el Table Editor de tu Dashboard de Supabase.")

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else os.getenv("DATABASE_URL")
    migrate_supabase(url)
