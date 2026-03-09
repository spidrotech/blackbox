"""Add reminder tracking to invoices

Revision ID: 20260309_relances_reports
Revises: 20260308_btp_features
Create Date: 2026-03-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


def _col(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in [c["name"] for c in inspect(bind).get_columns(table)]


revision = "20260309_relances_reports"
down_revision = "20260308_btp_features"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if not _col("invoices", "reminder_count"):
        op.add_column("invoices", sa.Column("reminder_count", sa.Integer(), nullable=False, server_default="0"))
    if not _col("invoices", "last_reminder_at"):
        op.add_column("invoices", sa.Column("last_reminder_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("invoices", "last_reminder_at")
    op.drop_column("invoices", "reminder_count")
