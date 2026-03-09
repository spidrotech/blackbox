"""BTP features: acomptes, situations, retenue de garantie, avenants

Revision ID: 20260308_btp_features
Revises: 20260302_expand_long_text_fields
Create Date: 2026-03-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


def _col(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in [c["name"] for c in inspect(bind).get_columns(table)]


revision = "20260308_btp_features"
down_revision = "20260302_expand_long_text_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Invoices ─────────────────────────────────────────────────────────────

    # Facture d'acompte
    if not _col("invoices", "deposit_percent"):
        op.add_column("invoices", sa.Column("deposit_percent", sa.Numeric(5, 2), nullable=True))

    # Facture de situation
    if not _col("invoices", "situation_number"):
        op.add_column("invoices", sa.Column("situation_number", sa.Integer(), nullable=True))
    if not _col("invoices", "situation_percent"):
        op.add_column("invoices", sa.Column("situation_percent", sa.Numeric(5, 2), nullable=True))
    if not _col("invoices", "cumulative_percent"):
        op.add_column("invoices", sa.Column("cumulative_percent", sa.Numeric(5, 2), nullable=True))

    # Retenue de garantie
    if not _col("invoices", "retention_percent"):
        op.add_column("invoices", sa.Column("retention_percent", sa.Numeric(5, 2), nullable=True))
    if not _col("invoices", "retention_released"):
        op.add_column(
            "invoices",
            sa.Column("retention_released", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if not _col("invoices", "retention_release_invoice_id"):
        op.add_column(
            "invoices",
            sa.Column("retention_release_invoice_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_invoices_retention_release_invoice_id",
            "invoices",
            "invoices",
            ["retention_release_invoice_id"],
            ["id"],
        )

    # ── Quotes ───────────────────────────────────────────────────────────────

    # Avenants (devis modificatifs)
    if not _col("quotes", "parent_quote_id"):
        op.add_column("quotes", sa.Column("parent_quote_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_quotes_parent_quote_id",
            "quotes",
            "quotes",
            ["parent_quote_id"],
            ["id"],
        )
    if not _col("quotes", "avenant_number"):
        op.add_column("quotes", sa.Column("avenant_number", sa.Integer(), nullable=True))
    if not _col("quotes", "quote_type"):
        op.add_column(
            "quotes",
            sa.Column("quote_type", sa.String(length=20), nullable=False, server_default="quote"),
        )


def downgrade() -> None:
    # Quotes
    if _col("quotes", "quote_type"):
        op.drop_column("quotes", "quote_type")
    if _col("quotes", "avenant_number"):
        op.drop_column("quotes", "avenant_number")
    if _col("quotes", "parent_quote_id"):
        op.drop_constraint("fk_quotes_parent_quote_id", "quotes", type_="foreignkey")
        op.drop_column("quotes", "parent_quote_id")

    # Invoices
    if _col("invoices", "retention_release_invoice_id"):
        op.drop_constraint("fk_invoices_retention_release_invoice_id", "invoices", type_="foreignkey")
        op.drop_column("invoices", "retention_release_invoice_id")
    if _col("invoices", "retention_released"):
        op.drop_column("invoices", "retention_released")
    if _col("invoices", "retention_percent"):
        op.drop_column("invoices", "retention_percent")
    if _col("invoices", "cumulative_percent"):
        op.drop_column("invoices", "cumulative_percent")
    if _col("invoices", "situation_percent"):
        op.drop_column("invoices", "situation_percent")
    if _col("invoices", "situation_number"):
        op.drop_column("invoices", "situation_number")
    if _col("invoices", "deposit_percent"):
        op.drop_column("invoices", "deposit_percent")
