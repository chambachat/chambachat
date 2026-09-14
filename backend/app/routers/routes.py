from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, TransportRoute, RouteStop
from app.services.matchmaking import haversine_distance_km

router = APIRouter(prefix="/api/v1", tags=["Transport Routes"])


# --- SCHEMAS ---

class RouteStopIn(BaseModel):
    id: Optional[int] = None
    orden: int
    nombre: str
    horario: str
    latitud: float
    longitud: float
    colonia_referencia: Optional[str] = None
    referencia_visual: Optional[str] = None


class TransportRouteCreate(BaseModel):
    nombre: str
    turno: Optional[str] = "Turno 1 (Matutino)"
    color_hex: Optional[str] = "#059669"
    descripcion: Optional[str] = None
    activa: Optional[bool] = True
    hora_inicio: Optional[str] = None
    hora_llegada_planta: Optional[str] = None
    tiempo_estimado_min: Optional[int] = None
    stops: List[RouteStopIn] = []


class TransportRouteUpdate(BaseModel):
    nombre: Optional[str] = None
    turno: Optional[str] = None
    color_hex: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None
    hora_inicio: Optional[str] = None
    hora_llegada_planta: Optional[str] = None
    tiempo_estimado_min: Optional[int] = None
    stops: Optional[List[RouteStopIn]] = None


# --- HELPERS ---

def format_route_response(route: TransportRoute) -> Dict[str, Any]:
    stops_data = []
    for s in sorted(route.stops, key=lambda x: x.orden):
        stops_data.append({
            "id": s.id,
            "route_id": s.route_id,
            "orden": s.orden,
            "nombre": s.nombre,
            "horario": s.horario,
            "latitud": s.latitud,
            "longitud": s.longitud,
            "colonia_referencia": s.colonia_referencia,
            "referencia_visual": s.referencia_visual,
        })
    
    # Calcular hora de inicio y fin si no están explícitamente establecidas
    hora_inicio = route.hora_inicio
    hora_fin = route.hora_llegada_planta
    if stops_data and not hora_inicio:
        hora_inicio = stops_data[0]["horario"]
    if stops_data and not hora_fin and len(stops_data) > 1:
        hora_fin = stops_data[-1]["horario"]

    return {
        "id": route.id,
        "company_id": route.company_id,
        "empresa_nombre": route.company.nombre if route.company else None,
        "nombre": route.nombre,
        "turno": route.turno,
        "color_hex": route.color_hex or "#059669",
        "descripcion": route.descripcion,
        "activa": route.activa,
        "hora_inicio": hora_inicio,
        "hora_llegada_planta": hora_fin,
        "tiempo_estimado_min": route.tiempo_estimado_min or (len(stops_data) * 12 if stops_data else 30),
        "total_stops": len(stops_data),
        "stops": stops_data,
        "created_at": route.created_at.isoformat() if route.created_at else None
    }


# --- ENDPOINTS ---

@router.get("/companies/{company_id}/routes")
def list_company_routes(company_id: int, db: Session = Depends(get_db)):
    """
    Lista todas las rutas de transporte de una planta o empresa específica.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    routes = db.query(TransportRoute).filter(TransportRoute.company_id == company_id).all()
    return [format_route_response(r) for r in routes]


@router.post("/companies/{company_id}/routes")
def create_company_route(company_id: int, payload: TransportRouteCreate, db: Session = Depends(get_db)):
    """
    Crea una nueva ruta de transporte con sus paradas GPS y horarios.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    route = TransportRoute(
        company_id=company_id,
        nombre=payload.nombre.strip(),
        turno=payload.turno or "Turno 1 (Matutino)",
        color_hex=payload.color_hex or "#059669",
        descripcion=payload.descripcion,
        activa=payload.activa if payload.activa is not None else True,
        hora_inicio=payload.hora_inicio,
        hora_llegada_planta=payload.hora_llegada_planta,
        tiempo_estimado_min=payload.tiempo_estimado_min
    )
    db.add(route)
    db.flush()

    # Agregar paradas
    for idx, stop_in in enumerate(payload.stops):
        stop = RouteStop(
            route_id=route.id,
            orden=stop_in.orden if stop_in.orden else idx + 1,
            nombre=stop_in.nombre.strip(),
            horario=stop_in.horario.strip(),
            latitud=stop_in.latitud,
            longitud=stop_in.longitud,
            colonia_referencia=stop_in.colonia_referencia.strip() if stop_in.colonia_referencia else None,
            referencia_visual=stop_in.referencia_visual.strip() if stop_in.referencia_visual else None
        )
        db.add(stop)

    db.commit()
    db.refresh(route)

    return {
        "status": "success",
        "message": f"Ruta '{route.nombre}' creada exitosamente con {len(payload.stops)} paradas.",
        "route": format_route_response(route)
    }


