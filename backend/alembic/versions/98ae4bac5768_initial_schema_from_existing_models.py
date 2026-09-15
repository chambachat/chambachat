"""initial_schema_from_existing_models

Revision ID: 98ae4bac5768
Revises: 
Create Date: 2026-09-15 17:17:11.079143

This is a 'stamp' migration. It marks an existing database as being
at the initial revision without applying any DDL. For fresh databases,
Alembic will create all tables from the models metadata.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98ae4bac5768'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    """Check if a table already exists in the database."""
    conn = op.get_bind()
    dialect = conn.dialect.name
    if dialect == "sqlite":
        result = conn.execute(
            sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
            {"name": table_name},
        )
    else:
        result = conn.execute(
            sa.text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_name=:name AND table_schema='public'"
            ),
            {"name": table_name},
        )
    return result.fetchone() is not None


def upgrade() -> None:
    """Create all tables if they don't exist (idempotent)."""
    if _table_exists("users"):
        # Database already has tables — this is an existing installation.
        # Nothing to do: we're just stamping the current state.
        return

    # Fresh database: create all tables from scratch.
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True, index=True),
        sa.Column("role", sa.String(50), server_default="candidate", index=True),
        sa.Column("empresa_nombre", sa.String(255), nullable=True),
        sa.Column("telefono", sa.String(50), nullable=True),
        sa.Column("codigo_postal", sa.String(10), nullable=True),
        sa.Column("municipio", sa.String(100), nullable=True),
        sa.Column("nivel_educativo", sa.String(50), nullable=False, server_default="Secundaria"),
        sa.Column("tag_inea", sa.Boolean(), server_default="0", index=True),
        sa.Column("latitud", sa.Float(), nullable=True),
        sa.Column("longitud", sa.Float(), nullable=True),
        sa.Column("sueldo_deseado", sa.Float(), nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("google_id", sa.String(255), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("empresa_id", sa.Integer(), server_default="1"),
        sa.Column("empresa_nombre", sa.String(255), server_default="Manufactura Monterrey"),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("sueldo_semanal_libre", sa.Float(), nullable=False),
        sa.Column("turnos_fijos", sa.Boolean(), server_default="0"),
        sa.Column("apoyo_inea", sa.Boolean(), server_default="0", index=True),
        sa.Column("transporte_incluido", sa.Boolean(), server_default="1"),
        sa.Column("municipio", sa.String(100), nullable=False),
        sa.Column("latitud", sa.Float(), nullable=False),
        sa.Column("longitud", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "hiring_history",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id")),
        sa.Column("sueldo_inicial", sa.Float(), nullable=False),
        sa.Column("tiempo_traslado_min", sa.Integer(), nullable=False),
        sa.Column("turnos_fijos", sa.Boolean(), server_default="0"),
        sa.Column("apoyo_inea", sa.Boolean(), server_default="0"),
        sa.Column("fecha_contratacion", sa.Date(), nullable=False),
        sa.Column("fecha_baja", sa.Date(), nullable=True),
        sa.Column("meses_permanencia", sa.Float(), nullable=False),
        sa.Column("motivo_baja", sa.String(255), nullable=True),
    )

    op.create_table(
        "bot_flow_config",
        sa.Column("step_key", sa.String(50), primary_key=True),
        sa.Column("step_order", sa.Integer(), nullable=False),
        sa.Column("titulo_admin", sa.String(100), nullable=False),
        sa.Column("prompt_texto", sa.Text(), nullable=False),
        sa.Column("opciones_json", sa.Text(), server_default="[]"),
        sa.Column("activo", sa.Boolean(), server_default="1"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("rfc", sa.String(13), nullable=True),
        sa.Column("municipio", sa.String(100), nullable=True),
        sa.Column("industria", sa.String(100), nullable=True),
        sa.Column("telefono_contacto", sa.String(50), nullable=True),
        sa.Column("direccion", sa.String(500), nullable=True),
        sa.Column("constancia_fiscal_url", sa.String(500), nullable=True),
        sa.Column("estado_verificacion", sa.String(50), server_default="verificada"),
        sa.Column("regimen_fiscal", sa.String(100), nullable=True),
        sa.Column("idcif", sa.String(50), nullable=True),
        sa.Column("curp", sa.String(20), nullable=True),
        sa.Column("razon_social", sa.String(255), nullable=True),
        sa.Column("regimen_capital", sa.String(150), nullable=True),
        sa.Column("fecha_inicio_operaciones", sa.String(50), nullable=True),
        sa.Column("estatus_padron", sa.String(50), nullable=True),
        sa.Column("fecha_ultimo_cambio_estado", sa.String(50), nullable=True),
        sa.Column("codigo_postal", sa.String(10), nullable=True),
        sa.Column("entidad_federativa", sa.String(100), nullable=True),
        sa.Column("colonia", sa.String(150), nullable=True),
        sa.Column("tipo_vialidad", sa.String(50), nullable=True),
        sa.Column("calle", sa.String(255), nullable=True),
        sa.Column("numero_exterior", sa.String(50), nullable=True),
        sa.Column("numero_interior", sa.String(50), nullable=True),
        sa.Column("sat_url_validacion", sa.String(500), nullable=True),
        sa.Column("sat_validado", sa.Boolean(), server_default="0"),
        sa.Column("sat_raw_data", sa.Text(), nullable=True),
        sa.Column("latitud", sa.Float(), nullable=True),
        sa.Column("longitud", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "company_members",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=True),
        sa.Column("role", sa.String(50), server_default="recruiter"),
        sa.Column("status", sa.String(50), server_default="active"),
        sa.Column("invited_by", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "company_invitations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=True),
        sa.Column("role", sa.String(50), server_default="recruiter"),
        sa.Column("status", sa.String(50), server_default="pending"),
        sa.Column("invited_by", sa.String(255), nullable=True),
        sa.Column("token", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "company_shifts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("hora_entrada", sa.String(20), nullable=True),
        sa.Column("hora_salida", sa.String(20), nullable=True),
        sa.Column("dias", sa.String(100), nullable=True),
        sa.Column("tipo", sa.String(50), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "transport_routes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("turno", sa.String(100), nullable=True),
        sa.Column("hora_llegada_planta", sa.String(20), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("color_hex", sa.String(7), nullable=True),
        sa.Column("activa", sa.Boolean(), server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "transport_stops",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("route_id", sa.Integer(), sa.ForeignKey("transport_routes.id"), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("horario", sa.String(20), nullable=True),
        sa.Column("latitud", sa.Float(), nullable=False),
        sa.Column("longitud", sa.Float(), nullable=False),
        sa.Column("colonia_referencia", sa.String(200), nullable=True),
    )

    op.create_table(
        "job_applications",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("session_id", sa.String(255), nullable=True, index=True),
        sa.Column("candidate_name", sa.String(255), nullable=True),
        sa.Column("candidate_email", sa.String(255), nullable=True),
        sa.Column("candidate_phone", sa.String(50), nullable=True),
        sa.Column("municipio", sa.String(100), nullable=True),
        sa.Column("match_score", sa.Float(), nullable=True),
        sa.Column("status", sa.String(50), server_default="applied"),
        sa.Column("bot_silenced", sa.Boolean(), server_default="0"),
        sa.Column("last_candidate_message_at", sa.DateTime(), nullable=True),
        sa.Column("last_recruiter_message_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "application_messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("application_id", sa.Integer(), sa.ForeignKey("job_applications.id"), nullable=False),
        sa.Column("sender_type", sa.String(20), nullable=False),
        sa.Column("sender_name", sa.String(255), nullable=True),
        sa.Column("mensaje", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "email_verification_codes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False, index=True),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0"),
        sa.Column("max_attempts", sa.Integer(), server_default="5"),
        sa.Column("verified", sa.Boolean(), server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    """Drop all tables (destructive — use with caution)."""
    op.drop_table("email_verification_codes")
    op.drop_table("application_messages")
    op.drop_table("job_applications")
    op.drop_table("transport_stops")
    op.drop_table("transport_routes")
    op.drop_table("company_shifts")
    op.drop_table("company_invitations")
    op.drop_table("company_members")
    op.drop_table("companies")
    op.drop_table("bot_flow_config")
    op.drop_table("hiring_history")
    op.drop_table("jobs")
    op.drop_table("users")
