"""Add track to subjects

Revision ID: c1a2f9d84b6e
Revises: a3ebb5113344
Create Date: 2026-09-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2f9d84b6e'
down_revision: Union[str, None] = 'a3ebb5113344'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('subjects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('track', sa.String(), nullable=False, server_default='aptitude'))


def downgrade() -> None:
    with op.batch_alter_table('subjects', schema=None) as batch_op:
        batch_op.drop_column('track')
