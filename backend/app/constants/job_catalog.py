"""
Catálogo de opciones para vacantes operativas (manufactura / logística en Nuevo León).

Fuente única para validación en el backend y para el endpoint GET /api/v1/jobs/catalogo.
El frontend tiene un espejo en frontend/src/constants/jobCatalog.js.

Diseño:
- Campos cerrados (selectores) en lugar de texto libre para que la IA de emparejamiento
  filtre por turno, escolaridad, prestaciones, etc. sin interpretar prosa.
- Sigue la estructura de schema.org/JobPosting (employmentType, workHours, baseSalary,
  jobBenefits, educationRequirements, experienceRequirements, qualifications, totalJobOpenings).
- NO incluye edad, sexo, estado civil ni foto: la Ley Federal del Trabajo (art. 133) y la
  Ley Federal para Prevenir y Eliminar la Discriminación prohíben usarlos como requisito.
"""

CATEGORIAS = [
    "Operador de producción / Ensamble",
    "Montacarguista",
    "Almacén y logística",
    "Soldador",
    "Empaque y etiquetado",
    "Inspector de calidad",
    "Operador de maquinaria (CNC / prensa / inyección)",
    "Mantenimiento / Técnico",
    "Electricista / Instrumentista",
    "Pintura / Acabados",
    "Chofer / Repartidor",
    "Limpieza / Intendencia",
    "Ayudante general",
    "Otro",
]

TIPOS_TURNO = [
    "Fijo matutino",
    "Fijo vespertino",
    "Fijo nocturno",
    "Rotativo (rola turnos)",
    "Mixto",
    "12 horas (4x3)",
]

DIAS_LABORALES = [
    "Lunes a Viernes",
    "Lunes a Sábado",
    "4x3",
    "5x2",
    "6x1",
    "Variable",
]

TIPOS_CONTRATO = [
    "Planta (tiempo indeterminado)",
    "Temporal (tiempo determinado)",
    "Por proyecto / obra",
    "Por agencia / outsourcing",
    "Eventual / temporada",
]

ESCOLARIDADES = [
    "Sin estudios",
    "Primaria",
    "Secundaria",
    "Preparatoria / Bachillerato",
    "Carrera técnica",
    "Licenciatura",
]

EXPERIENCIAS = [
    "Sin experiencia",
    "6 meses",
    "1 año",
    "2 años o más",
]

# Catálogo del candidato (currículum operativo y entrevista rápida)
EXPERIENCIA_CANDIDATO = ["Sin experiencia", "Menos de 6 meses", "6 meses a 1 año", "1 a 2 años", "Más de 2 años"]
DISPONIBILIDADES = ["De inmediato", "Esta semana", "En 15 días", "En un mes"]

PRESTACIONES = [
    "Prestaciones de ley (IMSS, Infonavit, aguinaldo, vacaciones)",
    "Prestaciones superiores a la ley",
    "Vales de despensa",
    "Fondo de ahorro",
    "Caja de ahorro",
    "Comedor subsidiado",
    "Transporte de personal",
    "Uniformes",
    "Seguro de vida",
    "Seguro de gastos médicos",
    "Bono de puntualidad",
    "Bono de asistencia",
    "Bono de productividad",
    "Tiempo extra pagado",
    "Pago semanal",
    "Apoyo para terminar estudios (INEA)",
]

CERTIFICACIONES = [
    "Licencia de montacargas (DC-3)",
    "Soldadura MIG / TIG / eléctrica",
    "Licencia de conducir (B, C o E)",
    "Operación de grúa viajera",
    "Curso de seguridad industrial",
    "Lectura de planos",
    "Metrología (vernier, micrómetro)",
    "Manejo de CNC",
    "Buenas prácticas de manufactura (BPM)",
]

REQUISITOS_FISICOS = [
    "Trabajo de pie prolongado",
    "Carga de peso (hasta 25 kg)",
    "Ambiente caliente",
    "Ambiente frío / refrigerado",
    "Trabajo en alturas",
    "Uso de equipo de protección (EPP)",
    "Disponibilidad para turno nocturno",
]

# Prestaciones que sincronizan banderas históricas del modelo Job
PRESTACION_TRANSPORTE = "Transporte de personal"
PRESTACION_INEA = "Apoyo para terminar estudios (INEA)"

CATALOGO = {
    "categorias": CATEGORIAS,
    "tipos_turno": TIPOS_TURNO,
    "dias_laborales": DIAS_LABORALES,
    "tipos_contrato": TIPOS_CONTRATO,
    "escolaridades": ESCOLARIDADES,
    "experiencias": EXPERIENCIAS,
    "prestaciones": PRESTACIONES,
    "certificaciones": CERTIFICACIONES,
    "requisitos_fisicos": REQUISITOS_FISICOS,
}


def tipo_turno_desde_horario(hora_entrada: str, tipo_planta: str = "") -> str:
    """Deduce el tipo de turno del catálogo a partir del turno de la planta (CompanyShift)."""
    tipo = (tipo_planta or "").lower()
    if "rol" in tipo:
        return "Rotativo (rola turnos)"
    try:
        hora = int(str(hora_entrada).strip().split(":")[0])
        if "pm" in str(hora_entrada).lower() and hora < 12:
            hora += 12
    except (ValueError, IndexError):
        return "Fijo matutino"
    if 4 <= hora < 12:
        return "Fijo matutino"
    if 12 <= hora < 20:
        return "Fijo vespertino"
    return "Fijo nocturno"
