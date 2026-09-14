"""Agent 10: Prioritized Recommendation Engine.

Generates actionable remediation cards with explicit priority ratings:
P0 = urgent/blocking, P1 = high, P2 = medium, P3 = low.
Includes What's Wrong, Why It Matters, How To Fix, and Correlated Evidence.
"""

from app.agents.base_agent import BaseAgent
from app.ai.schemas import RecommendationItem, RecommendationOutput


class RecommendationAgent(BaseAgent):
    async def generate_recommendations(
        self,
        project_name: str,
        findings: list[dict],
        correlations: list[dict],
    ) -> list[RecommendationItem]:
        recommendations: list[RecommendationItem] = []

        # If we have correlations, prioritize them as P0 or P1
        for corr in correlations:
            f_title = corr.get("finding_title", "")
            theme_title = corr.get("theme_title", "")
            recommendations.append(
                RecommendationItem(
                    priority="P0",
                    title=f"Resolve Correlated Usability Blocker: {theme_title}",
                    problem_statement=f"Both automated audits and live feedback confirm issues with {f_title}.",
                    why_it_matters="Issues actively experienced by participants will directly reduce hackathon judging scores.",
                    remediation_steps=[
                        "Inspect affected mobile viewports and button sizing",
                        "Verify interactive event listeners and element padding",
                        "Retest on physical mobile device before submission",
                    ],
                    rationale=corr.get("evidence", "Correlated finding and feedback"),
                    correlated_feedback_count=corr.get("count", 10),
                    ease_of_fixing="Medium",
                )
            )

        # Baseline security header recommendation
        sec_findings = [f for f in findings if f.get("category") == "Security posture"]
        if sec_findings:
            recommendations.append(
                RecommendationItem(
                    priority="P1",
                    title="Harden Web Security Headers (CSP, HSTS, X-Frame-Options)",
                    problem_statement="Server response headers lack key defensive protections against clickjacking and script injection.",
                    why_it_matters="Defense-in-depth headers demonstrate security diligence to technical judges.",
                    remediation_steps=[
                        "Configure Content-Security-Policy with appropriate script origins",
                        "Enable Strict-Transport-Security on HTTPS domains",
                        "Set X-Content-Type-Options: nosniff",
                    ],
                    rationale="Passive security posture scan identified missing defensive headers.",
                    correlated_feedback_count=0,
                    ease_of_fixing="Easy",
                )
            )

        # Baseline a11y recommendation
        a11y_findings = [f for f in findings if f.get("category") == "Accessibility"]
        if a11y_findings:
            recommendations.append(
                RecommendationItem(
                    priority="P2",
                    title="Enhance Image and Form Accessibility",
                    problem_statement="Unlabeled inputs or missing image alt attributes reduce accessibility.",
                    why_it_matters="Screen reader usability is a frequent hackathon evaluation criteria.",
                    remediation_steps=[
                        "Add alt text to all informative <img> tags",
                        "Associate <label> elements with corresponding form inputs",
                    ],
                    rationale="Identified during automated DOM accessibility scan.",
                    correlated_feedback_count=0,
                    ease_of_fixing="Easy",
                )
            )

        if not recommendations:
            sys_p, user_p = self.build_prompt_with_boundaries(
                system_instructions="Generate prioritized P0, P1, P2, P3 recommendations based on findings.",
                project_data={"project_name": project_name},
                audit_evidence={"findings": findings, "correlations": correlations},
            )
            result = await self.provider.generate_structured(sys_p, user_p, RecommendationOutput)
            recommendations.extend(result.recommendations)

        return recommendations
