"""Add connections, experience, education, skills tables

Revision ID: 9d7af0c712c9
Revises: e7e9756d5b9f
Create Date: 2026-08-12 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d7af0c712c9'
down_revision: Union[str, None] = 'e7e9756d5b9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'connections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('requester_id', sa.Integer(), nullable=False),
        sa.Column('addressee_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), server_default='pending', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['requester_id'], ['users.id']),
        sa.ForeignKeyConstraint(['addressee_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('requester_id', 'addressee_id', name='uq_connection_pair'),
    )
    with op.batch_alter_table('connections', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_connections_requester_id'), ['requester_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_connections_addressee_id'), ['addressee_id'], unique=False)

    op.create_table(
        'experiences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('company', sa.String(), nullable=False),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('start_month', sa.String(), nullable=False),
        sa.Column('end_month', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('experiences', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_experiences_user_id'), ['user_id'], unique=False)

    op.create_table(
        'education',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('school', sa.String(), nullable=False),
        sa.Column('degree', sa.String(), nullable=True),
        sa.Column('field_of_study', sa.String(), nullable=True),
        sa.Column('start_year', sa.String(), nullable=True),
        sa.Column('end_year', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('education', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_education_user_id'), ['user_id'], unique=False)

    op.create_table(
        'skills',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'name', name='uq_skill_user_name'),
    )
    with op.batch_alter_table('skills', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_skills_user_id'), ['user_id'], unique=False)

    op.create_table(
        'skill_endorsements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('skill_id', sa.Integer(), nullable=False),
        sa.Column('endorser_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['skill_id'], ['skills.id']),
        sa.ForeignKeyConstraint(['endorser_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('skill_id', 'endorser_id', name='uq_endorsement_pair'),
    )
    with op.batch_alter_table('skill_endorsements', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_skill_endorsements_skill_id'), ['skill_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_skill_endorsements_endorser_id'), ['endorser_id'], unique=False)


def downgrade() -> None:
    op.drop_table('skill_endorsements')
    op.drop_table('skills')
    op.drop_table('education')
    op.drop_table('experiences')
    op.drop_table('connections')
