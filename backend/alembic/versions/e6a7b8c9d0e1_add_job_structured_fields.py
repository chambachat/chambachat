"""add_job_structured_fields

Revision ID: e6a7b8c9d0e1
Revises: d4e5f6a7b8c9
Create Date: 2026-09-23 09:00:00

Vacantes operativas con campos estructurados (categoría, turno, días, contrato,
escolaridad, experiencia, prestaciones, certificaciones, requisitos físicos,
bonos, dirección de la planta y turno de la planta) para que el emparejamiento
de la IA use datos cerrados en lugar de texto libre.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _new_columns():
    """Columnas nuevas (se construyen en cada llamada: un objeto Column no puede reutilizarse en dos tablas)."""
    return [
    sa.Column("categoria", sa.String(100), nullable=True),
    sa.Column("tipo_turno", sa.String(50), nullable=True),
    sa.Column("shift_id", sa.Integer(), nullable=True),
    sa.Column("hora_entrada", sa.String(20), nullable=True),
    sa.Column("hora_salida", sa.String(20), nullable=True),
    sa.Column("dias_laborales", sa.String(50), nullable=True),
    sa.Column("tipo_contrato", sa.String(60), nullable=True),
    sa.Column("vacantes_disponibles", sa.Integer(), nullable=False, server_default="1"),
    sa.Column("escolaridad_minima", sa.String(60), nullable=True),
    sa.Column("experiencia_minima", sa.String(40), nullable=True),
    sa.Column("certificaciones", sa.JSON(), nullable=True),
    sa.Column("prestaciones", sa.JSON(), nullable=True),
    sa.Column("requisitos_fisicos", sa.JSON(), nullable=True),
    sa.Column("bono_semanal", sa.Float(), nullable=False, server_default="0"),
    sa.Column("vales_despensa_semanal", sa.Float(), nullable=False, server_default="0"),
    sa.Column("direccion", sa.Text(), nullable=True),
    sa.Column("activa", sa.Boolean(), nullable=False, server_default=sa.true()),
    ]


def upgrade() -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in sa.inspect(bind).get_columns("jobs")}
    with op.batch_alter_table("jobs") as batch:
        for col in _new_columns():
            if col.name not in existing:
                batch.add_column(col)
    if "ix_jobs_categoria" not in {ix["name"] for ix in sa.inspect(bind).get_indexes("jobs")}:
        op.create_index("ix_jobs_categoria", "jobs", ["categoria"])


def downgrade() -> None:
    bind = op.get_bind()
    if "ix_jobs_categoria" in {ix["name"] for ix in sa.inspect(bind).get_indexes("jobs")}:
        op.drop_index("ix_jobs_categoria", table_name="jobs")
    existing = {c["name"] for c in sa.inspect(bind).get_columns("jobs")}
    with op.batch_alter_table("jobs") as batch:
        for col in _new_columns():
            if col.name in existing:
                batch.drop_column(col.name)
