"""add users.name

Revision ID: 20260428_0001
Revises: dfcd5cf8b725
Create Date: 2026-04-28
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260428_0001"
down_revision = "dfcd5cf8b725"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=True))
    op.create_index("ix_users_name", "users", ["name"])


def downgrade() -> None:
    op.drop_index("ix_users_name", table_name="users")
    op.drop_column("users", "name")
