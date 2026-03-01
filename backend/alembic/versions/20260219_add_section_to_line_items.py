"""Add section field to line_items

Revision ID: 20260219_section_line
Revises: 20260211_company_docs
Create Date: 2026-02-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    return column in [c["name"] for c in insp.get_columns(table)]


revision = "20260219_section_line"
down_revision = "20260211_company_docs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if not _column_exists("line_items", "section"):
        op.add_column(
            "line_items",
            sa.Column("section", sa.String(length=255), nullable=True),
        )


def downgrade() -> None:
    if _column_exists("line_items", "section"):
        op.drop_column("line_items", "section")
