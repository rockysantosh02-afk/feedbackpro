"""AI Provider Interface and Factory."""

from abc import ABC, abstractmethod
from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class AIProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: type[T],
        temperature: float = 0.2,
    ) -> T:
        """Generates a structured Pydantic object using an LLM or deterministic fallback."""
        pass


def get_ai_provider() -> AIProvider:
    from app.config import get_settings
    from app.ai.deterministic_provider import DeterministicLocalAIProvider
    from app.ai.openai_provider import OpenAIProvider
    from app.ai.gemini_provider import GeminiProvider

    settings = get_settings()
    if settings.AI_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        return OpenAIProvider()
    elif settings.AI_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        return GeminiProvider()
    return DeterministicLocalAIProvider()
