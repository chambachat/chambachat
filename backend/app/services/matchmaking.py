import math
from typing import List, Dict, Any
from app.models import Job

# Coordenadas de referencia en Nuevo León para municipios clave si no se dispone de GPS exacto
MUNICIPIOS_NL_COORDS = {
    "monterrey": (25.6866, -100.3161),
    "apodaca": (25.7816, -100.1887),
    "guadalupe": (25.6775, -100.2597),
    "san nicolas": (25.7486, -100.2887),
    "san nicolás": (25.7486, -100.2887),
    "san nicolás de los garza": (25.7486, -100.2887),
    "escobedo": (25.7972, -100.3275),
    "general escobedo": (25.7972, -100.3275),
    "pesqueria": (25.7869, -100.0506),
    "pesquería": (25.7869, -100.0506),
    "garcia": (25.8139, -100.5947),
    "garcía": (25.8139, -100.5947),
    "santa catarina": (25.6756, -100.4636),
    "juarez": (25.6481, -100.0933),
    "juárez": (25.6481, -100.0933)
}

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula la distancia geodésica en kilómetros entre dos coordenadas usando la fórmula de Haversine."""
    R = 6371.0 # Radio medio de la Tierra en km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def estimate_travel_time_min(distance_km: float, has_transport: bool = True) -> int:
    """
    Estima el tiempo de traslado en minutos en el área metropolitana de Monterrey.
    Si tiene transporte de personal o ruta directa, la velocidad promedio es ~30 km/h + 10 min de espera.
    En transporte público habitual: ~20 km/h + 15 min de espera/transbordo.
    """
    if has_transport:
        mins = int((distance_km / 35.0) * 60) + 10
    else:
        mins = int((distance_km / 22.0) * 60) + 15
    return max(15, min(mins, 120))

def match_jobs_for_candidate(
    candidate_lat: float = None,
    candidate_lon: float = None,
    municipio: str = None,
    tag_inea: bool = False,
    all_jobs: List[Job] = None
) -> List[Dict[str, Any]]:
    """
    Filtra y ordena vacantes según cercanía al candidato y afinidad con el programa INEA.
    """
    if not all_jobs:
        return []

    # Determinar coordenadas de origen del candidato
    c_lat, c_lon = None, None
    if candidate_lat is not None and candidate_lon is not None:
        c_lat, c_lon = candidate_lat, candidate_lon
    elif municipio:
        m_clean = municipio.strip().lower()
        if m_clean in MUNICIPIOS_NL_COORDS:
            c_lat, c_lon = MUNICIPIOS_NL_COORDS[m_clean]
        else:
            # Por defecto, centro de Monterrey
            c_lat, c_lon = MUNICIPIOS_NL_COORDS["monterrey"]
    else:
        c_lat, c_lon = MUNICIPIOS_NL_COORDS["monterrey"]

    scored_jobs = []
    for job in all_jobs:
        dist_km = haversine_distance_km(c_lat, c_lon, job.latitud, job.longitud)
        est_min = estimate_travel_time_min(dist_km, job.transporte_incluido)

        # Bonificación de score de afinidad: menor distancia = más puntos
        # Si el usuario tiene tag_inea y la vacante tiene apoyo_inea, suma bono
        score = 100.0 - (dist_km * 2.0)
        if tag_inea and job.apoyo_inea:
            score += 25.0
        elif tag_inea and not job.apoyo_inea:
            score -= 10.0

        scored_jobs.append({
            "id": job.id,
            "titulo": job.titulo,
            "empresa_nombre": job.empresa_nombre,
            "descripcion": job.descripcion,
            "sueldo_semanal_libre": job.sueldo_semanal_libre,
            "turnos_fijos": job.turnos_fijos,
            "apoyo_inea": job.apoyo_inea,
            "transporte_incluido": job.transporte_incluido,
            "municipio": job.municipio,
            "latitud": job.latitud,
            "longitud": job.longitud,
            "distancia_km": dist_km,
            "tiempo_traslado_min": est_min,
            "match_score": round(max(10.0, min(100.0, score)), 1)
        })

    # Ordenar por afinidad y proximidad
    scored_jobs.sort(key=lambda x: (-x["match_score"], x["distancia_km"]))
    return scored_jobs
