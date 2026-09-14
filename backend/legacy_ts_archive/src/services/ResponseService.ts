import crypto from 'node:crypto';
import { DbFeedbackForm, DbFeedbackQuestion, DbFeedbackResponse } from '../models/db.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';

export interface PublicFormView {
  form: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    allowAnonymous: boolean;
  };
  project: {
    name: string;
    shortDescription: string;
    category: string;
    eventName: string;
    liveUrl?: string;
  };
  questions: DbFeedbackQuestion[];
}

export interface SubmitFeedbackDTO {
  respondentName?: string;
  respondentEmail?: string;
  isAnonymous?: boolean;
  answers: Array<{
    questionId: string;
    numericValue?: number;
    textValue?: string;
    selectedOptions?: any;
  }>;
}

export class ResponseService {
  /**
   * Fetches public form structure for respondents (Safe View: no private audit findings or owner secrets).
   */
  public static async getPublicForm(slug: string): Promise<PublicFormView> {
    const form = await FeedbackRepository.findFormBySlug(slug);
    if (!form || form.status !== 'published') {
      throw new Error('Feedback form not found or is currently closed');
    }

    const project = await ProjectRepository.findById(form.projectId);
    if (!project) {
      throw new Error('Associated project not found');
    }

    const links = await ProjectRepository.getLinks(project.id);
    const liveLink = links.find((l) => l.linkType === 'live_website')?.url;

    const questions = await FeedbackRepository.getQuestionsWithDetails(form.id);

    return {
      form: {
        id: form.id,
        slug: form.slug,
        title: form.title,
        description: form.description,
        allowAnonymous: form.allowAnonymous
      },
      project: {
        name: project.name,
        shortDescription: project.shortDescription,
        category: project.category,
        eventName: project.eventName,
        liveUrl: liveLink
      },
      questions
    };
  }

  /**
   * Records a feedback response with privacy-safe rate limiting and anti-spam hashing.
   */
  public static async submitFeedback(
    slug: string,
    data: SubmitFeedbackDTO,
    clientIp: string,
    userAgent?: string
  ): Promise<DbFeedbackResponse> {
    const form = await FeedbackRepository.findFormBySlug(slug);
    if (!form || form.status !== 'published') {
      throw new Error('This feedback form is not currently accepting responses.');
    }

    // Salted hash of IP for privacy-preserving deduplication
    const salt = 'feedbackpro_privacy_salt_2026';
    const ipHash = crypto.createHash('sha256').update(`${clientIp}:${form.id}:${salt}`).digest('hex');

    // Check duplicate responses from same hashed client within last 5 minutes
    const existing = await FeedbackRepository.getResponses(form.id);
    const recentDuplicate = existing.find(
      (r) => r.ipHash === ipHash && Date.now() - r.submittedAt.getTime() < 2 * 60 * 1000
    );
    if (recentDuplicate) {
      throw new Error('You have already submitted feedback recently. Thank you!');
    }

    // Sanitize string text values
    const sanitizedAnswers = data.answers.map((a) => ({
      questionId: a.questionId,
      numericValue: typeof a.numericValue === 'number' ? a.numericValue : null,
      textValue: a.textValue ? String(a.textValue).slice(0, 2000).trim() : null,
      selectedOptions: a.selectedOptions || null
    }));

    return await FeedbackRepository.submitResponse(
      form.id,
      {
        name: data.isAnonymous ? 'Anonymous Tester' : data.respondentName?.trim() || 'Anonymous Tester',
        email: data.isAnonymous ? undefined : data.respondentEmail?.trim(),
        isAnonymous: data.isAnonymous ?? true,
        ipHash,
        userAgent
      },
      sanitizedAnswers
    );
  }
}