@router.get("/companies/{company_id}/routes/{route_id}")
def get_company_route(company_id: int, route_id: int, db: Session = Depends(get_db)):
    """
    Obtiene los detalles y paradas de una ruta específica.
    """
    route = db.query(TransportRoute).filter(
        TransportRoute.id == route_id,
        TransportRoute.company_id == company_id
    ).first()
    if not route:
        raise HTTPException(status_code=404, detail="Ruta de transporte no encontrada")

    return format_route_response(route)


@router.put("/companies/{company_id}/routes/{route_id}")
def update_company_route(
    company_id: int,
    route_id: int,
    payload: TransportRouteUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualiza la información general de la ruta y sincroniza sus paradas y horarios.
    """
    route = db.query(TransportRoute).filter(
        TransportRoute.id == route_id,
        TransportRoute.company_id == company_id
    ).first()
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    if payload.nombre is not None:
        route.nombre = payload.nombre.strip()
    if payload.turno is not None:
        route.turno = payload.turno
    if payload.color_hex is not None:
        route.color_hex = payload.color_hex
    if payload.descripcion is not None:
        route.descripcion = payload.descripcion
    if payload.activa is not None:
        route.activa = payload.activa
    if payload.hora_inicio is not None:
        route.hora_inicio = payload.hora_inicio
    if payload.hora_llegada_planta is not None:
        route.hora_llegada_planta = payload.hora_llegada_planta
    if payload.tiempo_estimado_min is not None:
        route.tiempo_estimado_min = payload.tiempo_estimado_min

    # Sincronizar paradas si se envió la lista
    if payload.stops is not None:
        # Eliminar paradas viejas y reemplazar
        db.query(RouteStop).filter(RouteStop.route_id == route.id).delete()
        for idx, stop_in in enumerate(payload.stops):
            stop = RouteStop(
                route_id=route.id,
                orden=stop_in.orden if stop_in.orden else idx + 1,
                nombre=stop_in.nombre.strip(),
                horario=stop_in.horario.strip(),
                latitud=stop_in.latitud,
                longitud=stop_in.longitud,
                colonia_referencia=stop_in.colonia_referencia.strip() if stop_in.colonia_referencia else None,
                referencia_visual=stop_in.referencia_visual.strip() if stop_in.referencia_visual else None
            )
            db.add(stop)

    db.commit()
    db.refresh(route)

    return {
        "status": "success",
        "message": f"Ruta '{route.nombre}' actualizada exitosamente.",
        "route": format_route_response(route)
    }


@router.delete("/companies/{company_id}/routes/{route_id}")
def delete_company_route(company_id: int, route_id: int, db: Session = Depends(get_db)):
    """
    Elimina una ruta de transporte y sus paradas en cascada.
    """
    route = db.query(TransportRoute).filter(
        TransportRoute.id == route_id,
        TransportRoute.company_id == company_id
    ).first()
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    route_name = route.nombre
    db.delete(route)
    db.commit()

    return {
        "status": "success",
        "message": f"Ruta '{route_name}' eliminada correctamente."
    }


@router.get("/routes/nearby")
def find_nearby_stops(
    lat: float = Query(..., description="Latitud del candidato o colonia"),
    lon: float = Query(..., description="Longitud del candidato o colonia"),
    max_distance_km: float = Query(6.0, description="Radio de búsqueda en km"),
    company_id: Optional[int] = Query(None, description="Filtrar por empresa"),
    db: Session = Depends(get_db)
):
    """
    Busca paradas de transporte activas cercanas a las coordenadas del candidato.
    Retorna la parada más próxima, distancia a pie estimada, ruta a la que pertenece y horario.
    """
    query = db.query(RouteStop).join(TransportRoute).filter(TransportRoute.activa == True)
    if company_id:
        query = query.filter(TransportRoute.company_id == company_id)
    
    all_stops = query.all()
    results = []

    for stop in all_stops:
        dist_km = haversine_distance_km(lat, lon, stop.latitud, stop.longitud)
        if dist_km <= max_distance_km:
            # Estimar caminata a 4.5 km/h
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

    # Ordenar por proximidad (la parada más cercana primero)
    results.sort(key=lambda x: x["distancia_km"])
    return {
        "total_encontradas": len(results),
        "stops_cercanas": results[:10]
    }
