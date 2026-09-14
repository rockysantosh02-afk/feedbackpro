import { FeedbackFormGeneratorAgent } from '../agents/FeedbackFormGeneratorAgent.js';
import { FeedbackStrategyAgent } from '../agents/FeedbackStrategyAgent.js';
import { ProjectUnderstandingAgent } from '../agents/ProjectUnderstandingAgent.js';
import { DbFeedbackForm, DbFeedbackQuestion } from '../models/db.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';

export class FeedbackFormService {
  /**
   * Generates a project-tailored feedback questionnaire using the AI Agent pipeline.
   */
  public static async generateForm(projectId: string, userId: string): Promise<{ form: DbFeedbackForm; questions: DbFeedbackQuestion[] }> {
    const project = await ProjectRepository.findByIdAndOwner(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    // Agent 1: Understand project
    const profile = await ProjectUnderstandingAgent.analyze(project);

    // Fetch findings for strategic context (without biasing questions)
    const latestRun = await AuditRepository.getLatestRunByProject(projectId);
    const findings = latestRun ? await AuditRepository.getFindingsByRun(latestRun.id) : [];

    // Agent 6: Plan strategy
    const strategy = await FeedbackStrategyAgent.plan(project, profile, findings as any);

    // Agent 7: Generate questions
    const generatedQuestions = await FeedbackFormGeneratorAgent.generate(project, profile, strategy);

    // Create or reuse draft form
    const existingForms = await FeedbackRepository.getFormsByProject(projectId);
    let form: DbFeedbackForm;
    if (existingForms.length > 0) {
      form = existingForms[0];
    } else {
      form = await FeedbackRepository.createForm(
        projectId,
        `${project.name} Feedback`,
        `Thank you for testing ${project.name} at ${project.eventName}! Your feedback helps our team improve.`
      );
    }

    // Save questions
    const questions = await FeedbackRepository.setQuestions(form.id, generatedQuestions);

    return { form, questions };
  }

  public static async getFormForOwner(formId: string, userId: string): Promise<{ form: DbFeedbackForm; questions: DbFeedbackQuestion[] }> {
    const form = await FeedbackRepository.findFormById(formId);
    if (!form) {
      throw new Error('Feedback form not found');
    }

    // Anti-IDOR check on owner
    const project = await ProjectRepository.findByIdAndOwner(form.projectId, userId);
    if (!project) {
      throw new Error('Access denied: You do not own this project or form');
    }

    const questions = await FeedbackRepository.getQuestionsWithDetails(form.id);
    return { form, questions };
  }

  public static async getProjectForms(projectId: string, userId: string): Promise<DbFeedbackForm[]> {
    const project = await ProjectRepository.findByIdAndOwner(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }
    return await FeedbackRepository.getFormsByProject(projectId);
  }

  public static async updateFormQuestions(
    formId: string,
    userId: string,
    questions: Array<{
      prompt: string;
      description?: string;
      questionType: string;
      isRequired: boolean;
      sortOrder: number;
      minLabel?: string;
      maxLabel?: string;
      options?: Array<{ label: string; value: string; sortOrder: number }>;
    }>
  ): Promise<DbFeedbackQuestion[]> {
    const form = await FeedbackRepository.findFormById(formId);
    if (!form) throw new Error('Form not found');

    const project = await ProjectRepository.findByIdAndOwner(form.projectId, userId);
    if (!project) throw new Error('Access denied');

    return await FeedbackRepository.setQuestions(form.id, questions);
  }

  public static async publishForm(formId: string, userId: string): Promise<DbFeedbackForm> {
    const form = await FeedbackRepository.findFormById(formId);
    if (!form) throw new Error('Form not found');

    const project = await ProjectRepository.findByIdAndOwner(form.projectId, userId);
    if (!project) throw new Error('Access denied');

    const updated = await FeedbackRepository.updateFormStatus(form.id, 'published');
    if (!updated) throw new Error('Failed to publish form');
    return updated;
  }

  public static async unpublishForm(formId: string, userId: string): Promise<DbFeedbackForm> {
    const form = await FeedbackRepository.findFormById(formId);
    if (!form) throw new Error('Form not found');

    const project = await ProjectRepository.findByIdAndOwner(form.projectId, userId);
    if (!project) throw new Error('Access denied');

    const updated = await FeedbackRepository.updateFormStatus(form.id, 'draft');
    if (!updated) throw new Error('Failed to unpublish form');
    return updated;
  }
}
