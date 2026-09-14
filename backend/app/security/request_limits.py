"""Request entity limits and size protection rules."""

from fastapi import HTTPException, status


class RequestLimits:
    MAX_PROJECT_NAME_LENGTH = 200
    MAX_PROJECT_DESCRIPTION_LENGTH = 10000
    MAX_URL_LENGTH = 2048
    MAX_FEEDBACK_QUESTION_LENGTH = 1000
    MAX_FEEDBACK_ANSWER_LENGTH = 5000
    MAX_QUESTIONS_PER_FORM = 15
    MAX_SECTIONS_PER_FORM = 10
    MAX_OPTIONS_PER_QUESTION = 10
    MAX_RECIPIENTS_PER_INVITE = 50
    MAX_BODY_SIZE_BYTES = 1024 * 1024 * 2  # 2 MB general body limit

    @classmethod
    def check_string_length(cls, field_name: str, value: str | None, max_length: int) -> None:
        if value and len(value) > max_length:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"{field_name} exceeds maximum permitted length of {max_length} characters.",
            )

    @classmethod
    def check_collection_size(cls, collection_name: str, count: int, max_count: int) -> None:
        if count > max_count:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"{collection_name} count ({count}) exceeds maximum permitted limit of {max_count}.",
            )
