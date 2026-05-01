"""add patient weight and height

Revision ID: 20260429_0001
Revises: 20260428_0001
Create Date: 2026-04-29
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260429_0001"
down_revision = "20260428_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("weight", sa.Float(), nullable=True))
    op.add_column("patients", sa.Column("height", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "height")
    op.drop_column("patients", "weight")
