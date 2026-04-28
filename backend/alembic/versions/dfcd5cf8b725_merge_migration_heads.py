"""merge migration heads

Revision ID: dfcd5cf8b725
Revises: 20260427_0002, 6c82f567965a
Create Date: 2026-04-28 11:40:36.051251

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dfcd5cf8b725'
down_revision: Union[str, None] = ('20260427_0002', '6c82f567965a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
