"""add_user_location_fields

Revision ID: f7a8b9c0d1e2
Revises: e6a7b8c9d0e1
Create Date: 2026-09-23 12:00:00

El candidato puede registrar su ubicación desde el chat o desde su perfil.
- colonia: etiqueta legible de la ubicación confirmada.
- ubicacion_confirmada: distingue coordenadas precisas (GPS/mapa) del centro
  del municipio que se asignaba por defecto; solo las precisas se reutilizan.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "e6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _new_columns():
    return [
        sa.Column("colonia", sa.String(150), nullable=True),
        sa.Column("ubicacion_confirmada", sa.Boolean(), nullable=False, server_default=sa.false()),
    ]


def upgrade() -> None:
    existing = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("users")}
    with op.batch_alter_table("users") as batch:
        for col in _new_columns():
            if col.name not in existing:
                batch.add_column(col)


def downgrade() -> None:
    existing = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("users")}
    with op.batch_alter_table("users") as batch:
        for col in _new_columns():
            if col.name in existing:
                batch.drop_column(col.name)
