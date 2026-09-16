import re

with open('backend/app/routers/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('from app.services.matchmaking import haversine_distance_km\n', '')

content = re.sub(
    r'class RouteStopIn\(BaseModel\):.*?class TransportRouteUpdate\(BaseModel\):.*?stops: Optional\[List\[RouteStopIn\]\] = None',
    'from app.schemas import (\n    RouteStopIn,\n    TransportRouteCreate,\n    TransportRouteUpdate\n)',
    content, flags=re.DOTALL
)

update_block = """    if payload.nombre is not None:
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
        route.tiempo_estimado_min = payload.tiempo_estimado_min"""

new_update = """    for field, value in payload.model_dump(exclude={'stops'}, exclude_unset=True).items():
        setattr(route, field, value)"""

content = content.replace(update_block, new_update)

nearby_block = """    query = db.query(RouteStop).join(TransportRoute).filter(TransportRoute.activa == True)
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
    }"""

new_nearby = """    from app.services.routes_service import find_nearby_stops as _find_nearby_stops
    results = _find_nearby_stops(db, lat, lon, max_km=max_distance_km, company_id=company_id, limit=10)
    return {
        "total_encontradas": len(results),
        "stops_cercanas": results
    }"""

content = content.replace(nearby_block, new_nearby)

with open('backend/app/routers/routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
