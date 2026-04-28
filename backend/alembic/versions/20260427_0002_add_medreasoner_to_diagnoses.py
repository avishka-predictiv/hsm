"""add medreasoner_diagnosis & medreasoner_session_id to diagnoses

Revision ID: 20260427_0002
Revises: 20260427_0001
Create Date: 2026-04-27
"""

from alembic import op
import sqlalchemy as sa


revision = "20260427_0002"
down_revision = "20260427_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("diagnoses", sa.Column("medreasoner_diagnosis", sa.Text(), nullable=True))
    op.add_column("diagnoses", sa.Column("medreasoner_session_id", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("diagnoses", "medreasoner_session_id")
    op.drop_column("diagnoses", "medreasoner_diagnosis")
