"""add company document settings

Revision ID: 20260211_add_company_document_settings
Revises: 1a767bca4e15
Create Date: 2026-02-11 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '20260211_company_docs'
down_revision = '1a767bca4e15'
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    return column in [c["name"] for c in insp.get_columns(table)]


def upgrade():
    columns_to_add = [
        ("header_text", sa.Column("header_text", sa.Text(), nullable=True)),
        ("footer_text", sa.Column("footer_text", sa.Text(), nullable=True)),
        ("visuals_json", sa.Column("visuals_json", sa.Text(), nullable=True)),
        ("labels_json", sa.Column("labels_json", sa.Text(), nullable=True)),
        ("quote_defaults_json", sa.Column("quote_defaults_json", sa.Text(), nullable=True)),
        ("invoice_defaults_json", sa.Column("invoice_defaults_json", sa.Text(), nullable=True)),
        ("cgv_url", sa.Column("cgv_url", sa.String(length=500), nullable=True)),
    ]
    for col_name, col_def in columns_to_add:
        if not _column_exists("companies", col_name):
            op.add_column("companies", col_def)


def downgrade():
    for col_name in ("cgv_url", "invoice_defaults_json", "quote_defaults_json",
                     "labels_json", "visuals_json", "footer_text", "header_text"):
        if _column_exists("companies", col_name):
            op.drop_column("companies", col_name)
