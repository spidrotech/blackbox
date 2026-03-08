"""Expand long text fields to TEXT for quotes, invoices and company defaults

Revision ID: 20260302_expand_long_text_fields
Revises: 20260302_add_facturx_fields
Create Date: 2026-03-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260302_expand_long_text_fields"
down_revision = "20260302_add_facturx_fields"
branch_labels = None
depends_on = None


def _col(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in [c["name"] for c in inspect(bind).get_columns(table)]


def _alter_to_text(table: str, column: str) -> None:
    if not _col(table, column):
        return
    op.alter_column(
        table,
        column,
        existing_type=sa.String(length=255),
        type_=sa.Text(),
        existing_nullable=True,
    )


def _alter_to_varchar(table: str, column: str) -> None:
    if not _col(table, column):
        return
    op.alter_column(
        table,
        column,
        existing_type=sa.Text(),
        type_=sa.String(length=255),
        existing_nullable=True,
    )


def upgrade() -> None:
    # companies
    _alter_to_text("companies", "default_payment_terms")
    _alter_to_text("companies", "default_conditions")
    _alter_to_text("companies", "legal_mentions")

    # quotes
    _alter_to_text("quotes", "notes")
    _alter_to_text("quotes", "payment_terms")
    _alter_to_text("quotes", "conditions")
    _alter_to_text("quotes", "bank_details")
    _alter_to_text("quotes", "footer_notes")
    _alter_to_text("quotes", "legal_mentions")
    _alter_to_text("quotes", "payment_methods")

    # invoices
    _alter_to_text("invoices", "notes")
    _alter_to_text("invoices", "payment_terms")
    _alter_to_text("invoices", "bank_details")
    _alter_to_text("invoices", "conditions")


def downgrade() -> None:
    # invoices
    _alter_to_varchar("invoices", "conditions")
    _alter_to_varchar("invoices", "bank_details")
    _alter_to_varchar("invoices", "payment_terms")
    _alter_to_varchar("invoices", "notes")

    # quotes
    _alter_to_varchar("quotes", "payment_methods")
    _alter_to_varchar("quotes", "legal_mentions")
    _alter_to_varchar("quotes", "footer_notes")
    _alter_to_varchar("quotes", "bank_details")
    _alter_to_varchar("quotes", "conditions")
    _alter_to_varchar("quotes", "payment_terms")
    _alter_to_varchar("quotes", "notes")

    # companies
    _alter_to_varchar("companies", "legal_mentions")
    _alter_to_varchar("companies", "default_conditions")
    _alter_to_varchar("companies", "default_payment_terms")
