import sys
import os
from sqlalchemy import create_engine, text

# Asegurar path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

def migrate_supabase(database_url: str):
    """
    Ejecuta el esquema DDL oficial y puebla los 100 operarios en Supabase PostgreSQL.
    """
    if not database_url:
        print("ERROR: Debes proporcionar la URL de conexión de Supabase.")
        print("Ejemplo: python backend/scripts/migrate_to_supabase.py postgresql://postgres:MI_PASS@db.xxx.supabase.co:5432/postgres")
        return

    # Fix para SQLAlchemy si la url viene con postgres:// en lugar de postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    print(f"\n1. Conectando a Supabase PostgreSQL...")
    engine = create_engine(database_url)

    schema_file = os.path.join(os.path.dirname(__file__), "postgres_schema.sql")
    with open(schema_file, "r", encoding="utf-8") as f:
        sql_commands = f.read()

    print("2. Aplicando esquema DDL oficial (postgres_schema.sql) en Supabase...")
    with engine.connect() as conn:
        # Ejecutar script DDL
        conn.execute(text(sql_commands))
        conn.commit()
    print("✓ Tablas creadas con éxito: Users, Jobs, Hiring_History, Bot_Flow_Config.")

    print("\n3. Poblando datos sintéticos de 100 operarios de Nuevo León en Supabase...")
    # Sobrescribir temporalmente la variable de entorno para el seed
    os.environ["DATABASE_URL"] = database_url
    from scripts.seed import seed_database
    seed_database()

    print("\n✓ ¡Migración y poblado a Supabase completado con éxito!")
    print("Ahora puedes ver y modificar todas las tablas directamente en el Table Editor de tu Dashboard de Supabase.")

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else os.getenv("DATABASE_URL")
    migrate_supabase(url)
