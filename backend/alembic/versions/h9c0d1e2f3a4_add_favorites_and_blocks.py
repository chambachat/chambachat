"""add_favorites_and_blocks

Revision ID: h9c0d1e2f3a4
Revises: g8b9c0d1e2f3
Create Date: 2026-09-24 09:00:00

- candidate_favorites: candidatos preferidos por empresa (para retomar el chat cuando haga falta).
- chat_blocks: bloqueos en ambos sentidos (empresa → candidato, candidato → empresa) para
  cortar la comunicación en casos de acoso.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h9c0d1e2f3a4"
down_revision: Union[str, Sequence[str], None] = "g8b9c0d1e2f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())

    if "candidate_favorites" not in tables:
        op.create_table(
            "candidate_favorites",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
            sa.Column("candidate_email", sa.String(255), nullable=False),
            sa.Column("candidate_name", sa.String(255), nullable=True),
            sa.Column("application_id", sa.Integer(), sa.ForeignKey("job_applications.id", ondelete="SET NULL"), nullable=True),
            sa.Column("nota", sa.Text(), nullable=True),
            sa.Column("added_by_email", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("company_id", "candidate_email", name="uq_favorite_company_candidate"),
        )
        op.create_index("ix_candidate_favorites_company_id", "candidate_favorites", ["company_id"])
        op.create_index("ix_candidate_favorites_candidate_email", "candidate_favorites", ["candidate_email"])

    if "chat_blocks" not in tables:
        op.create_table(
            "chat_blocks",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("blocker_type", sa.String(20), nullable=False),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
            sa.Column("candidate_email", sa.String(255), nullable=False),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("created_by_email", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("blocker_type", "company_id", "candidate_email", name="uq_block_side_company_candidate"),
        )
        op.create_index("ix_chat_blocks_company_id", "chat_blocks", ["company_id"])
        op.create_index("ix_chat_blocks_candidate_email", "chat_blocks", ["candidate_email"])


def downgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "chat_blocks" in tables:
        op.drop_table("chat_blocks")
    if "candidate_favorites" in tables:
        op.drop_table("candidate_favorites")
