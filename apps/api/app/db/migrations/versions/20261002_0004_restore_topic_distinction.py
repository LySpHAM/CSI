"""Restore distinct topic colors after the brand palette update."""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE topics SET color = CASE color
                WHEN '#5b8c59' THEN '#f97316'
                WHEN '#4b8b5d' THEN '#8b5cf6'
                WHEN '#2f8a68' THEN '#0ea5e9'
                WHEN '#16834b' THEN '#22c55e'
                WHEN '#3f9b71' THEN '#14b8a6'
                WHEN '#276749' THEN '#6366f1'
                WHEN '#86a65b' THEN '#f59e0b'
                WHEN '#547d45' THEN '#ef4444'
                WHEN '#7f963e' THEN '#eab308'
                ELSE color
            END
            WHERE color IN (
                '#5b8c59', '#4b8b5d', '#2f8a68', '#16834b', '#3f9b71',
                '#276749', '#86a65b', '#547d45', '#7f963e'
            )
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE topics SET color = CASE color
                WHEN '#f97316' THEN '#5b8c59'
                WHEN '#8b5cf6' THEN '#4b8b5d'
                WHEN '#0ea5e9' THEN '#2f8a68'
                WHEN '#22c55e' THEN '#16834b'
                WHEN '#14b8a6' THEN '#3f9b71'
                WHEN '#6366f1' THEN '#276749'
                WHEN '#f59e0b' THEN '#86a65b'
                WHEN '#ef4444' THEN '#547d45'
                WHEN '#eab308' THEN '#7f963e'
                ELSE color
            END
            WHERE color IN (
                '#f97316', '#8b5cf6', '#0ea5e9', '#22c55e', '#14b8a6',
                '#6366f1', '#f59e0b', '#ef4444', '#eab308'
            )
            """
        )
    )
