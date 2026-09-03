"""Add google auth fields

Revision ID: faaf0faba9d5
Revises: 84c220225a37
Create Date: 2026-08-12 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'faaf0faba9d5'
down_revision: Union[str, None] = '84c220225a37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('google_id', sa.String(), nullable=True))
        batch_op.create_index(batch_op.f('ix_users_google_id'), ['google_id'], unique=True)
        batch_op.alter_column('hashed_password', existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('hashed_password', existing_type=sa.String(), nullable=False)
        batch_op.drop_index(batch_op.f('ix_users_google_id'))
        batch_op.drop_column('google_id')
