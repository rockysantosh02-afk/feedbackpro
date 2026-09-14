"""add firebase_uid to users

Revision ID: 7a1f2e3d4c5b
Revises: fe0d749a6f17
Create Date: 2026-09-14 15:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a1f2e3d4c5b'
down_revision: Union[str, None] = 'fe0d749a6f17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('firebase_uid', sa.String(length=128), nullable=True))
        batch_op.alter_column(
            'password_hash',
            existing_type=sa.String(length=255),
            nullable=True,
        )
        batch_op.create_index(batch_op.f('ix_users_firebase_uid'), ['firebase_uid'], unique=True)


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_firebase_uid'))
        batch_op.alter_column(
            'password_hash',
            existing_type=sa.String(length=255),
            nullable=False,
        )
        batch_op.drop_column('firebase_uid')
