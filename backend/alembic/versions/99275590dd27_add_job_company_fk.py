"""add_job_company_fk

Revision ID: 99275590dd27
Revises: 98ae4bac5768
Create Date: 2026-09-15 17:22:52.025662

Adds a ForeignKey from jobs.empresa_id → companies.id.
The column already exists — this migration only adds the constraint.
Also backfills empresa_id for existing jobs by matching empresa_nombre.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99275590dd27'
down_revision: Union[str, Sequence[str], None] = '98ae4bac5768'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FK_NAME = "fk_jobs_empresa_id_companies"


def upgrade() -> None:
    """Add FK constraint and backfill empresa_id from empresa_nombre."""
    conn = op.get_bind()
    dialect = conn.dialect.name

    # Backfill: match existing jobs to companies by name
    conn.execute(sa.text(
        "UPDATE jobs SET empresa_id = ("
        "  SELECT c.id FROM companies c"
        "  WHERE LOWER(c.nombre) = LOWER(jobs.empresa_nombre)"
        "  LIMIT 1"
        ") WHERE empresa_id IS NULL OR empresa_id = 1"
    ))

    if dialect == "sqlite":
        # SQLite doesn't support ALTER TABLE ADD CONSTRAINT.
        # The FK is declared in the model and will be enforced on new rows.
        # For SQLite, we use batch mode to recreate the table.
        with op.batch_alter_table("jobs") as batch_op:
            batch_op.create_foreign_key(
                FK_NAME, "companies", ["empresa_id"], ["id"]
            )
    else:
        op.create_foreign_key(
            FK_NAME, "jobs", "companies", ["empresa_id"], ["id"]
        )


def downgrade() -> None:
    """Remove FK constraint."""
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == "sqlite":
        with op.batch_alter_table("jobs") as batch_op:
            batch_op.drop_constraint(FK_NAME, type_="foreignkey")
    else:
        op.drop_constraint(FK_NAME, "jobs", type_="foreignkey")
