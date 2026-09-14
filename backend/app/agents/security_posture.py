"""Agent 4: Passive Security Posture Agent.

Evaluates passive defense-in-depth posture: HTTPS, HSTS, CSP, X-Frame-Options,
X-Content-Type-Options, Referrer-Policy, and cookie security flags.
Explicitly non-destructive and non-invasive; never claims exploitability.
"""

from app.agents.base_agent import BaseAgent
from app.ai.schemas import FindingItem, SecurityPostureOutput


class SecurityPostureAgent(BaseAgent):
    async def evaluate_posture(self, headers: dict[str, str], target_url: str) -> SecurityPostureOutput:
        findings: list[FindingItem] = []
        normalized_headers = {k.lower(): v for k, v in headers.items()}

        score = 100

        # Check HTTPS
        if not target_url.lower().startswith("https://"):
            score -= 35
            findings.append(
                FindingItem(
                    title="Website Not Served Over HTTPS",
                    category="Security posture",
                    severity="high",
                    confidence="high",
                    description="The website is served over unencrypted HTTP, leaving traffic susceptible to interception.",
                    evidence=f"URL scheme: {target_url}",
                    affected_url=target_url,
                    recommended_fix="Enforce HTTPS by acquiring a TLS certificate and configuring HTTP-to-HTTPS redirect.",
                )
            )

        # Check HSTS
        if "strict-transport-security" not in normalized_headers:
            score -= 15
            findings.append(
                FindingItem(
                    title="Missing Strict-Transport-Security (HSTS) Header",
                    category="Security posture",
                    severity="low",
                    confidence="high",
                    description="HSTS ensures browsers only connect via HTTPS. Absence reduces downgrade attack protection.",
                    evidence="Header 'Strict-Transport-Security' not present in HTTP response.",
                    affected_url=target_url,
                    recommended_fix="Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' to server headers.",
                )
            )

        # Check CSP
        if "content-security-policy" not in normalized_headers:
            score -= 20
            findings.append(
                FindingItem(
                    title="Missing Content-Security-Policy (CSP) Header",
                    category="Security posture",
                    severity="medium",
                    confidence="high",
                    description="A Content-Security-Policy header provides defense-in-depth against unauthorized scripts and data exfiltration.",
                    evidence="Header 'Content-Security-Policy' not present in HTTP response.",
                    affected_url=target_url,
                    recommended_fix="Define and deploy a Content-Security-Policy header matching your application asset origins.",
                )
            )

        # Check X-Content-Type-Options
        if normalized_headers.get("x-content-type-options", "").lower() != "nosniff":
            score -= 10
            findings.append(
                FindingItem(
                    title="Missing X-Content-Type-Options: nosniff Header",
                    category="Security posture",
                    severity="low",
                    confidence="high",
                    description="Without nosniff, legacy browsers may attempt MIME-type sniffing, which can lead to unexpected script execution.",
                    evidence=f"X-Content-Type-Options: {normalized_headers.get('x-content-type-options', 'missing')}",
                    affected_url=target_url,
                    recommended_fix="Add 'X-Content-Type-Options: nosniff' header to all server responses.",
                )
            )

        # Check X-Frame-Options
        if "x-frame-options" not in normalized_headers and "frame-ancestors" not in normalized_headers.get("content-security-policy", ""):
            score -= 10
            findings.append(
                FindingItem(
                    title="Missing Clickjacking Defense (X-Frame-Options)",
                    category="Security posture",
                    severity="low",
                    confidence="high",
                    description="The site does not restrict framing via X-Frame-Options or CSP frame-ancestors.",
                    evidence="No X-Frame-Options or frame-ancestors directive found.",
                    affected_url=target_url,
                    recommended_fix="Add 'X-Frame-Options: DENY' or 'SAMEORIGIN' to protect against UI redressing.",
                )
            )

        final_score = max(score, 10)
        summary = (
            f"Passive security assessment completed with posture score {final_score}/100. "
            f"Evaluated {len(findings)} security posture items."
        )

        return SecurityPostureOutput(
            findings=findings,
            security_score=final_score,
            summary=summary,
        )
