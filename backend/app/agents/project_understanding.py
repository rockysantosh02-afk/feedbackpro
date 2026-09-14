"""Agent 1: Project Understanding Agent.

Analyzes event details, problem statement, proposed solution, and tech stack
to extract user personas, core features, and expected user journey.
"""

from app.agents.base_agent import BaseAgent
from app.ai.schemas import ProjectUnderstandingOutput


class ProjectUnderstandingAgent(BaseAgent):
    async def analyze(self, project_dict: dict) -> ProjectUnderstandingOutput:
        system_instructions = (
            "Analyze the project's profile, hackathon event context, and tech stack.\n"
            "Return a structured summary, target users, core features, expected journey, and key risk points."
        )
        sys_p, user_p = self.build_prompt_with_boundaries(
            system_instructions=system_instructions,
            project_data=project_dict,
        )
        return await self.provider.generate_structured(
            system_prompt=sys_p,
            user_prompt=user_p,
            response_model=ProjectUnderstandingOutput,
        )
