"""Add Obat-style company fields (legal, insurance, etc.)

Revision ID: 20260219_obat_company
Revises: 20260219_section_line
Create Date: 2026-02-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


def _col(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in [c["name"] for c in inspect(bind).get_columns(table)]


revision = "20260219_obat_company"
down_revision = "20260219_section_line"
branch_labels = None
depends_on = None

NEW_COLS = [
    ("rcs_city",             sa.String(100)),
    ("rm_number",            sa.String(50)),
    ("capital",              sa.Numeric(12, 2)),
    ("ape_code",             sa.String(10)),
    ("guarantee_type",       sa.String(20)),
    ("insurance_name",       sa.String(255)),
    ("insurance_coverage",   sa.String(255)),
    ("insurance_address",    sa.String(255)),
    ("insurance_zipcode",    sa.String(10)),
    ("insurance_city",       sa.String(100)),
    ("vat_subject",          sa.Boolean()),
    ("vat_collection_type",  sa.String(20)),
]


def upgrade() -> None:
    for col_name, col_type in NEW_COLS:
        if not _col("companies", col_name):
            op.add_column("companies", sa.Column(col_name, col_type, nullable=True))


def downgrade() -> None:
    for col_name, _ in reversed(NEW_COLS):
        if _col("companies", col_name):
            op.drop_column("companies", col_name)
