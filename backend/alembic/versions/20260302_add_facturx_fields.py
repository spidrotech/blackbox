"""Add Factur-X e-invoicing fields to invoices

Revision ID: 20260302_add_facturx_fields
Revises: 20260301_invoice_fields
Create Date: 2026-03-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


def _col(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in [c["name"] for c in inspect(bind).get_columns(table)]


revision = "20260302_add_facturx_fields"
down_revision = "20260301_invoice_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Lien avoir → facture originale
    if not _col("invoices", "original_invoice_id"):
        op.add_column(
            "invoices",
            sa.Column("original_invoice_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_invoices_original_invoice_id",
            "invoices",
            "invoices",
            ["original_invoice_id"],
            ["id"],
        )

    # Factur-X status (pending / generated / sent)
    if not _col("invoices", "facturx_status"):
        op.add_column(
            "invoices",
            sa.Column("facturx_status", sa.String(length=30), nullable=True),
        )

    # Factur-X XML content
    if not _col("invoices", "facturx_xml"):
        op.add_column(
            "invoices",
            sa.Column("facturx_xml", sa.Text(), nullable=True),
        )

    # SIREN acheteur
    if not _col("invoices", "siren_buyer"):
        op.add_column(
            "invoices",
            sa.Column("siren_buyer", sa.String(length=20), nullable=True),
        )


def downgrade() -> None:
    if _col("invoices", "siren_buyer"):
        op.drop_column("invoices", "siren_buyer")
    if _col("invoices", "facturx_xml"):
        op.drop_column("invoices", "facturx_xml")
    if _col("invoices", "facturx_status"):
        op.drop_column("invoices", "facturx_status")
    if _col("invoices", "original_invoice_id"):
        op.drop_constraint("fk_invoices_original_invoice_id", "invoices", type_="foreignkey")
        op.drop_column("invoices", "original_invoice_id")
