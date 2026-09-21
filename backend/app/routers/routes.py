from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_company_member
from app.models import Company, RouteStop, TransportRoute, User
from app.schemas import (
    NearbyStopsResponse,
    RouteMutationResponse,
    RouteResponse,
    RouteStopIn,
    StatusMessageResponse,
    TransportRouteCreate,
    TransportRouteUpdate,
)
from app.services.routes_service import find_nearby_stops as _find_nearby_stops

router = APIRouter(prefix="/api/v1", tags=["Transport Routes"])


# --- HELPERS ---

def route_to_response(route: TransportRoute) -> RouteResponse:
    resp = RouteResponse.model_validate(route)
    resp.empresa_nombre = route.company.nombre if route.company else None
    return resp


def _replace_stops(db: Session, route: TransportRoute, stops: List[RouteStopIn]) -> None:
    db.query(RouteStop).filter(RouteStop.route_id == route.id).delete()
    for idx, stop_in in enumerate(stops):
        db.add(RouteStop(
            route_id=route.id,
            orden=stop_in.orden or idx + 1,
            nombre=stop_in.nombre.strip(),
            horario=stop_in.horario.strip(),
            latitud=stop_in.latitud,
            longitud=stop_in.longitud,
            colonia_referencia=stop_in.colonia_referencia.strip() if stop_in.colonia_referencia else None,
            referencia_visual=stop_in.referencia_visual.strip() if stop_in.referencia_visual else None,
        ))


def _get_route_or_404(db: Session, company_id: int, route_id: int) -> TransportRoute:
    route = db.query(TransportRoute).filter(
        TransportRoute.id == route_id,
        TransportRoute.company_id == company_id,
    ).first()
    if not route:
        raise HTTPException(status_code=404, detail="Ruta de transporte no encontrada")
    return route


# --- ENDPOINTS ---

@router.get("/companies/{company_id}/routes", response_model=List[RouteResponse])
def list_company_routes(company_id: int, db: Session = Depends(get_db)):
    """Lista las rutas de transporte de una planta. Lectura pública: los candidatos las consultan."""
    if not db.query(Company.id).filter(Company.id == company_id).first():
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    routes = db.query(TransportRoute).filter(TransportRoute.company_id == company_id).order_by(TransportRoute.id).all()
    return [route_to_response(r) for r in routes]


@router.post("/companies/{company_id}/routes", response_model=RouteMutationResponse)
def create_company_route(company_id: int, payload: TransportRouteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Crea una nueva ruta de transporte con sus paradas GPS y horarios."""
    require_company_member(company_id, current_user, db)
    if not db.query(Company.id).filter(Company.id == company_id).first():
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    route = TransportRoute(
        company_id=company_id,
        nombre=payload.nombre.strip(),
        turno=payload.turno or "Turno 1 (Matutino)",
        color_hex=payload.color_hex or "#059669",
        descripcion=payload.descripcion,
        activa=True if payload.activa is None else payload.activa,
        hora_inicio=payload.hora_inicio,
        hora_llegada_planta=payload.hora_llegada_planta,
        tiempo_estimado_min=payload.tiempo_estimado_min,
    )
    db.add(route)
    db.flush()
    _replace_stops(db, route, payload.stops)
    db.commit()
    db.refresh(route)

    return RouteMutationResponse(
        message=f"Ruta '{route.nombre}' creada exitosamente con {len(payload.stops)} paradas.",
        route=route_to_response(route),
    )


@router.get("/companies/{company_id}/routes/{route_id}", response_model=RouteResponse)
def get_company_route(company_id: int, route_id: int, db: Session = Depends(get_db)):
    """Detalles y paradas de una ruta específica."""
    return route_to_response(_get_route_or_404(db, company_id, route_id))


@router.put("/companies/{company_id}/routes/{route_id}", response_model=RouteMutationResponse)
def update_company_route(
    company_id: int,
    route_id: int,
    payload: TransportRouteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Actualiza la información general de la ruta y sincroniza sus paradas y horarios."""
    require_company_member(company_id, current_user, db)
    route = _get_route_or_404(db, company_id, route_id)

    for field, value in payload.model_dump(exclude={"stops"}, exclude_unset=True).items():
        setattr(route, field, value)

    if payload.stops is not None:
        _replace_stops(db, route, payload.stops)

    db.commit()
    db.refresh(route)

    return RouteMutationResponse(
        message=f"Ruta '{route.nombre}' actualizada exitosamente.",
        route=route_to_response(route),
    )


@router.delete("/companies/{company_id}/routes/{route_id}", response_model=StatusMessageResponse)
def delete_company_route(company_id: int, route_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Elimina una ruta de transporte y sus paradas en cascada."""
    require_company_member(company_id, current_user, db)
    route = _get_route_or_404(db, company_id, route_id)

    route_name = route.nombre
    db.delete(route)
    db.commit()

    return StatusMessageResponse(message=f"Ruta '{route_name}' eliminada correctamente.")


@router.get("/routes/nearby", response_model=NearbyStopsResponse)
def find_nearby_stops(
    lat: float = Query(..., description="Latitud del candidato o colonia"),
    lon: float = Query(..., description="Longitud del candidato o colonia"),
    max_distance_km: float = Query(6.0, description="Radio de búsqueda en km"),
    company_id: Optional[int] = Query(None, description="Filtrar por empresa"),
    db: Session = Depends(get_db),
):
    """Paradas de transporte activas cercanas a las coordenadas del candidato."""
    results = _find_nearby_stops(db, lat, lon, max_km=max_distance_km, company_id=company_id, limit=10)
    return NearbyStopsResponse(total_encontradas=len(results), stops_cercanas=results)
