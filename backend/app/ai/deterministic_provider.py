"""Deterministic Local AI Provider.

Provides contextual, high-fidelity structured outputs for tests, offline development,
and CI environments without external API keys.
"""

from typing import TypeVar

from pydantic import BaseModel

from app.ai.provider import AIProvider
from app.ai.schemas import (
    BugDetectionOutput,
    CorrelatedIssueItem,
    FeedbackAnalysisOutput,
    FeedbackFormGeneratorOutput,
    FindingItem,
    GeneratedQuestion,
    GeneratedQuestionOption,
    IssueCorrelationOutput,
    ProjectUnderstandingOutput,
    RecommendationItem,
    RecommendationOutput,
    SecurityPostureOutput,
    UXAccessibilityOutput,
)

T = TypeVar("T", bound=BaseModel)


class DeterministicLocalAIProvider(AIProvider):
    @property
    def name(self) -> str:
        return "deterministic-local"

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: type[T],
        temperature: float = 0.2,
    ) -> T:
        """Determines intent from response_model or system prompt and returns a validated fixture."""
        if response_model == ProjectUnderstandingOutput or "ProjectUnderstanding" in system_prompt:
            output = ProjectUnderstandingOutput(
                project_summary="Web-based hackathon application audited for security, usability, and architecture.",
                target_users=["Hackathon Judges", "Peer Participants", "Mentors", "End Users"],
                core_features=[
                    "User authentication and profile management",
                    "Interactive project dashboard and analytics",
                    "Public participant review and feedback portal",
                    "Report generation and metrics tracking",
                ],
                technology=["Modern Frontend Framework", "FastAPI / Python", "PostgreSQL", "Cloud Hosting"],
                expected_user_journey=[
                    "Participant registers and configures project details",
                    "Automated passive audit runs across public endpoints",
                    "Audience provides feedback via public unguessable link",
                    "System correlates feedback with observable findings into P0-P3 action items",
                ],
                key_risk_areas=[
                    "Client-side navigation and broken external assets",
                    "Missing security response headers (HSTS, CSP)",
                    "Responsive mobile viewport glitches and touch-target sizing",
                ],
            )
            return output  # type: ignore

        elif response_model == BugDetectionOutput or "BugDetection" in system_prompt:
            output = BugDetectionOutput(
                findings=[
                    FindingItem(
                        title="Uncaught JavaScript Console Exception",
                        category="Functional",
                        severity="medium",
                        confidence="high",
                        description="An uncaught ReferenceError or network fetch failure occurred during initial page load.",
                        evidence="Console error observed: 'Failed to load resource / TypeError in bundle.js'",
                        affected_url="https://example.com/",
                        recommended_fix="Wrap asset initialization in try-catch blocks and verify dynamic bundle imports.",
                    ),
                    FindingItem(
                        title="Broken Navigation Link Detected",
                        category="Navigation",
                        severity="low",
                        confidence="high",
                        description="Navigation bar contains an anchor tag pointing to a non-existent or placeholder URL.",
                        evidence="Found anchor with href='#' or unresolved relative route '/demo-page'",
                        affected_url="https://example.com/demo-page",
                        recommended_fix="Update navigation items with valid target routes or temporary disabled states.",
                    ),
                ]
            )
            return output  # type: ignore

        elif response_model == SecurityPostureOutput or "SecurityPosture" in system_prompt:
            output = SecurityPostureOutput(
                findings=[
                    FindingItem(
                        title="Missing Content-Security-Policy (CSP) Header",
                        category="Security posture",
                        severity="medium",
                        confidence="high",
                        description="The server did not send a Content-Security-Policy response header, reducing client-side injection defense.",
                        evidence="Response headers missing 'Content-Security-Policy'",
                        affected_url="https://example.com/",
                        recommended_fix="Configure server or reverse proxy to emit a standard Content-Security-Policy header.",
                    ),
                    FindingItem(
                        title="Missing Strict-Transport-Security (HSTS) Header",
                        category="Security posture",
                        severity="low",
                        confidence="high",
                        description="HTTP Strict Transport Security is not enforced on the domain.",
                        evidence="Response headers missing 'Strict-Transport-Security'",
                        affected_url="https://example.com/",
                        recommended_fix="Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' to response headers.",
                    ),
                ],
                security_score=78,
                summary="The public website uses HTTPS but lacks critical defensive headers including CSP and HSTS.",
            )
            return output  # type: ignore

        elif response_model == UXAccessibilityOutput or "UXAccessibility" in system_prompt:
            output = UXAccessibilityOutput(
                findings=[
                    FindingItem(
                        title="Images Missing Descriptive Alt Text",
                        category="Accessibility",
                        severity="low",
                        confidence="high",
                        description="Image tags were detected without alt attributes, degrading screen reader accessibility.",
                        evidence="Detected <img> elements missing alt text.",
                        affected_url="https://example.com/",
                        recommended_fix="Add descriptive alt='...' text to all informative images or alt='' for decorative assets.",
                    ),
                    FindingItem(
                        title="Sub-optimal Mobile Touch Target Size",
                        category="UX",
                        severity="low",
                        confidence="medium",
                        description="Interactive button elements measure less than 44x44px on mobile viewports.",
                        evidence="Button dimensions measured 32x28px in mobile viewport simulation.",
                        affected_url="https://example.com/",
                        recommended_fix="Increase touch target padding to ensure minimum 44x44 CSS pixels on touchscreen devices.",
                    ),
                ],
                ux_score=84,
                a11y_score=76,
                summary="Solid layout design with minor improvements required for touch targets and screen-reader accessibility.",
            )
            return output  # type: ignore

        elif response_model == FeedbackFormGeneratorOutput or "FeedbackForm" in system_prompt:
            output = FeedbackFormGeneratorOutput(
                strategy_rationale="A balanced feedback questionnaire capturing first impressions, navigation ease, usability, and prioritized critique.",
                suggested_title="Hackathon Participant & Judge Feedback",
                suggested_description="Help the team refine the project by providing honest feedback on usability, design, and functionality.",
                questions=[
                    GeneratedQuestion(
                        prompt="What was your initial overall impression of the project demo?",
                        question_type="rating",
                        is_required=True,
                        sort_order=1,
                        min_label="Needs Work",
                        max_label="Outstanding",
                    ),
                    GeneratedQuestion(
                        prompt="How clear was the project's purpose and problem statement?",
                        question_type="likert",
                        is_required=True,
                        sort_order=2,
                        min_label="Very Unclear",
                        max_label="Very Clear",
                    ),
                    GeneratedQuestion(
                        prompt="Did you experience any broken buttons, layout issues, or errors?",
                        question_type="yes_no",
                        is_required=True,
                        sort_order=3,
                    ),
                    GeneratedQuestion(
                        prompt="Which aspect or feature did you find most impressive?",
                        question_type="short_text",
                        is_required=False,
                        sort_order=4,
                    ),
                    GeneratedQuestion(
                        prompt="What is the single most critical improvement the team should make before final judging?",
                        question_type="long_text",
                        is_required=True,
                        sort_order=5,
                    ),
                    GeneratedQuestion(
                        prompt="How likely are you to recommend or vote for this project? (NPS)",
                        question_type="nps",
                        is_required=True,
                        sort_order=6,
                        min_label="0 - Not likely",
                        max_label="10 - Extremely likely",
                    ),
                    GeneratedQuestion(
                        prompt="Rate the performance speed and UI responsiveness:",
                        question_type="emoji_rating",
                        is_required=False,
                        sort_order=7,
                    ),
                    GeneratedQuestion(
                        prompt="Select the category that best describes your role:",
                        question_type="multiple_choice",
                        is_required=True,
                        sort_order=8,
                        options=[
                            GeneratedQuestionOption(label="Judge / Evaluator", value="judge", sort_order=1),
                            GeneratedQuestionOption(label="Hackathon Participant", value="participant", sort_order=2),
                            GeneratedQuestionOption(label="Mentor / Organizer", value="mentor", sort_order=3),
                            GeneratedQuestionOption(label="General Public", value="public", sort_order=4),
                        ],
                    ),
                ],
            )
            return output  # type: ignore

        elif response_model == FeedbackAnalysisOutput or "FeedbackAnalysis" in system_prompt:
            output = FeedbackAnalysisOutput(
                executive_summary="Participants praised the clean design and innovative concept, while urging improvements to mobile layout and navigation guidance.",
                sentiment_distribution={"positive": 65, "neutral": 25, "negative": 10},
                positiveThemes=["Modern visual aesthetics", "Fast loading times", "Clear problem statement"],
                negativeThemes=["Mobile touch target size", "Missing back navigation in sub-pages"],
                feature_requests=["Export results as PDF", "Dark mode toggle", "Search bar filter"],
                common_complaints=["Navigation links on mobile menu close unexpectedly"],
                most_praised=["Innovative solution concept", "Sleek obsidian dashboard"],
                user_satisfaction_score=82,
            )
            return output  # type: ignore

        elif response_model == IssueCorrelationOutput or "Correlation" in system_prompt:
            output = IssueCorrelationOutput(
                correlations=[
                    CorrelatedIssueItem(
                        finding_title="Sub-optimal Mobile Touch Target Size",
                        theme_title="Mobile touch target size",
                        correlation_strength="strong",
                        evidence="14 feedback submissions specifically noted difficulties tapping navigation buttons on mobile viewports.",
                        confidence_boost=True,
                    )
                ],
                correlation_summary="Strong correlation detected between automated mobile UX audit finding and user complaint themes.",
            )
            return output  # type: ignore

        elif response_model == RecommendationOutput or "Recommendation" in system_prompt:
            output = RecommendationOutput(
                recommendations=[
                    RecommendationItem(
                        priority="P0",
                        title="Enforce Mobile Navigation Touch Targets",
                        problem_statement="Navigation buttons are difficult to tap accurately on mobile screens, directly validated by both automated audit and user feedback.",
                        why_it_matters="Judges and participants evaluating on phones will encounter friction during live demonstrations.",
                        remediation_steps=[
                            "Set min-height and min-width to 44px on all touch targets in header/nav",
                            "Add 8px touch target margin around icon buttons",
                            "Test interactive hamburger menu responsiveness on 375px viewport",
                        ],
                        rationale="Correlated with 14 participant complaints and verified by scanner viewport test.",
                        correlated_feedback_count=14,
                        ease_of_fixing="Easy",
                    ),
                    RecommendationItem(
                        priority="P1",
                        title="Configure Content-Security-Policy (CSP) and HSTS Headers",
                        problem_statement="Web server does not transmit baseline defense-in-depth HTTP security headers.",
                        why_it_matters="Leaving security headers unconfigured degrades the project's security posture score.",
                        remediation_steps=[
                            "Add Content-Security-Policy header restricting script and style origins",
                            "Enable Strict-Transport-Security with max-age=31536000",
                            "Ensure X-Content-Type-Options is set to nosniff",
                        ],
                        rationale="Standard web security best practice for public hackathon submissions.",
                        correlated_feedback_count=0,
                        ease_of_fixing="Easy",
                    ),
                    RecommendationItem(
                        priority="P2",
                        title="Add Informative Alt Text to Images",
                        problem_statement="Several images lack alt text attributes required for screen reader accessibility.",
                        why_it_matters="Ensures accessibility compliance and better search indexing.",
                        remediation_steps=[
                            "Inspect all <img> and SVG tags and populate alt descriptions",
                            "Use aria-hidden='true' for purely decorative background assets",
                        ],
                        rationale="Detected during automated DOM accessibility inspection.",
                        correlated_feedback_count=2,
                        ease_of_fixing="Easy",
                    ),
                ]
            )
            return output  # type: ignore

        # Generic fallback
        return response_model.model_validate({})
