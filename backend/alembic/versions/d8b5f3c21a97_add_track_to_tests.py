"""Add track to tests

Revision ID: d8b5f3c21a97
Revises: c1a2f9d84b6e
Create Date: 2026-09-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8b5f3c21a97'
down_revision: Union[str, None] = 'c1a2f9d84b6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('tests', schema=None) as batch_op:
        batch_op.add_column(sa.Column('track', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('tests', schema=None) as batch_op:
        batch_op.drop_column('track')
