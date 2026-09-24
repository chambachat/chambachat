"""add_company_smart_code

Revision ID: i0d1e2f3a4b5
Revises: h9c0d1e2f3a4
Create Date: 2026-09-24 10:00:00

Código verificador único por empresa para el Smart Link (?empresa=<nombre>&codigo=<CODIGO>):
evita duplicidades o similitudes entre razones sociales al resolver la planta por código y
no por nombre. Se rellena para las empresas existentes.
"""
import secrets
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "i0d1e2f3a4b5"
down_revision: Union[str, Sequence[str], None] = "h9c0d1e2f3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sin 0/O ni 1/I para dictarlo sin confusiones


def _new_code(used: set) -> str:
    while True:
        code = "".join(secrets.choice(_ALPHABET) for _ in range(6))
        if code not in used:
            return code


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("companies")}
    if "smart_code" not in columns:
        with op.batch_alter_table("companies") as batch:
            batch.add_column(sa.Column("smart_code", sa.String(12), nullable=True))
    indexes = {ix["name"] for ix in sa.inspect(bind).get_indexes("companies")}
    if "ix_companies_smart_code" not in indexes:
        op.create_index("ix_companies_smart_code", "companies", ["smart_code"], unique=True)

    used = {r[0] for r in bind.execute(sa.text("SELECT smart_code FROM companies WHERE smart_code IS NOT NULL")).fetchall()}
    for (company_id,) in bind.execute(sa.text("SELECT id FROM companies WHERE smart_code IS NULL")).fetchall():
        code = _new_code(used)
        used.add(code)
        bind.execute(sa.text("UPDATE companies SET smart_code = :code WHERE id = :id"), {"code": code, "id": company_id})


def downgrade() -> None:
    bind = op.get_bind()
    indexes = {ix["name"] for ix in sa.inspect(bind).get_indexes("companies")}
    if "ix_companies_smart_code" in indexes:
        op.drop_index("ix_companies_smart_code", table_name="companies")
    columns = {c["name"] for c in sa.inspect(bind).get_columns("companies")}
    if "smart_code" in columns:
        with op.batch_alter_table("companies") as batch:
            batch.drop_column("smart_code")
