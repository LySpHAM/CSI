from __future__ import annotations

import json
import io
import uuid
from collections.abc import AsyncIterator
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from fastapi.responses import Response as HttpResponse, StreamingResponse
from sqlalchemy import and_, exists, func, or_, select

from app.core.auth import Ctx
from app.core.permissions import Permission
from app.domain.tabular import csv_bytes, safe_cell
from app.models import Answer, LabelCorrection, Question, Response, Survey, TextAnalysis
from app.models.enums import ResponseStatus, ReviewStatus
from app.schemas.feedback import (
    BulkCorrection,
    CorrectionInput,
    FeedbackFilter,
    ResponseRecordFilter,
)
from app.services.feedback import FeedbackService, describe

router = APIRouter(tags=["feedback"])


@router.get("/responses/export")
async def export_responses(
    ctx: Ctx, filters: Annotated[FeedbackFilter, Depends()]
) -> HttpResponse:
    """Download actual survey answers as an XLSX workbook, one row per answer."""
    from app.services.workspaces import WorkspaceService

    ctx.principal.require(Permission.DATA_EXPORT)
    await WorkspaceService(ctx.db, ctx.principal).get(filters.workspace_id)
    query = (
        select(Response, Survey.title, Answer, Question.title)
        .join(Survey, Survey.id == Response.survey_id)
        .outerjoin(Answer, Answer.response_id == Response.id)
        .outerjoin(Question, Question.id == Answer.question_id)
        .where(
            Response.tenant_id == ctx.principal.tenant_id,
            Response.workspace_id == filters.workspace_id,
            Survey.deleted_at.is_(None),
            Response.status != ResponseStatus.SPAM,
        )
        .order_by(Response.created_at, Response.id, Question.position)
    )
    if filters.survey_id:
        query = query.where(Response.survey_id == filters.survey_id)
    if filters.start:
        query = query.where(Response.created_at >= filters.start)
    if filters.end:
        query = query.where(Response.created_at < filters.end)
    if filters.channel:
        query = query.where(Response.channel == filters.channel)

    from openpyxl import Workbook

    workbook = Workbook(write_only=True)
    sheet = workbook.create_sheet("Phản hồi khách hàng")
    sheet.freeze_panes = "A2"
    sheet.append(
        [
            "Mã phản hồi", "Khảo sát", "Thời gian gửi", "Trạng thái", "Điểm đánh giá",
            "CSAT", "NPS", "Kênh", "Người trả lời", "Mã câu hỏi", "Câu hỏi", "Câu trả lời",
        ]
    )
    result = await ctx.db.stream(query.execution_options(yield_per=200))
    async for response, survey_title, answer, question_title in result:
        title = question_title or {}
        if isinstance(title, dict):
            title = title.get(response.language) or title.get("vi") or next(iter(title.values()), "")
        value = answer.text_value if answer and answer.text_value is not None else (
            answer.value if answer else ""
        )
        respondent = json.dumps(response.respondent, ensure_ascii=False)
        if isinstance(value, (dict, list)):
            value = json.dumps(value, ensure_ascii=False)
        sheet.append(
            [
                str(response.id), safe_cell(survey_title),
                (response.submitted_at or response.created_at).replace(tzinfo=None),
                response.status.value, response.rating, response.csat, response.nps,
                response.channel.value, safe_cell(respondent),
                answer.question_code if answer else "", safe_cell(title), safe_cell(value),
            ]
        )
    output = io.BytesIO()
    workbook.save(output)
    return HttpResponse(
        output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="customer-responses.xlsx"'},
    )


@router.get("/responses")
async def list_feedback(ctx: Ctx, filters: Annotated[FeedbackFilter, Depends()]) -> dict[str, Any]:
    return await FeedbackService(ctx.db, ctx.principal).list(filters)


