"""Agent 9: Issue Correlation Agent.

Correlates technical audit findings with human participant feedback.
When an automated finding is mirrored in user complaints, confidence is boosted.
Zero-Trust Rule: Correlation NEVER transforms unverified security vulnerabilities into verified exploits.
"""

from app.agents.base_agent import BaseAgent
from app.ai.schemas import CorrelatedIssueItem, IssueCorrelationOutput


class IssueCorrelationAgent(BaseAgent):
    async def correlate(
        self,
        findings: list[dict],
        feedback_themes: list[dict],
    ) -> IssueCorrelationOutput:
        # Deterministic keyword and semantic matching
        correlations: list[CorrelatedIssueItem] = []

        finding_map = {f.get("title", "").lower(): f for f in findings}

        for theme in feedback_themes:
            title = theme.get("theme_title", "").lower()
            count = theme.get("occurrence_count", 1)

            # Match against navigation / mobile
            if any(k in title for k in ("mobile", "nav", "touch", "button", "tap")):
                for f_title, f_item in finding_map.items():
                    if any(k in f_title for k in ("mobile", "touch", "nav", "viewport")):
                        correlations.append(
                            CorrelatedIssueItem(
                                finding_title=f_item.get("title", "Mobile UX Issue"),
                                theme_title=theme.get("theme_title", "Mobile touch target size"),
                                correlation_strength="strong",
                                evidence=f"{count} respondent(s) cited difficulty related to: '{theme.get('theme_title')}'",
                                confidence_boost=True,
                            )
                        )
                        break

        if not correlations:
            sys_p, user_p = self.build_prompt_with_boundaries(
                system_instructions="Correlate technical findings with participant complaints. Do not invent security exploits.",
                audit_evidence={"findings": findings},
                feedback_data=feedback_themes,
            )
            return await self.provider.generate_structured(sys_p, user_p, IssueCorrelationOutput)

        return IssueCorrelationOutput(
            correlations=correlations,
            correlation_summary=f"Successfully correlated {len(correlations)} technical findings with user complaints.",
        )
