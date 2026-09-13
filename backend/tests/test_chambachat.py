import sys
import os

# Asegurar path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.predictor import calculate_predicted_retention

def test_retention_formula_base_case():
    # Caso base: $1500, 20 min, False, False -> exactamente 3.0 meses
    res = calculate_predicted_retention(
        sueldo=1500,
        tiempo_traslado_min=20,
        turnos_fijos_bool=False,
        apoyo_inea_bool=False
    )
    assert res["retention_months"] == 3.0
    assert res["base_months"] == 3.0
    assert res["sueldo_impact"] == 0.0
    assert res["traslado_impact"] == 0.0
    assert res["turnos_impact"] == 0.0
    assert res["inea_impact"] == 0.0

def test_retention_formula_salary_increase():
    # $2500 -> +$1000 sobre $1500 -> 10 * 0.25 = +2.5 meses -> total 5.5 meses
    res = calculate_predicted_retention(
        sueldo=2500,
        tiempo_traslado_min=20,
        turnos_fijos_bool=False,
        apoyo_inea_bool=False
    )
    assert res["retention_months"] == 5.5
    assert res["sueldo_impact"] == 2.5

def test_retention_formula_commute_penalty():
    # 60 min -> 40 min sobre 20 -> (40/10)*0.4 = -1.6 meses -> 3.0 - 1.6 = 1.4 meses
    res = calculate_predicted_retention(
        sueldo=1500,
        tiempo_traslado_min=60,
        turnos_fijos_bool=False,
        apoyo_inea_bool=False
    )
    assert res["retention_months"] == 1.4
    assert res["traslado_impact"] == -1.6

def test_retention_formula_full_bonuses():
    # Turnos fijos (+2.0) + INEA (+3.5)
    # $2000 (+1.25) y 10 min de traslado (sin penalización)
    # 3.0 + 1.25 + 0.0 + 2.0 + 3.5 = 9.75 meses
    res = calculate_predicted_retention(
        sueldo=2000,
        tiempo_traslado_min=10,
        turnos_fijos_bool=True,
        apoyo_inea_bool=True
    )
    assert res["retention_months"] == 9.75
    assert res["turnos_impact"] == 2.0
    assert res["inea_impact"] == 3.5
    assert res["retention_level"] == "Excelente"

def test_retention_minimum_floor():
    # Sueldo muy bajo $1000 y 120 min de traslado
    # 3.0 + (-1.25) - 4.0 = -2.25 -> piso mínimo debe ser 0.5 meses
    res = calculate_predicted_retention(
        sueldo=1000,
        tiempo_traslado_min=120,
        turnos_fijos_bool=False,
        apoyo_inea_bool=False
    )
    assert res["retention_months"] == 0.5

if __name__ == "__main__":
    test_retention_formula_base_case()
    test_retention_formula_salary_increase()
    test_retention_formula_commute_penalty()
    test_retention_formula_full_bonuses()
    test_retention_minimum_floor()
    print(">>> TODOS LOS TESTS UNITARIOS DEL MODELO MATEMATICO PASARON EXITOSAMENTE (5/5) <<<")
