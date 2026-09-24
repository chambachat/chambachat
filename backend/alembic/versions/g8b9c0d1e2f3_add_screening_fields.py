"""add_screening_fields

Revision ID: g8b9c0d1e2f3
Revises: f7a8b9c0d1e2
Create Date: 2026-09-23 16:00:00

Entrevista rápida de Chambot al abrir el chat directo con el reclutador:
- job_applications: estado/avance de la entrevista, respuestas, desglose y nivel de compatibilidad.
- users.perfil_operativo: respuestas reutilizables (escolaridad, experiencia, certificaciones,
  disponibilidad) para no volver a preguntar lo que ya sabemos del candidato.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g8b9c0d1e2f3"
down_revision: Union[str, Sequence[str], None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _application_columns():
    return [
        sa.Column("screening_status", sa.String(20), nullable=False, server_default="none"),
        sa.Column("screening_state", sa.JSON(), nullable=True),
        sa.Column("screening_answers", sa.JSON(), nullable=True),
        sa.Column("match_breakdown", sa.JSON(), nullable=True),
        sa.Column("match_level", sa.String(20), nullable=True),
        sa.Column("screening_completed_at", sa.DateTime(), nullable=True),
    ]


def _user_columns():
    return [sa.Column("perfil_operativo", sa.JSON(), nullable=True)]


def _add_missing(table: str, columns) -> None:
    existing = {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}
    with op.batch_alter_table(table) as batch:
        for col in columns:
            if col.name not in existing:
                batch.add_column(col)


def _drop_existing(table: str, columns) -> None:
    existing = {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}
    with op.batch_alter_table(table) as batch:
        for col in columns:
            if col.name in existing:
                batch.drop_column(col.name)


def upgrade() -> None:
    _add_missing("job_applications", _application_columns())
    _add_missing("users", _user_columns())


def downgrade() -> None:
    _drop_existing("job_applications", _application_columns())
    _drop_existing("users", _user_columns())
