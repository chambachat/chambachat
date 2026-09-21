"""reconcile_schema_with_models

Revision ID: c3f1a9d2e7b4
Revises: 99275590dd27
Create Date: 2026-09-21 10:00:00

La migración inicial (98ae4bac5768) fue escrita a mano y no coincidía con
app/models.py: faltaban las tablas chat_sessions y route_stops (existía una
transport_stops con otro nombre), y faltaban columnas en companies,
company_members, company_invitations, transport_routes y application_messages.
En bases existentes esto pasó desapercibido porque main.py hacía fallback a
Base.metadata.create_all(); en bases nuevas la app fallaba al insertar.

Esta migración es idempotente: cada cambio se aplica solo si falta, por lo que
es segura tanto para bases creadas por la migración inicial como para bases
creadas originalmente con create_all().
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3f1a9d2e7b4"
down_revision: Union[str, Sequence[str], None] = "99275590dd27"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ─── Helpers de introspección ─────────────────────────────────────────

def _inspector():
    return sa.inspect(op.get_bind())


def _has_table(name: str) -> bool:
    return name in _inspector().get_table_names()


def _has_column(table: str, column: str) -> bool:
    return column in {c["name"] for c in _inspector().get_columns(table)}


def _has_index(table: str, index: str) -> bool:
    return index in {i["name"] for i in _inspector().get_indexes(table)}


def _add_column_if_missing(table: str, column: sa.Column) -> None:
    if not _has_column(table, column.name):
        with op.batch_alter_table(table) as batch:
            batch.add_column(column)


def _create_index_if_missing(name: str, table: str, columns: list, unique: bool = False) -> None:
    if _has_table(table) and not _has_index(table, name):
        op.create_index(name, table, columns, unique=unique)


def _rename_invited_by(table: str) -> None:
    """invited_by → invited_by_email, conservando los datos."""
    if not _has_column(table, "invited_by_email"):
        _add_column_if_missing(table, sa.Column("invited_by_email", sa.String(255), nullable=True))
        if _has_column(table, "invited_by"):
            op.execute(sa.text(f"UPDATE {table} SET invited_by_email = invited_by WHERE invited_by_email IS NULL"))
    if _has_column(table, "invited_by"):
        with op.batch_alter_table(table) as batch:
            batch.drop_column("invited_by")


# ─── Upgrade ──────────────────────────────────────────────────────────

def upgrade() -> None:
    # 1. chat_sessions (sesiones del chatbot)
    if not _has_table("chat_sessions"):
        op.create_table(
            "chat_sessions",
            sa.Column("session_id", sa.String(100), primary_key=True),
            sa.Column("current_step", sa.String(50), nullable=True),
            sa.Column("collected_data", sa.Text(), nullable=True),
            sa.Column("completed", sa.Boolean(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )

    # 2. route_stops (paradas de rutas). Sustituye a la tabla mal nombrada transport_stops.
    if not _has_table("route_stops"):
        op.create_table(
            "route_stops",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("route_id", sa.Integer(), sa.ForeignKey("transport_routes.id", ondelete="CASCADE"), nullable=False),
            sa.Column("orden", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("nombre", sa.String(255), nullable=False),
            sa.Column("horario", sa.String(20), nullable=False),
            sa.Column("latitud", sa.Float(), nullable=False),
            sa.Column("longitud", sa.Float(), nullable=False),
            sa.Column("colonia_referencia", sa.String(255), nullable=True),
            sa.Column("referencia_visual", sa.String(255), nullable=True),
        )
        if _has_table("transport_stops"):
            op.execute(sa.text(
                "INSERT INTO route_stops (route_id, orden, nombre, horario, latitud, longitud, colonia_referencia) "
                "SELECT route_id, orden, nombre, COALESCE(horario, ''), latitud, longitud, colonia_referencia FROM transport_stops"
            ))
    if _has_table("transport_stops"):
        op.drop_table("transport_stops")
    _create_index_if_missing("ix_route_stops_route_id", "route_stops", ["route_id"])

    # 3. application_messages
    _add_column_if_missing("application_messages", sa.Column("leido", sa.Boolean(), nullable=True, server_default=sa.false()))
    _create_index_if_missing("ix_application_messages_application_id", "application_messages", ["application_id"])

    # 4. companies
    _add_column_if_missing("companies", sa.Column("logo_url", sa.String(500), nullable=True))
    _add_column_if_missing("companies", sa.Column("created_by_email", sa.String(255), nullable=True))
    _create_index_if_missing("ix_companies_nombre", "companies", ["nombre"])
    _create_index_if_missing("ix_companies_created_by_email", "companies", ["created_by_email"])

    # 5. company_invitations
    _rename_invited_by("company_invitations")
    _add_column_if_missing("company_invitations", sa.Column("expires_at", sa.DateTime(), nullable=True))
    _create_index_if_missing("ix_company_invitations_company_id", "company_invitations", ["company_id"])
    _create_index_if_missing("ix_company_invitations_email", "company_invitations", ["email"])
    _create_index_if_missing("ix_company_invitations_token", "company_invitations", ["token"], unique=True)

    # 6. company_members
    _rename_invited_by("company_members")
    _add_column_if_missing("company_members", sa.Column("joined_at", sa.DateTime(), nullable=True))
    if not _has_column("company_members", "user_id"):
        with op.batch_alter_table("company_members") as batch:
            batch.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
            batch.create_foreign_key("fk_company_members_user_id_users", "users", ["user_id"], ["id"], ondelete="SET NULL")
    _create_index_if_missing("ix_company_members_company_id", "company_members", ["company_id"])
    _create_index_if_missing("ix_company_members_email", "company_members", ["email"])

    # 7. company_shifts / transport_routes
    _create_index_if_missing("ix_company_shifts_company_id", "company_shifts", ["company_id"])
    _add_column_if_missing("transport_routes", sa.Column("hora_inicio", sa.String(20), nullable=True))
    _add_column_if_missing("transport_routes", sa.Column("tiempo_estimado_min", sa.Integer(), nullable=True))
    _create_index_if_missing("ix_transport_routes_company_id", "transport_routes", ["company_id"])

    # 8. hiring_history
    _create_index_if_missing("ix_hiring_history_meses_permanencia", "hiring_history", ["meses_permanencia"])


# ─── Downgrade ────────────────────────────────────────────────────────

def downgrade() -> None:
    """Revierte solo lo que es seguro revertir (columnas e índices agregados). No recrea transport_stops."""
    for name, table in [
        ("ix_hiring_history_meses_permanencia", "hiring_history"),
        ("ix_transport_routes_company_id", "transport_routes"),
        ("ix_company_shifts_company_id", "company_shifts"),
        ("ix_company_members_email", "company_members"),
        ("ix_company_members_company_id", "company_members"),
        ("ix_company_invitations_token", "company_invitations"),
        ("ix_company_invitations_email", "company_invitations"),
        ("ix_company_invitations_company_id", "company_invitations"),
        ("ix_companies_created_by_email", "companies"),
        ("ix_companies_nombre", "companies"),
        ("ix_application_messages_application_id", "application_messages"),
        ("ix_route_stops_route_id", "route_stops"),
    ]:
        if _has_table(table) and _has_index(table, name):
            op.drop_index(name, table_name=table)

    for table, column in [
        ("transport_routes", "tiempo_estimado_min"),
        ("transport_routes", "hora_inicio"),
        ("company_members", "joined_at"),
        ("company_invitations", "expires_at"),
        ("companies", "created_by_email"),
        ("companies", "logo_url"),
        ("application_messages", "leido"),
    ]:
        if _has_column(table, column):
            with op.batch_alter_table(table) as batch:
                batch.drop_column(column)

    if _has_table("chat_sessions"):
        op.drop_table("chat_sessions")
