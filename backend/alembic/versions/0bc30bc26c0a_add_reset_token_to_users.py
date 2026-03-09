"""add_reset_token_to_users

Revision ID: 0bc30bc26c0a
Revises: 20260309_relances_reports
Create Date: 2026-03-09 14:45:45.718699

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision: str = '0bc30bc26c0a'
down_revision: Union[str, None] = '20260309_relances_reports'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('reset_token', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True))
    op.add_column('users', sa.Column('reset_token_expires', sa.DateTime(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    op.drop_column('users', 'reset_token_expires')
    op.drop_column('users', 'reset_token')
