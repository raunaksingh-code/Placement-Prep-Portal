"""add_module_to_interview_questions

Revision ID: 6852df7da66b
Revises: 5978cd38df1c
Create Date: 2026-11-20 17:49:11.324268

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6852df7da66b'
down_revision: Union[str, None] = '5978cd38df1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('interview_questions', sa.Column('module', sa.String(), server_default='PGDM 2', nullable=False))
    op.create_index(op.f('ix_interview_questions_module'), 'interview_questions', ['module'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_interview_questions_module'), table_name='interview_questions')
    op.drop_column('interview_questions', 'module')
