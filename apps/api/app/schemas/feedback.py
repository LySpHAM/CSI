from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator

from app.models.enums import Sentiment
from app.schemas.common import ApiModel


class FeedbackFilter(ApiModel):
    workspace_id: uuid.UUID
    survey_id: uuid.UUID | None = None
    sentiment: Sentiment | None = None
    topic_id: uuid.UUID | None = None
    urgent: bool | None = None
    channel: str | None = Field(default=None, max_length=32)
    search: str = Field(default="", max_length=300)
    start: datetime | None = None
    end: datetime | None = None
    sort: Literal["newest", "oldest", "confidence", "urgent"] = "urgent"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class ResponseRecordFilter(ApiModel):
    """Bộ lọc câu trả lời khảo sát, bao gồm cả phản hồi không có nhận xét văn bản."""

    workspace_id: uuid.UUID
    survey_id: uuid.UUID | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    answer_question_code: str | None = Field(default=None, max_length=64)
    answer_value: str | None = Field(default=None, max_length=200)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @model_validator(mode="after")
    def question_and_value_together(self) -> ResponseRecordFilter:
        if (self.answer_question_code is None) != (self.answer_value is None):
            raise ValueError("Cần chọn cả câu hỏi và đáp án để lọc.")
        return self


class CorrectionInput(ApiModel):
    sentiment: Sentiment | None = None
    topic_ids: list[uuid.UUID] | None = Field(default=None, max_length=100)
    is_urgent: bool | None = None
    note: str | None = Field(default=None, max_length=5000)
    reason: str = Field(default="", max_length=500)
    expected_updated_at: datetime | None = None


class BulkCorrection(ApiModel):
    ids: list[uuid.UUID] = Field(min_length=1, max_length=100)
    correction: CorrectionInput