@router.get("/responses/records")
async def list_response_records(
    ctx: Ctx, filters: Annotated[ResponseRecordFilter, Depends()]
) -> dict[str, Any]:
    """List submitted surveys and answers, including non-text responses without NLP rows."""
    from app.services.workspaces import WorkspaceService

    await WorkspaceService(ctx.db, ctx.principal).get(filters.workspace_id)
    stmt = (
        select(Response)
        .join(Survey, Survey.id == Response.survey_id)
        .where(
            Response.tenant_id == ctx.principal.tenant_id,
            Response.workspace_id == filters.workspace_id,
            Response.status != ResponseStatus.SPAM,
            Survey.tenant_id == ctx.principal.tenant_id,
            Survey.deleted_at.is_(None),
        )
    )
    if filters.survey_id:
        stmt = stmt.where(Response.survey_id == filters.survey_id)
    if filters.rating is not None:
        stmt = stmt.where(Response.rating == filters.rating)
    if filters.answer_question_code and filters.answer_value is not None:
        matching_answer = exists(
            select(Answer.id).where(
                Answer.tenant_id == ctx.principal.tenant_id,
                Answer.response_id == Response.id,
                Answer.question_code == filters.answer_question_code,
                or_(
                    Answer.value == filters.answer_value,
                    Answer.value.contains([filters.answer_value]),
                ),
            )
        )
        stmt = stmt.where(matching_answer)

    total = int(
        (await ctx.db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    )
    responses = list(
        (
            await ctx.db.execute(
                stmt.order_by(Response.submitted_at.desc().nullslast(), Response.id)
                .limit(filters.page_size)
                .offset((filters.page - 1) * filters.page_size)
            )
        ).scalars()
    )
    response_ids = [row.id for row in responses]
    answer_rows: dict[uuid.UUID, list[dict[str, Any]]] = {response_id: [] for response_id in response_ids}
    if response_ids:
        answer_query = (
            select(Answer, Question.title)
            .outerjoin(
                Question,
                and_(
                    Question.id == Answer.question_id,
                    Question.tenant_id == ctx.principal.tenant_id,
                ),
            )
            .where(
                Answer.tenant_id == ctx.principal.tenant_id,
                Answer.response_id.in_(response_ids),
            )
            .order_by(Answer.created_at, Answer.id)
        )
        if filters.answer_question_code:
            answer_query = answer_query.where(Answer.question_code == filters.answer_question_code)
        for answer, title in (await ctx.db.execute(answer_query)).all():
            answer_rows[answer.response_id].append(
                {
                    "question_code": answer.question_code,
                    "question_type": answer.question_type,
                    "title": title or {},
                    "value": answer.text_value if answer.text_value is not None else answer.value,
                }
            )

    return {
        "items": [
            {
                "id": row.id,
                "survey_id": row.survey_id,
                "submitted_at": row.submitted_at or row.created_at,
                "rating": row.rating,
                "csat": row.csat,
                "nps": row.nps,
                "channel": row.channel,
                "answers": answer_rows[row.id],
            }
            for row in responses
        ],
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
    }


@router.get("/responses/records/{response_id}")
async def response_record_detail(response_id: uuid.UUID, ctx: Ctx) -> dict[str, Any]:
    """Return a submitted survey response with every question and answer."""
    from app.core.errors import NotFoundError
    from app.services.workspaces import WorkspaceService

    response = (
        await ctx.db.execute(
            select(Response, Survey.title)
            .join(Survey, Survey.id == Response.survey_id)
            .where(
                Response.id == response_id,
                Response.tenant_id == ctx.principal.tenant_id,
                Survey.tenant_id == ctx.principal.tenant_id,
                Survey.deleted_at.is_(None),
            )
        )
    ).one_or_none()
    if response is None:
        raise NotFoundError("Không tìm thấy phản hồi.")
    row, survey_title = response
    await WorkspaceService(ctx.db, ctx.principal).get(row.workspace_id)

    answers = (
        await ctx.db.execute(
            select(
                Answer,
                Question.title,
                Question.options,
                TextAnalysis.sentiment,
                TextAnalysis.sentiment_score,
                TextAnalysis.is_urgent,
            )
            .outerjoin(
                Question,
                and_(Question.id == Answer.question_id, Question.tenant_id == ctx.principal.tenant_id),
            )
            .outerjoin(
                TextAnalysis,
                and_(
                    TextAnalysis.answer_id == Answer.id,
                    TextAnalysis.tenant_id == ctx.principal.tenant_id,
                ),
            )
            .where(
                Answer.response_id == row.id,
                Answer.tenant_id == ctx.principal.tenant_id,
            )
            .order_by(Answer.created_at, Answer.id)
        )
    ).all()
    return {
        "id": row.id,
        "survey_id": row.survey_id,
        "survey_title": survey_title,
        "submitted_at": row.submitted_at or row.created_at,
        "status": row.status,
        "channel": row.channel,
        "language": row.language,
        "rating": row.rating,
        "csat": row.csat,
        "nps": row.nps,
        "score": row.score,
        "duration_seconds": row.duration_seconds,
        "respondent": row.respondent,
        "source_params": row.source_params,
        "answers": [
            {
                "question_code": answer.question_code,
                "question_type": answer.question_type,
                "title": title or {},
                "options": options or [],
                "value": answer.text_value if answer.text_value is not None else answer.value,
                "sentiment": sentiment,
                "sentiment_score": sentiment_score,
                "is_urgent": is_urgent,
            }
            for answer, title, options, sentiment, sentiment_score, is_urgent in answers
        ],
    }


@router.get("/responses/{analysis_id}")
async def detail(analysis_id: uuid.UUID, ctx: Ctx) -> dict[str, Any]:
    return describe(await FeedbackService(ctx.db, ctx.principal).get(analysis_id))


@router.post("/analyses/{analysis_id}/corrections")
async def correct(analysis_id: uuid.UUID, data: CorrectionInput, ctx: Ctx) -> dict[str, Any]:
    return describe(await FeedbackService(ctx.db, ctx.principal).correct(analysis_id, data))


@router.post("/responses/bulk-corrections")
async def bulk(data: BulkCorrection, ctx: Ctx) -> dict[str, int]:
    service = FeedbackService(ctx.db, ctx.principal)
    for analysis_id in sorted(set(data.ids)):
        await service.correct(analysis_id, data.correction)
    return {"updated": len(set(data.ids))}


@router.get("/analyses/{analysis_id}/corrections")
async def history(analysis_id: uuid.UUID, ctx: Ctx) -> list[dict[str, Any]]:
    return await FeedbackService(ctx.db, ctx.principal).history(analysis_id)


@router.post("/corrections/{correction_id}/undo")
async def undo(correction_id: uuid.UUID, ctx: Ctx) -> dict[str, Any]:
    return describe(await FeedbackService(ctx.db, ctx.principal).undo(correction_id))


@router.post("/corrections/{correction_id}/review")
async def review(correction_id: uuid.UUID, ctx: Ctx, approved: bool) -> dict[str, bool]:
    await FeedbackService(ctx.db, ctx.principal).review(correction_id, approved)
    return {"ok": True}


@router.get("/model-quality")
async def quality(workspace_id: uuid.UUID, ctx: Ctx) -> dict[str, Any]:
    return await FeedbackService(ctx.db, ctx.principal).quality(workspace_id)


@router.get("/model-quality/dataset")
async def dataset(workspace_id: uuid.UUID, ctx: Ctx, format: str = "csv") -> StreamingResponse:
    from app.core.errors import AppError
    from app.services.workspaces import WorkspaceService

    ctx.principal.require(Permission.DATA_EXPORT)
    await WorkspaceService(ctx.db, ctx.principal).get(workspace_id)
    if format not in {"csv", "jsonl"}:
        raise AppError("Định dạng không hợp lệ.")
    blocked = exists(
        select(LabelCorrection.id).where(
            LabelCorrection.analysis_id == TextAnalysis.id,
            LabelCorrection.tenant_id == ctx.principal.tenant_id,
            LabelCorrection.reverted_at.is_(None),
            LabelCorrection.review_status != ReviewStatus.APPROVED,
        )
    )
    query = (
        select(TextAnalysis)
        .where(
            TextAnalysis.tenant_id == ctx.principal.tenant_id,
            TextAnalysis.workspace_id == workspace_id,
            TextAnalysis.is_verified.is_(True),
            TextAnalysis.sentiment.is_not(None),
            ~blocked,
        )
        .order_by(TextAnalysis.id)
    )

    # Giữ transaction RLS tới khi stream hoàn tất; không đổ toàn bộ dataset vào RAM.
    async def stream() -> AsyncIterator[bytes]:
        if format == "csv":
            yield csv_bytes(["text", "label", "topics", "urgent", "model_version"], [])
        result = await ctx.db.stream_scalars(query.execution_options(yield_per=200))
        async for row in result:
            if format == "jsonl":
                yield (
                    json.dumps(
                        {
                            "text": row.text,
                            "label": row.sentiment,
                            "topics": [str(t) for t in row.topic_ids],
                            "urgent": row.is_urgent,
                            "model_version": row.model_version,
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                ).encode()
            else:
                yield csv_bytes(
                    [],
                    [
                        [
                            row.text,
                            row.sentiment,
                            "|".join(str(t) for t in row.topic_ids),
                            row.is_urgent,
                            row.model_version,
                        ]
                    ],
                ).split(b"\r\n", 1)[1]

    return StreamingResponse(
        stream(),
        media_type="text/csv" if format == "csv" else "application/x-ndjson",
        headers={"Content-Disposition": f'attachment; filename="verified-labels.{format}"'},
    )
