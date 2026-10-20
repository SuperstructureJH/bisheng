"""Separate model visibility from the shared personal credit allowance."""

import sqlalchemy as sa
from alembic import op

revision = "f062_unified_model_access"
down_revision = "f077_subject_id_search_indexes"
branch_labels = None
depends_on = None


def upgrade():
    from bisheng.dsh.domain.models.unified_policy import (
        CreditRule,
        ModelVisibility,
        PersonalLedgerState,
        UnifiedPolicyAudit,
    )

    bind = op.get_bind()
    for model in (ModelVisibility, CreditRule, UnifiedPolicyAudit, PersonalLedgerState):
        model.__table__.create(bind, checkfirst=True)
    # Retain historical audit values; new calls carry user/session identity.
    op.alter_column("dsh_model_call", "seat_id", existing_type=sa.String(36), nullable=True)
    op.alter_column("dsh_model_call", "grant_version", existing_type=sa.BigInteger(), nullable=True)


def downgrade():
    # Operational rollback restores the paired database snapshot. Credit policy
    # and historical audit data remain intact during a code-only downgrade.
    pass
