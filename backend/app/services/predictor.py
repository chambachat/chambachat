def calculate_predicted_retention(
    sueldo: float,
    tiempo_traslado_min: int,
    turnos_fijos_bool: bool,
    apoyo_inea_bool: bool
) -> dict:
    """
    Calcula la permanencia estimada (en meses) para personal operativo en Nuevo León
    según las reglas estadísticas especificadas en el PRD Chambachat V2.
    """
    base_months = 3.0
    
    # 1. Impacto Sueldo (+0.25 meses por cada $100 sobre la base de $1,500)
    sueldo_impact = ((sueldo - 1500) / 100.0) * 0.25
    
    # 2. Impacto Traslado (-0.4 meses por cada 10 min por encima de los 20 min)
    traslado_impact = 0.0
    if tiempo_traslado_min > 20:
        traslado_impact = -((tiempo_traslado_min - 20) / 10.0) * 0.4
        
    # 3. Impacto Turnos Fijos (+2.0 meses)
    turnos_impact = 2.0 if turnos_fijos_bool else 0.0
    
    # 4. Impacto INEA (+3.5 meses de anclaje)
    inea_impact = 3.5 if apoyo_inea_bool else 0.0
    
    # Cálculo preliminar
    raw_retention = base_months + sueldo_impact + traslado_impact + turnos_impact + inea_impact
    
    # Piso mínimo de permanencia
    final_retention = max(0.5, round(raw_retention, 2))
    
    # Clasificación de riesgo y nivel
    if final_retention < 3.0:
        retention_level = "Bajo"
        risk_category = "Riesgo Alto de Rotación (< 3 meses)"
    elif final_retention < 6.0:
        retention_level = "Medio"
        risk_category = "Rotación Promedio (3 a 6 meses)"
    elif final_retention < 9.0:
        retention_level = "Alto"
        risk_category = "Buena Estabilidad (6 a 9 meses)"
    else:
        retention_level = "Excelente"
        risk_category = "Alta Fidelidad (> 9 meses)"
        
    # Generación de recomendaciones inteligentes para el reclutador
    recommendations = []
    if not apoyo_inea_bool:
        recommendations.append("Incorporar el programa INEA incrementaría la retención estimada en +3.5 meses (anclaje formativo).")
    if not turnos_fijos_bool:
        recommendations.append("Ofrecer turnos fijos en lugar de rotativos sumaría +2.0 meses de estabilidad al operario.")
    if tiempo_traslado_min > 45:
        recommendations.append(f"El tiempo de traslado ({tiempo_traslado_min} min) penaliza {abs(round(traslado_impact, 1))} meses. Proporcionar ruta de transporte de personal amortigua esta fuga.")
    if sueldo < 1800:
        recommendations.append("Un sueldo inferior a $1,800 semanal es vulnerable a ofertas competidoras en Apodaca/Pesquería.")
    elif sueldo >= 2300:
        recommendations.append(f"El sueldo ofertado de ${sueldo:,.2f} otorga una ventaja competitiva de +{round(sueldo_impact, 1)} meses.")
        
    if not recommendations:
        recommendations.append("Perfil de vacante altamente competitivo y balanceado.")

    return {
        "retention_months": final_retention,
        "base_months": base_months,
        "sueldo_impact": round(sueldo_impact, 2),
        "traslado_impact": round(traslado_impact, 2),
        "turnos_impact": round(turnos_impact, 2),
        "inea_impact": round(inea_impact, 2),
        "retention_level": retention_level,
        "risk_category": risk_category,
        "recommendations": recommendations
    }
