"""Gemini Provider implementation with structured JSON output and fallback."""

import json
from typing import TypeVar

import httpx
from pydantic import BaseModel

from app.ai.deterministic_provider import DeterministicLocalAIProvider
from app.ai.provider import AIProvider
from app.config import get_settings

T = TypeVar("T", bound=BaseModel)
settings = get_settings()


class GeminiProvider(AIProvider):
    @property
    def name(self) -> str:
        return "gemini"

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: type[T],
        temperature: float = 0.2,
    ) -> T:
        if not settings.GEMINI_API_KEY:
            fallback = DeterministicLocalAIProvider()
            return await fallback.generate_structured(system_prompt, user_prompt, response_model, temperature)

        schema = response_model.model_json_schema()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"

        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}
            ],
            "generationConfig": {
                "temperature": temperature,
                "responseMimeType": "application/json",
                "responseSchema": schema,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code != 200:
                    fallback = DeterministicLocalAIProvider()
                    return await fallback.generate_structured(system_prompt, user_prompt, response_model, temperature)

                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed_json = json.loads(text)
                return response_model.model_validate(parsed_json)
        except Exception:
            fallback = DeterministicLocalAIProvider()
            return await fallback.generate_structured(system_prompt, user_prompt, response_model, temperature)
