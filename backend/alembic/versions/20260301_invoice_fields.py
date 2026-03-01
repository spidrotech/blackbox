"""Add purchase_order and conditions to invoices

Revision ID: 20260301_invoice_fields
Revises: 20260226_add_line_item_types
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


def _col(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in [c["name"] for c in inspect(bind).get_columns(table)]


revision = "20260301_invoice_fields"
down_revision = "20260226_add_line_item_types"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if not _col("invoices", "purchase_order"):
        op.add_column(
            "invoices",
            sa.Column("purchase_order", sa.String(length=100), nullable=True),
        )
    if not _col("invoices", "conditions"):
        op.add_column(
            "invoices",
            sa.Column("conditions", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    if _col("invoices", "conditions"):
        op.drop_column("invoices", "conditions")
    if _col("invoices", "purchase_order"):
        op.drop_column("invoices", "purchase_order")
