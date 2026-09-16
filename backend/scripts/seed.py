import random
import os
import sys
from datetime import datetime, date, timedelta

# Asegurar que el path incluya el backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, engine, Base
from app.models import User, Job, HiringHistory, BotFlowConfig
from app.services.predictor import calculate_predicted_retention
from app.services.geo import MUNICIPIOS_NL_COORDS

# Lista de nombres regiomontanos comunes
NOMBRES = [
    "Juan Carlos", "José Luis", "Jesús", "Roberto", "Francisco", "Gerardo", "Alejandro", "Jorge",
    "Ricardo", "Héctor", "Carlos", "David", "Miguel Ángel", "Eduardo", "Raúl", "Javier",
    "María Elena", "Brenda", "Nancy", "Guadalupe", "Rosa María", "Leticia", "Adriana", "Patricia",
    "Diana", "Alma Rosa", "Claudia", "Karla", "Verónica", "Sandra", "Daniela", "Mayra"
]

APELLIDOS = [
    "Garza", "Treviño", "Rodríguez", "González", "Cantú", "Elizondo", "Chapa", "Montemayor",
    "Cavazos", "Martínez", "Lozano", "Guerra", "Sada", "Villarreal", "de la Garza", "García",
    "Flores", "Hernández", "Torres", "Pérez", "Castillo", "Ramos", "Salazar", "Morales"
]

VACANTES_MOCK = [
    {
        "empresa_nombre": "Nemak Aluminios",
        "titulo": "Operario de Ensamble y Fundición",
        "descripcion": "Ensamble de monobloques automotrices en línea automatizada. Se ofrece comedor subsidiado y transporte de personal.",
        "sueldo_semanal_libre": 2450.0,
        "turnos_fijos": False,
        "apoyo_inea": True,
        "transporte_incluido": True,
        "municipio": "García",
        "latitud": 25.8139,
        "longitud": -100.5947
    },
    {
        "empresa_nombre": "Kia Motors & Mobis",
        "titulo": "Operador de Maquinado y Estampado",
        "descripcion": "Operación de prensas y estampado para piezas de carrocería. Bono de puntualidad y asistencia semanal.",
        "sueldo_semanal_libre": 2800.0,
        "turnos_fijos": True,
        "apoyo_inea": True,
        "transporte_incluido": True,
        "municipio": "Pesquería",
        "latitud": 25.7869,
        "longitud": -100.0506
    },
    {
        "empresa_nombre": "Carrier México",
        "titulo": "Técnico de Ensamble de Climas",
        "descripcion": "Montaje de componentes de climatización industrial. Capacitación pagada y vales de despensa.",
        "sueldo_semanal_libre": 2600.0,
        "turnos_fijos": True,
        "apoyo_inea": False,
        "transporte_incluido": True,
        "municipio": "Santa Catarina",
        "latitud": 25.6756,
        "longitud": -100.4636
    },
    {
        "empresa_nombre": "Whirlpool Planta Supsa",
        "titulo": "Operario de Inyección de Plástico",
        "descripcion": "Control de máquinas de inyección y rebabeo de piezas para electrodomésticos.",
        "sueldo_semanal_libre": 2200.0,
        "turnos_fijos": False,
        "apoyo_inea": True,
        "transporte_incluido": True,
        "municipio": "Apodaca",
        "latitud": 25.7816,
        "longitud": -100.1887
    },
    {
        "empresa_nombre": "Metalsa Estructuras",
        "titulo": "Soldador Microalambre Operativo",
        "descripcion": "Soldadura de chasis y largueros para camiones pesados. Certificación interna y oportunidad de desarrollo.",
        "sueldo_semanal_libre": 3150.0,
        "turnos_fijos": True,
        "apoyo_inea": True,
        "transporte_incluido": True,
        "municipio": "Apodaca",
        "latitud": 25.7725,
        "longitud": -100.1990
    },
    {
        "empresa_nombre": "Danfoss San Nicolás",
        "titulo": "Armador de Válvulas y Compresores",
        "descripcion": "Línea limpia para armado fino de válvulas de expansión. Ambiente con clima y ergonomía cuidada.",
        "sueldo_semanal_libre": 2350.0,
        "turnos_fijos": True,
        "apoyo_inea": False,
        "transporte_incluido": False,
        "municipio": "San Nicolás",
        "latitud": 25.7486,
        "longitud": -100.2887
    },
    {
        "empresa_nombre": "Frisa Forjados",
        "titulo": "Ayudante de Forja y Tratamientos Térmicos",
        "descripcion": "Apoyo en hornos de tratamiento térmico y desbaste de anillos de acero.",
        "sueldo_semanal_libre": 2900.0,
        "turnos_fijos": False,
        "apoyo_inea": False,
        "transporte_incluido": True,
        "municipio": "Guadalupe",
        "latitud": 25.6775,
        "longitud": -100.2597
    },
    {
        "empresa_nombre": "Ternium Guerrero",
        "titulo": "Auxiliar de Almacén y Patio Metalúrgico",
        "descripcion": "Maniobras de carga, empaque de rollos galvanizados y flejado de producto terminado.",
        "sueldo_semanal_libre": 2500.0,
        "turnos_fijos": True,
        "apoyo_inea": True,
        "transporte_incluido": True,
        "municipio": "San Nicolás",
        "latitud": 25.7350,
        "longitud": -100.3010
    }
]

