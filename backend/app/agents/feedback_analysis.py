"""Agent 8: Feedback Analysis Agent.

Summarizes themes, sentiment, common complaints, and top strengths from participant feedback.
Deterministic metrics (mean ratings, NPS) are computed deterministically.
"""

from app.agents.base_agent import BaseAgent
from app.ai.schemas import FeedbackAnalysisOutput


class FeedbackAnalysisAgent(BaseAgent):
    async def analyze_responses(
        self,
        project_name: str,
        total_responses: int,
        feedback_summary: list[dict],
    ) -> FeedbackAnalysisOutput:
        system_instructions = (
            "Analyze the participant feedback submissions.\n"
            "Summarize executive highlights, recurring positive themes, recurring complaints, "
            "feature requests, most praised elements, and sentiment distribution."
        )

        sys_p, user_p = self.build_prompt_with_boundaries(
            system_instructions=system_instructions,
            project_data={"project_name": project_name, "total_responses": total_responses},
            feedback_data=feedback_summary,
        )

        return await self.provider.generate_structured(
            system_prompt=sys_p,
            user_prompt=user_p,
            response_model=FeedbackAnalysisOutput,
        )
