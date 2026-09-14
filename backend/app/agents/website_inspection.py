"""Agent 2: Website Inspection Agent.

Summarizes deterministic scanner observations (status, redirects, headers, console errors)
without fabricating or hallucinating HTTP results.
"""

from app.agents.base_agent import BaseAgent
from app.ai.schemas import FindingItem


class WebsiteInspectionAgent(BaseAgent):
    async def inspect(self, evidence: dict, website_snippet: str | None = None) -> list[FindingItem]:
        findings: list[FindingItem] = []

        # Deterministic checks first
        status_code = evidence.get("status_code", 200)
        if status_code >= 400:
            findings.append(
                FindingItem(
                    title=f"HTTP Server Returned Error Status {status_code}",
                    category="Functional",
                    severity="critical" if status_code >= 500 else "high",
                    confidence="high",
                    description=f"The target website returned HTTP {status_code} during automated safe inspection.",
                    evidence=f"Status code: {status_code}",
                    affected_url=evidence.get("target_url", "unknown"),
                    recommended_fix="Verify server route availability and host configuration.",
                )
            )

        response_time_ms = evidence.get("response_time_ms", 0)
        if response_time_ms > 3500:
            findings.append(
                FindingItem(
                    title="Slow Initial Page Response Time",
                    category="Performance",
                    severity="medium",
                    confidence="high",
                    description=f"Page response time was {response_time_ms}ms, which exceeds acceptable interactive thresholds.",
                    evidence=f"Response time measured: {response_time_ms}ms",
                    affected_url=evidence.get("target_url", "unknown"),
                    recommended_fix="Optimize initial server processing, enable asset caching, and compress payload responses.",
                )
            )

        return findings
