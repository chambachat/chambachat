"""add_company_documents

Revision ID: d4e5f6a7b8c9
Revises: c3f1a9d2e7b4
Create Date: 2026-09-22 10:00:00

Las Constancias de Situación Fiscal se guardaban en el disco del servidor
(backend/uploads/csf). En Render el disco es efímero: cada deploy borra los
archivos y los enlaces "Ver Constancia Fiscal" devolvían 404. A partir de
ahora el archivo se guarda en la base de datos (tabla company_documents) y se
sirve desde ahí con la misma URL /uploads/csf/{filename}.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c3f1a9d2e7b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if "company_documents" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "company_documents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=True),
        sa.Column("content_type", sa.String(100), nullable=False, server_default="application/octet-stream"),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("uploaded_by_email", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_company_documents_filename", "company_documents", ["filename"], unique=True)


def downgrade() -> None:
    if "company_documents" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_index("ix_company_documents_filename", table_name="company_documents")
        op.drop_table("company_documents")