def seed_database():
    print("Inicializando tablas en la base de datos...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Limpiar datos anteriores si existen para reiniciar el seed limpiamente
        db.query(HiringHistory).delete()
        db.query(Job).delete()
        db.query(User).delete()
        db.commit()

        # 1. Sembrar Vacantes
        print("Sembrando 8 vacantes representativas en parques industriales de Nuevo León...")
        created_jobs = []
        for v in VACANTES_MOCK:
            job = Job(**v)
            db.add(job)
            created_jobs.append(job)
        db.commit()
        for j in created_jobs:
            db.refresh(j)

        # 2. Sembrar 100 Operarios Sintéticos
        print("Generando 100 perfiles de operarios sintéticos en Nuevo León...")
        municipios_keys = list(MUNICIPIOS_NL_COORDS.keys())[:8] # Apodaca, Guadalupe, Monterrey, San Nicolás, etc.
        niveles_educativos = [
            ("Primaria_Incompleta", 0.30),
            ("Secundaria", 0.40),
            ("Preparatoria", 0.20),
            ("Tecnico", 0.10)
        ]

        # Lista ponderada de niveles
        pool_niveles = []
        for nivel, peso in niveles_educativos:
            pool_niveles.extend([nivel] * int(peso * 100))

        created_users = []
        for i in range(100):
            nombre = f"{random.choice(NOMBRES)} {random.choice(APELLIDOS)} {random.choice(APELLIDOS)}"
            telefono = f"81{random.randint(10, 89)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}"
            muni_name = random.choice(municipios_keys).capitalize()
            coords = MUNICIPIOS_NL_COORDS.get(muni_name.lower(), (25.6866, -100.3161))
            
            # Pequeña variación de coordenadas dentro del municipio (+/- 0.02 grados ~ 2-3 km)
            lat = round(coords[0] + random.uniform(-0.025, 0.025), 5)
            lon = round(coords[1] + random.uniform(-0.025, 0.025), 5)

            nivel = random.choice(pool_niveles)
            # Si el nivel es Primaria Incompleta, el 75% acepta apoyo del INEA
            if nivel == "Primaria_Incompleta":
                tag_inea = random.random() < 0.75
            else:
                tag_inea = False

            sueldo_des = round(random.choice([1800, 2000, 2200, 2400, 2600, 2800, 3000]), 2)
            cp = f"66{random.randint(100, 999)}"

            user = User(
                nombre=nombre,
                telefono=telefono,
                codigo_postal=cp,
                municipio=muni_name,
                nivel_educativo=nivel,
                tag_inea=tag_inea,
                latitud=lat,
                longitud=lon,
                sueldo_deseado=sueldo_des,
                activo=True,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 180))
            )
            db.add(user)
            created_users.append(user)

        db.commit()
        for u in created_users:
            db.refresh(u)

        # 3. Sembrar 100 Registros de Histórico de Contrataciones
        print("Generando 100 registros de Hiring_History para People Analytics...")
        motivos_rotacion = [
            "Tiempo excesivo de traslado (> 60 min)",
            "Turnos rotativos desgastantes",
            "Oferta salarial más alta en otra planta",
            "Falta de flexibilidad para estudios",
            "Baja voluntaria por motivos familiares",
            "Acreditó certificación INEA y ascendió de puesto",
            "Reubicación domiciliaria"
        ]

        for i, user in enumerate(created_users):
            job = random.choice(created_jobs)
            
            # Factores reales del contrato
            sueldo = float(job.sueldo_semanal_libre)
            traslado = random.randint(15, 80)
            turnos = job.turnos_fijos
            apoyo_inea = job.apoyo_inea and user.tag_inea

            # Predicción teórica base
            pred = calculate_predicted_retention(
                sueldo=sueldo,
                tiempo_traslado_min=traslado,
                turnos_fijos_bool=turnos,
                apoyo_inea_bool=apoyo_inea
            )

            # Agregar varianza real (+/- 1 mes)
            meses_reales = max(0.5, round(pred["retention_months"] + random.gauss(0, 0.8), 1))

            # Fechas
            dias_antiguedad = int(meses_reales * 30.4)
            fecha_fin = date.today() - timedelta(days=random.randint(5, 60))
            fecha_inicio = fecha_fin - timedelta(days=dias_antiguedad)

            # Motivo de baja
            if meses_reales < 3.0:
                motivo = random.choice([
                    "Tiempo excesivo de traslado (> 60 min)",
                    "Turnos rotativos desgastantes",
                    "Oferta salarial más alta en otra planta"
                ])
            elif apoyo_inea and meses_reales > 7.0:
                motivo = "Acreditó certificación INEA y ascendió de puesto"
            else:
                motivo = random.choice(motivos_rotacion)

            history = HiringHistory(
                user_id=user.id,
                job_id=job.id,
                sueldo_inicial=sueldo,
                tiempo_traslado_min=traslado,
                turnos_fijos=turnos,
                apoyo_inea=apoyo_inea,
                fecha_contratacion=fecha_inicio,
                fecha_baja=fecha_fin,
                meses_permanencia=meses_reales,
                motivo_baja=motivo
            )
            db.add(history)

        db.commit()
        print("[OK] Base de datos poblada exitosamente con 8 vacantes, 100 operarios y 100 historicos de contratacion!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
