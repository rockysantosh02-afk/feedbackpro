"""Agent 7: Feedback Form Generator Agent.

Generates 8-15 targeted feedback questions across all 9 supported question types:
rating, multiple_choice, checkbox, yes_no, likert, nps, short_text, long_text, emoji_rating.
"""

from app.agents.base_agent import BaseAgent
from app.ai.schemas import FeedbackFormGeneratorOutput


class FeedbackFormGeneratorAgent(BaseAgent):
    async def generate_form(
        self,
        project_info: dict,
        strategy_summary: str | None = None,
        focus_area: str | None = None,
    ) -> FeedbackFormGeneratorOutput:
        system_instructions = (
            "You are an expert user research questionnaire designer.\n"
            "Generate an engaging 8-12 question feedback questionnaire tailored to the project.\n"
            "Supported question_type values are strictly: "
            "rating, multiple_choice, checkbox, yes_no, likert, nps, short_text, long_text, emoji_rating.\n"
            "Provide appropriate options for multiple_choice and checkbox questions."
        )

        user_context = dict(project_info)
        if focus_area:
            user_context["custom_focus_area"] = focus_area
        if strategy_summary:
            user_context["strategy"] = strategy_summary

        sys_p, user_p = self.build_prompt_with_boundaries(
            system_instructions=system_instructions,
            project_data=user_context,
        )

        return await self.provider.generate_structured(
            system_prompt=sys_p,
            user_prompt=user_p,
            response_model=FeedbackFormGeneratorOutput,
        )
