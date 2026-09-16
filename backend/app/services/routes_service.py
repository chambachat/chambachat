from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import RouteStop, TransportRoute
from app.services.geo import haversine_distance_km

def find_nearby_stops(db: Session, lat: float, lon: float, max_km: float = 8.0, company_id: Optional[int] = None, limit: int = 4) -> List[Dict[str, Any]]:
    query = db.query(RouteStop).join(TransportRoute).filter(TransportRoute.activa == True)
    if company_id:
        query = query.filter(TransportRoute.company_id == company_id)
    
    all_stops = query.all()
    results = []

    for stop in all_stops:
        dist_km = haversine_distance_km(lat, lon, stop.latitud, stop.longitud)
        if dist_km <= max_km:
            walking_min = max(2, int((dist_km / 4.5) * 60))
            results.append({
                "stop_id": stop.id,
                "nombre_parada": stop.nombre,
                "horario_paso": stop.horario,
                "colonia_referencia": stop.colonia_referencia,
                "latitud": stop.latitud,
                "longitud": stop.longitud,
                "distancia_km": dist_km,
                "caminando_min": walking_min,
                "ruta_id": stop.route.id,
                "nombre_ruta": stop.route.nombre,
                "turno": stop.route.turno,
                "color_hex": stop.route.color_hex,
                "hora_llegada_planta": stop.route.hora_llegada_planta,
                "empresa_id": stop.route.company_id,
                "empresa_nombre": stop.route.company.nombre if stop.route.company else "Planta Industrial"
            })

    results.sort(key=lambda x: x["distancia_km"])
    return results[:limit]
