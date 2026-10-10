"""CSI brand palette and green defaults for workspace and topic colors."""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "workspaces",
        "color",
        existing_type=sa.String(length=16),
        server_default="#16834b",
        existing_nullable=False,
    )
    op.alter_column(
        "topics",
        "color",
        existing_type=sa.String(length=16),
        server_default="#16834b",
        existing_nullable=False,
    )
    op.execute(
        sa.text(
            "UPDATE workspaces SET color = '#16834b' WHERE color = '#4f46e5'"
        )
    )
def downgrade() -> None:
    op.alter_column(
        "workspaces",
        "color",
        existing_type=sa.String(length=16),
        server_default="#4f46e5",
        existing_nullable=False,
    )
    op.alter_column(
        "topics",
        "color",
        existing_type=sa.String(length=16),
        server_default="#6366f1",
        existing_nullable=False,
    )
