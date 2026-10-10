from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Principal, load_principal
from app.core.permissions import Permission
from app.models import EmailDelivery, Survey, TextAnalysis, Ticket, User
from app.models.enums import TicketStatus
from app.repositories.base import TenantRepository
from app.services.audit import audit
from app.services.workspaces import WorkspaceService


class TicketRepository(TenantRepository[Ticket]):
    model = Ticket


def describe(ticket: Ticket) -> dict[str, Any]:
    return {
        key: getattr(ticket, key)
        for key in (
            "id",
            "workspace_id",
            "response_id",
            "analysis_id",
            "title",
            "status",
            "priority",
            "assignee_id",
            "due_at",
            "resolved_at",
            "notes",
            "created_at",
            "updated_at",
        )
    }


class TicketService:
    def __init__(self, db: AsyncSession, principal: Principal) -> None:
        self.db, self.principal = db, principal
        self.repo = TicketRepository(db, principal.tenant_id)

    async def get(self, ticket_id: uuid.UUID) -> Ticket:
        ticket = await self.repo.get_or_404(ticket_id)
        await WorkspaceService(self.db, self.principal).get(ticket.workspace_id)
        return ticket

    async def list(
        self, workspace_id: uuid.UUID, status: TicketStatus | None, page: int
    ) -> dict[str, Any]:
        await WorkspaceService(self.db, self.principal).get(workspace_id)
        filters = [Ticket.workspace_id == workspace_id]
        if status:
            filters.append(Ticket.status == status)
        rows = await self.repo.list(
            *filters, order_by=Ticket.created_at.desc(), limit=20, offset=(page - 1) * 20
        )
        return {
            "items": [describe(row) for row in rows],
            "total": await self.repo.count(*filters),
            "page": page,
            "page_size": 20,
        }

    async def update(self, ticket_id: uuid.UUID, fields: dict[str, Any]) -> Ticket:
        self.principal.require(Permission.LABEL_EDIT)
        await self.get(ticket_id)
        ticket: Ticket = (
            await self.db.execute(
                self.repo._scoped().where(Ticket.id == ticket_id).with_for_update()
            )
        ).scalar_one()
        previous_status = ticket.status
        if fields.get("assignee_id"):
            assignee = await load_principal(
                self.db, fields["assignee_id"], self.principal.tenant_id, None
            )
            assignee.require_workspace(ticket.workspace_id)
            assignee.require(Permission.LABEL_EDIT)
        note = fields.pop("note", None)
        for key, value in fields.items():
            setattr(ticket, key, value)
        if note:
            ticket.notes = [
                *ticket.notes,
                {
                    "text": note,
                    "user_id": str(self.principal.user_id),
                    "created_at": datetime.now(UTC).isoformat(),
                },
            ]
        ticket.resolved_at = (
            (ticket.resolved_at or datetime.now(UTC))
            if ticket.status == TicketStatus.DONE
            else None
        )
        ticket.updated_at = datetime.now(UTC)
        if ticket.status != previous_status and ticket.analysis_id:
            survey_id = (
                await self.db.execute(
                    select(TextAnalysis.survey_id).where(
                        TextAnalysis.id == ticket.analysis_id,
                        TextAnalysis.tenant_id == self.principal.tenant_id,
                    )
                )
            ).scalar_one_or_none()
            if survey_id:
                creator_email = (
                    await self.db.execute(
                        select(User.email)
                        .join(Survey, Survey.created_by == User.id)
                        .where(
                            Survey.id == survey_id,
                            Survey.tenant_id == self.principal.tenant_id,
                            User.deleted_at.is_(None),
                        )
                    )
                ).scalar_one_or_none()
                if creator_email:
                    status = ticket.status.value
                    updated_at = ticket.updated_at.isoformat()
                    self.db.add(
                        EmailDelivery(
                            tenant_id=self.principal.tenant_id,
                            workspace_id=ticket.workspace_id,
                            survey_id=survey_id,
                            recipient=creator_email,
                            kind="ticket",
                            dedupe_key=(
                                f"ticket:{ticket.id}:status:{status}:{updated_at}"
                            ),
                            payload={
                                "event": "status",
                                "ticket_id": str(ticket.id),
                                "title": ticket.title,
                                "status": status,
                                "priority": ticket.priority.value,
                            },
                        )
                    )
        await audit(
            self.db,
            tenant_id=self.principal.tenant_id,
            user_id=self.principal.user_id,
            action="ticket.update",
            entity_type="ticket",
            entity_id=ticket.id,
        )
        await self.db.flush()
        return ticket

    async def metrics(self, workspace_id: uuid.UUID) -> dict[str, Any]:
        await WorkspaceService(self.db, self.principal).get(workspace_id)
        scope = self.repo._scoped().where(Ticket.workspace_id == workspace_id).subquery()
        seconds = (
            await self.db.execute(
                select(
                    func.avg(func.extract("epoch", scope.c.resolved_at - scope.c.created_at))
                ).where(scope.c.resolved_at.is_not(None))
            )
        ).scalar_one()
        counts = (
            await self.db.execute(select(scope.c.status, func.count()).group_by(scope.c.status))
        ).all()
        return {
            "counts": dict(counts),
            "average_resolution_seconds": float(seconds) if seconds is not None else None,
        }
