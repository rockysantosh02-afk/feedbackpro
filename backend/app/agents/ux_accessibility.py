"""Agent 5: UX & Accessibility Agent.

Evaluates mobile viewport presence, heading hierarchy, image alt text, form labels,
and ARIA attributes from parsed DOM evidence.
"""

from bs4 import BeautifulSoup

from app.agents.base_agent import BaseAgent
from app.ai.schemas import FindingItem, UXAccessibilityOutput


class UXAccessibilityAgent(BaseAgent):
    async def evaluate_ux_and_a11y(self, html_content: str, target_url: str) -> UXAccessibilityOutput:
        findings: list[FindingItem] = []
        ux_score = 90
        a11y_score = 90

        if not html_content:
            return UXAccessibilityOutput(
                findings=[],
                ux_score=ux_score,
                a11y_score=a11y_score,
                summary="No HTML body content available to inspect.",
            )

        soup = BeautifulSoup(html_content, "html.parser")

        # Check 1: Viewport meta tag
        viewport_meta = soup.find("meta", attrs={"name": "viewport"})
        if not viewport_meta:
            ux_score -= 25
            findings.append(
                FindingItem(
                    title="Missing Responsive Viewport Meta Tag",
                    category="UX",
                    severity="medium",
                    confidence="high",
                    description="The page lacks `<meta name='viewport' content='width=device-width, initial-scale=1'>`, which degrades rendering on mobile devices.",
                    evidence="No viewport meta element detected in HTML head.",
                    affected_url=target_url,
                    recommended_fix="Add `<meta name='viewport' content='width=device-width, initial-scale=1'>` inside the `<head>`.",
                )
            )

        # Check 2: Missing image alt tags
        images = soup.find_all("img")
        missing_alt = [img for img in images if not img.has_attr("alt")]
        if missing_alt:
            a11y_score -= min(len(missing_alt) * 5, 25)
            findings.append(
                FindingItem(
                    title=f"{len(missing_alt)} Image(s) Missing Alt Text Attributes",
                    category="Accessibility",
                    severity="low",
                    confidence="high",
                    description=f"Detected {len(missing_alt)} images without alt attributes, hindering screen reader users.",
                    evidence=f"Example: {str(missing_alt[0])[:120]}",
                    affected_url=target_url,
                    recommended_fix="Provide descriptive alt text for informative images or alt='' for purely decorative images.",
                )
            )

        # Check 3: Heading hierarchy (H1 tag)
        h1_tags = soup.find_all("h1")
        if not h1_tags:
            a11y_score -= 10
            findings.append(
                FindingItem(
                    title="No Primary Heading (H1) Found",
                    category="Accessibility",
                    severity="low",
                    confidence="high",
                    description="A primary <h1> element is essential for screen readers and SEO semantic structure.",
                    evidence="0 <h1> tags found in document body.",
                    affected_url=target_url,
                    recommended_fix="Include a single top-level <h1> describing the application or page.",
                )
            )

        # Check 4: Form inputs without labels
        inputs = soup.find_all(["input", "textarea", "select"])
        unlabeled = []
        for inp in inputs:
            inp_type = inp.get("type", "text")
            if inp_type in ("hidden", "submit", "button", "reset"):
                continue
            inp_id = inp.get("id")
            has_label = False
            if inp_id and soup.find("label", attrs={"for": inp_id}):
                has_label = True
            elif inp.find_parent("label"):
                has_label = True
            elif inp.get("aria-label") or inp.get("aria-labelledby"):
                has_label = True
            if not has_label:
                unlabeled.append(inp)

        if unlabeled:
            a11y_score -= min(len(unlabeled) * 5, 20)
            findings.append(
                FindingItem(
                    title=f"{len(unlabeled)} Form Control(s) Missing Accessible Labels",
                    category="Accessibility",
                    severity="medium",
                    confidence="high",
                    description="Form input fields must have an associated <label> or aria-label for accessibility.",
                    evidence=f"Unlabeled input tag: {str(unlabeled[0])[:120]}",
                    affected_url=target_url,
                    recommended_fix="Associate every input with a descriptive `<label for='id'>` or add `aria-label`.",
                )
            )

        final_ux = max(ux_score, 10)
        final_a11y = max(a11y_score, 10)

        summary = f"UX score: {final_ux}/100, Accessibility score: {final_a11y}/100. Evaluated {len(findings)} UX/a11y items."
        return UXAccessibilityOutput(
            findings=findings,
            ux_score=final_ux,
            a11y_score=final_a11y,
            summary=summary,
        )
