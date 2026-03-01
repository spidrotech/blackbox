"""add_line_item_types

Revision ID: 20260226_add_line_item_types
Revises: 20260219_obat_company
Create Date: 2026-02-26
"""
from alembic import op
import sqlalchemy as sa

revision = '20260226_add_line_item_types'
down_revision = '20260219_obat_company'
branch_labels = None
depends_on = None


def upgrade():
    # SQLite doesn't support ALTER COLUMN for enum; MySQL does.
    # We modify the column to accept broader string values.
    try:
        # MySQL: extend the ENUM column
        op.execute(
            "ALTER TABLE line_items MODIFY COLUMN item_type "
            "ENUM('supply','labor','work','subcontracting','equipment','misc','section','text','page_break','other') "
            "NOT NULL DEFAULT 'supply'"
        )
    except Exception:
        # SQLite / already done — just pass
        pass


def downgrade():
    try:
        op.execute(
            "ALTER TABLE line_items MODIFY COLUMN item_type "
            "ENUM('supply','labor','other') NOT NULL DEFAULT 'supply'"
        )
    except Exception:
        pass
