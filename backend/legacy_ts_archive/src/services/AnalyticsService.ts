import { FeedbackAnalysisAgent } from '../agents/FeedbackAnalysisAgent.js';
import { CorrelatedItem, IssueCorrelationAgent } from '../agents/IssueCorrelationAgent.js';
import { PrioritizedRecommendation, RecommendationAgent } from '../agents/RecommendationAgent.js';
import { DbAiAnalysis, DbRecommendation } from '../models/db.js';
import { AnalyticsRepository } from '../repositories/AnalyticsRepository.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';

export class AnalyticsService {
  /**
   * Executes the AI Feedback Analysis, Issue Correlation, and Recommendation prioritization pipeline.
   */
  public static async runFullAnalysis(projectId: string, userId: string): Promise<{
    analysis: DbAiAnalysis;
    correlations: CorrelatedItem[];
    recommendations: DbRecommendation[];
  }> {
    const project = await ProjectRepository.findByIdAndOwner(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    // Get feedback forms and all responses
    const forms = await FeedbackRepository.getFormsByProject(projectId);
    if (forms.length === 0) {
      throw new Error('No feedback form exists for this project yet.');
    }

    const primaryForm = forms[0];
    const questions = await FeedbackRepository.getQuestionsWithDetails(primaryForm.id);
    const responses = await FeedbackRepository.getResponses(primaryForm.id);

    // Agent 8: Analyze feedback responses
    const analysisResult = await FeedbackAnalysisAgent.analyze(questions, responses);

    // Save themes to repository
    const themes = await FeedbackRepository.saveThemes(
      projectId,
      primaryForm.id,
      analysisResult.themes.map((t) => ({
        projectId,
        feedbackFormId: primaryForm.id,
        themeTitle: t.title,
        sentiment: t.sentiment,
        occurrenceCount: t.occurrenceCount,
        severity: t.severity,
        aiSummary: t.summary
      }))
    );

    // Get technical audit findings
    const latestRun = await AuditRepository.getLatestRunByProject(projectId);
    const technicalFindings = latestRun ? await AuditRepository.getFindingsByRun(latestRun.id) : [];

    // Agent 9: Correlate technical findings with user feedback themes
    const correlations = await IssueCorrelationAgent.correlate(technicalFindings, themes);

    // Agent 10: Produce prioritized fixes (P0, P1, P2, P3)
    const prioritizedFixes: PrioritizedRecommendation[] = await RecommendationAgent.prioritize(
      project,
      technicalFindings,
      correlations
    );

    // Persist recommendations
    const savedRecs = await AnalyticsRepository.saveRecommendations(
      projectId,
      prioritizedFixes.map((p) => ({
        projectId,
        auditFindingId: p.correlatedFindingId,
        priority: p.priority,
        title: p.title,
        problemStatement: p.problemStatement,
        whyItMatters: p.whyItMatters,
        remediationSteps: p.remediationSteps,
        rationale: p.rationale,
        correlatedFeedbackCount: p.correlatedFeedbackCount,
        easeOfFixing: p.easeOfFixing
      }))
    );

    // Save final AI Analysis record
    const savedAnalysis = await AnalyticsRepository.saveAnalysis({
      projectId,
      auditRunId: latestRun?.id,
      executiveSummary: analysisResult.executiveSummary,
      sentimentDistribution: analysisResult.sentimentDistribution,
      positiveThemes: analysisResult.positiveThemes,
      negativeThemes: analysisResult.negativeThemes,
      featureRequests: analysisResult.featureRequests,
      commonComplaints: analysisResult.commonComplaints,
      mostPraised: analysisResult.mostPraised,
      userSatisfactionScore: analysisResult.userSatisfactionScore,
      sampleSize: responses.length,
      isSampleSizeLimited: responses.length < 5
    });

    return {
      analysis: savedAnalysis,
      correlations,
      recommendations: savedRecs
    };
  }

  public static async getLatestInsights(projectId: string, userId: string) {
    const project = await ProjectRepository.findByIdAndOwner(projectId, userId);
    if (!project) throw new Error('Project not found or access denied');

    const analysis = await AnalyticsRepository.getLatestAnalysis(projectId);
    const recommendations = await AnalyticsRepository.getRecommendations(projectId);
    const themes = await FeedbackRepository.getThemesByProject(projectId);
    const totalResponses = await FeedbackRepository.getResponseCountByProject(projectId);

    return {
      analysis,
      recommendations,
      themes,
      totalResponses
    };
  }
}
