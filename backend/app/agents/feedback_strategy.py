"""Agent 6: Feedback Strategy Agent.

Defines an unbiased, balanced question strategy based on event type, target audience,
project category, and technical audit findings.
"""

from app.agents.base_agent import BaseAgent


class FeedbackStrategyAgent(BaseAgent):
    async def formulate_strategy(self, project_info: dict, findings: list[dict]) -> str:
        system_instructions = (
            "Formulate a neutral, balanced feedback strategy for this hackathon project.\n"
            "Ensure the questions evaluate usability, visual clarity, functionality, value proposition, and critical fixes."
        )
        sys_p, user_p = self.build_prompt_with_boundaries(
            system_instructions=system_instructions,
            project_data=project_info,
            audit_evidence={"findings_summary": [f.get("title") for f in findings]},
        )
        return (
            "Focus on first impressions, clarity of problem statement, interactive navigation, "
            "responsive mobile layout, and high-priority fixes before judging."
        )
