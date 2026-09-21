"""
Servicio de turnos laborales de planta.

Centraliza el catálogo de turnos industriales por defecto de Nuevo León y la
lógica de inicialización para empresas que aún no han configurado turnos.
"""
from typing import List

from sqlalchemy.orm import Session

from app.models import CompanyShift

DEFAULT_INDUSTRIAL_SHIFTS = [
    {
        "nombre": "Turno 1 (Matutino)",
        "hora_entrada": "06:00",
        "hora_salida": "14:00",
        "dias": "Lunes a Sábado",
        "tipo": "Fijo",
        "descripcion": "Turno matutino estándar para manufactura y ensamble",
    },
    {
        "nombre": "Turno 2 (Vespertino)",
        "hora_entrada": "14:00",
        "hora_salida": "21:30",
        "dias": "Lunes a Sábado",
        "tipo": "Fijo",
        "descripcion": "Turno vespertino industrial",
    },
    {
        "nombre": "Turno 3 (Nocturno)",
        "hora_entrada": "21:30",
        "hora_salida": "06:00",
        "dias": "Lunes a Viernes",
        "tipo": "Fijo",
        "descripcion": "Turno nocturno con transporte a planta",
    },
    {
        "nombre": "Turno Mixto / Rolado",
        "hora_entrada": "07:00",
        "hora_salida": "19:00",
        "dias": "4x3 (Jornada 12 Horas)",
        "tipo": "Rolado",
        "descripcion": "4 días de trabajo por 3 de descanso",
    },
    {
        "nombre": "Turno Administrativo",
        "hora_entrada": "08:00",
        "hora_salida": "17:30",
        "dias": "Lunes a Viernes",
        "tipo": "Administrativo",
        "descripcion": "Horario de oficinas, almacén central y soporte",
    },
]


def get_active_shifts(db: Session, company_id: int) -> List[CompanyShift]:
    """Devuelve los turnos activos de una empresa ordenados por id."""
    return (
        db.query(CompanyShift)
        .filter(CompanyShift.company_id == company_id, CompanyShift.activo == True)  # noqa: E712
        .order_by(CompanyShift.id)
        .all()
    )


def ensure_default_shifts(db: Session, company_id: int) -> List[CompanyShift]:
    """
    Devuelve los turnos activos de la empresa. Si no tiene ninguno, siembra el
    catálogo industrial por defecto y lo devuelve.
    """
    shifts = get_active_shifts(db, company_id)
    if shifts:
        return shifts

    for ds in DEFAULT_INDUSTRIAL_SHIFTS:
        db.add(CompanyShift(company_id=company_id, activo=True, **ds))
    db.commit()
    return get_active_shifts(db, company_id)
