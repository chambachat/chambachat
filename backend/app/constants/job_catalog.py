"""
Catálogo canónico de valores permitidos para campos estructurados de vacantes operativas.
Toda la lógica de IA, validación de schemas y matching usa este catálogo como única fuente de verdad.
No incluye edad, sexo ni estado civil: la LFT (art. 133) prohíbe explícitamente usarlos como requisito.
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

EXPERIENCIA_CANDIDATO = [
    "Sin experiencia",
    "Menos de 6 meses",
    "6 meses a 1 año",
    "1 a 2 años",
    "Más de 2 años",
]

DISPONIBILIDADES = [
    "De inmediato",
    "Esta semana",
    "En 15 días",
    "En un mes",
]

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

PRESTACION_TRANSPORTE = "Transporte de personal"
PRESTACION_INEA = "Apoyo para terminar estudios (INEA)"
