"""Add OTP fields to User

Revision ID: 4863ad3a2058
Revises: 8e952f83720c
Create Date: 2026-10-06 15:47:08.205269

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4863ad3a2058'
down_revision: Union[str, None] = '8e952f83720c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('reset_otp', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('reset_otp_expires_at', sa.DateTime(), nullable=True))

def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('reset_otp_expires_at')
        batch_op.drop_column('reset_otp')
