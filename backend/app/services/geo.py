import math
from typing import Optional, Tuple

MUNICIPIOS_NL_COORDS = {
    "monterrey": (25.6866, -100.3161),
    "apodaca": (25.7816, -100.1887),
    "guadalupe": (25.6775, -100.2597),
    "san nicolas": (25.7486, -100.2887),
    "san nicolǭs": (25.7486, -100.2887),
    "san nicolǭs de los garza": (25.7486, -100.2887),
    "escobedo": (25.7972, -100.3275),
    "general escobedo": (25.7972, -100.3275),
    "pesqueria": (25.7869, -100.0506),
    "pesquera": (25.7869, -100.0506),
    "garcia": (25.8139, -100.5947),
    "garca": (25.8139, -100.5947),
    "santa catarina": (25.6756, -100.4636),
    "juarez": (25.6481, -100.0933),
    "juǭrez": (25.6481, -100.0933)
}

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula la distancia geodǸsica en kilmetros entre dos coordenadas usando la frmula de Haversine."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def get_municipio_coords(municipio: str) -> Tuple[float, float]:
    """Obtiene las coordenadas de un municipio dado, con fallback a Monterrey."""
    if not municipio:
        return MUNICIPIOS_NL_COORDS["monterrey"]
    m_clean = municipio.strip().lower()
    return MUNICIPIOS_NL_COORDS.get(m_clean, MUNICIPIOS_NL_COORDS["monterrey"])
