from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import EmailDelivery, Membership, Survey, TextAnalysis, Ticket, User
from app.models.enums import MembershipStatus, Role, TicketPriority


async def create_alert(db: AsyncSession, analysis: TextAnalysis) -> None:
    # Ticket and notification outbox are committed together; lock/check avoids duplicates.
    existing = (
        await db.execute(
            select(Ticket).where(
                Ticket.analysis_id == analysis.id, Ticket.tenant_id == analysis.tenant_id
            )
        )
    ).scalar_one_or_none()
    if existing or not (
        analysis.is_urgent
        or analysis.sentiment == "negative"
        or (analysis.rating is not None and analysis.rating <= 2)
    ):
        return

    ticket = Ticket(
        tenant_id=analysis.tenant_id,
        workspace_id=analysis.workspace_id,
        response_id=analysis.response_id,
        analysis_id=analysis.id,
        title=analysis.text[:300],
        priority=TicketPriority.URGENT if analysis.is_urgent else TicketPriority.HIGH,
    )
    db.add(ticket)
    await db.flush()

    # Active tenant admins are the support recipients; also notify the survey creator.
    recipients = {
        email.lower(): email
        for email in (
            await db.execute(
                select(User.email)
                .join(Membership, Membership.user_id == User.id)
                .where(
                    Membership.tenant_id == analysis.tenant_id,
                    Membership.role == Role.ADMIN,
                    Membership.status == MembershipStatus.ACTIVE,
                    User.deleted_at.is_(None),
                )
            )
        )
        .scalars()
        .all()
    }
    creator_email = (
        await db.execute(
            select(User.email)
            .join(Survey, Survey.created_by == User.id)
            .where(
                Survey.id == analysis.survey_id,
                Survey.tenant_id == analysis.tenant_id,
                User.deleted_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if creator_email:
        recipients.setdefault(creator_email.lower(), creator_email)

    for recipient_key, recipient in recipients.items():
        db.add(
            EmailDelivery(
                tenant_id=analysis.tenant_id,
                workspace_id=analysis.workspace_id,
                survey_id=analysis.survey_id,
                recipient=recipient,
                kind="ticket",
                dedupe_key=f"ticket:{ticket.id}:created:{recipient_key}",
                payload={
                    "event": "created",
                    "ticket_id": str(ticket.id),
                    "title": ticket.title,
                    "status": ticket.status.value,
                    "priority": ticket.priority.value,
                    "urgent_reasons": analysis.urgent_reasons,
                },
            )
        )
