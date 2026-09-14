"""OpenAI Provider implementation with JSON Schema / Structured Outputs."""

import json
from typing import TypeVar

import httpx
from pydantic import BaseModel

from app.ai.deterministic_provider import DeterministicLocalAIProvider
from app.ai.provider import AIProvider
from app.config import get_settings

T = TypeVar("T", bound=BaseModel)
settings = get_settings()


class OpenAIProvider(AIProvider):
    @property
    def name(self) -> str:
        return "openai"

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: type[T],
        temperature: float = 0.2,
    ) -> T:
        if not settings.OPENAI_API_KEY:
            fallback = DeterministicLocalAIProvider()
            return await fallback.generate_structured(system_prompt, user_prompt, response_model, temperature)

        schema = response_model.model_json_schema()

        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": response_model.__name__,
                    "schema": schema,
                    "strict": True,
                },
            },
            "temperature": temperature,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                if res.status_code != 200:
                    fallback = DeterministicLocalAIProvider()
                    return await fallback.generate_structured(system_prompt, user_prompt, response_model, temperature)

                data = res.json()
                content = data["choices"][0]["message"]["content"]
                parsed_json = json.loads(content)
                return response_model.model_validate(parsed_json)
        except Exception:
            fallback = DeterministicLocalAIProvider()
            return await fallback.generate_structured(system_prompt, user_prompt, response_model, temperature)
