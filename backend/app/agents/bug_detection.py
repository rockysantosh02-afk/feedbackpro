"""Agent 3: Bug Detection Agent.

Classifies bugs across Functional, UI, Navigation, Forms, Performance, Compatibility, Content.
Every finding requires empirical evidence.
"""

from app.agents.base_agent import BaseAgent
from app.ai.schemas import BugDetectionOutput, FindingItem


class BugDetectionAgent(BaseAgent):
    async def detect_bugs(self, audit_evidence: dict, html_sample: str | None = None) -> list[FindingItem]:
        # Extract direct scanner observations
        findings: list[FindingItem] = []

        console_errors = audit_evidence.get("console_errors", [])
        for err in console_errors[:3]:
            findings.append(
                FindingItem(
                    title="Client-Side JavaScript Console Error",
                    category="Functional",
                    severity="medium",
                    confidence="high",
                    description=f"Uncaught browser exception observed in console: {err}",
                    evidence=f"Console Error: {err}",
                    affected_url=audit_evidence.get("target_url", "https://example.com"),
                    recommended_fix="Debug client-side JavaScript execution and guard against undefined variables.",
                )
            )

        failed_requests = audit_evidence.get("failed_network_requests", [])
        for req in failed_requests[:3]:
            findings.append(
                FindingItem(
                    title="Failed Sub-resource Network Request",
                    category="Functional",
                    severity="medium",
                    confidence="high",
                    description=f"Browser failed to fetch resource: {req}",
                    evidence=f"Failed request: {req}",
                    affected_url=audit_evidence.get("target_url", "https://example.com"),
                    recommended_fix="Verify asset URLs, CORS headers on CDN endpoints, and bundle paths.",
                )
            )

        # If deterministic evidence was empty, use AI evaluation
        if not findings:
            sys_p, user_p = self.build_prompt_with_boundaries(
                system_instructions="Classify observable bugs in Functional, UI, Navigation, Forms, Performance, Compatibility.",
                audit_evidence=audit_evidence,
                untrusted_website_content=html_sample,
            )
            result = await self.provider.generate_structured(sys_p, user_p, BugDetectionOutput)
            findings.extend(result.findings)

        return findings
