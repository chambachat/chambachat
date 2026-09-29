"""add_company_faqs

Revision ID: cdd32aa38bd4
Revises: 3ed2b53a3ef7
Create Date: 2026-09-29 07:13:53.005982

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cdd32aa38bd4'
down_revision: Union[str, Sequence[str], None] = '3ed2b53a3ef7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'company_faqs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('company_id', sa.Integer(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('pregunta', sa.String(500), nullable=False),
        sa.Column('respuesta', sa.Text(), nullable=False),
        sa.Column('orden', sa.Integer(), server_default='0'),
        sa.Column('activa', sa.Boolean(), server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('company_faqs')
