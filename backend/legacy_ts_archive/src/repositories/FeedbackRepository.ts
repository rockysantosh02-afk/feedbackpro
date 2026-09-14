import {
  DbFeedbackForm,
  DbFeedbackOption,
  DbFeedbackQuestion,
  DbFeedbackResponse,
  DbFeedbackTheme,
  DbResponseAnswer,
  memoryDb
} from '../models/db.js';

export class FeedbackRepository {
  // Form Management
  public static async createForm(projectId: string, title: string, description?: string): Promise<DbFeedbackForm> {
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-${memoryDb.generateId().substring(0, 6)}`;
    const form: DbFeedbackForm = {
      id: memoryDb.generateId(),
      projectId,
      slug,
      title,
      description,
      status: 'draft',
      allowAnonymous: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryDb.feedbackForms.set(form.id, form);
    return form;
  }

  public static async findFormById(id: string): Promise<DbFeedbackForm | null> {
    const form = memoryDb.feedbackForms.get(id);
    return (form && form.isActive) ? form : null;
  }

  public static async findFormBySlug(slug: string): Promise<DbFeedbackForm | null> {
    for (const form of memoryDb.feedbackForms.values()) {
      if (form.slug === slug && form.isActive) {
        return form;
      }
    }
    return null;
  }

  public static async getFormsByProject(projectId: string): Promise<DbFeedbackForm[]> {
    return Array.from(memoryDb.feedbackForms.values()).filter(
      (f) => f.projectId === projectId && f.isActive
    );
  }

  public static async updateFormStatus(id: string, status: 'draft' | 'published' | 'closed'): Promise<DbFeedbackForm | null> {
    const form = memoryDb.feedbackForms.get(id);
    if (!form) return null;
    form.status = status;
    form.updatedAt = new Date();
    memoryDb.feedbackForms.set(id, form);
    return form;
  }

  // Questions & Options
  public static async setQuestions(
    formId: string,
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
    // Remove existing questions for this form
    for (const [qId, q] of memoryDb.feedbackQuestions.entries()) {
      if (q.feedbackFormId === formId) {
        memoryDb.feedbackQuestions.delete(qId);
        // remove options
        for (const [optId, opt] of memoryDb.feedbackOptions.entries()) {
          if (opt.questionId === qId) memoryDb.feedbackOptions.delete(optId);
        }
      }
    }

    const createdQuestions: DbFeedbackQuestion[] = [];
    for (const item of questions) {
      const q: DbFeedbackQuestion = {
        id: memoryDb.generateId(),
        feedbackFormId: formId,
        prompt: item.prompt,
        description: item.description,
        questionType: item.questionType,
        isRequired: item.isRequired,
        sortOrder: item.sortOrder,
        minLabel: item.minLabel,
        maxLabel: item.maxLabel,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryDb.feedbackQuestions.set(q.id, q);

      if (item.options && item.options.length > 0) {
        const optionEntities: DbFeedbackOption[] = [];
        for (const opt of item.options) {
          const o: DbFeedbackOption = {
            id: memoryDb.generateId(),
            questionId: q.id,
            label: opt.label,
            value: opt.value,
            sortOrder: opt.sortOrder,
            createdAt: new Date()
          };
          memoryDb.feedbackOptions.set(o.id, o);
          optionEntities.push(o);
        }
        q.options = optionEntities;
      }
      createdQuestions.push(q);
    }
    return createdQuestions;
  }

  public static async getQuestionsWithDetails(formId: string): Promise<DbFeedbackQuestion[]> {
    const list = Array.from(memoryDb.feedbackQuestions.values())
      .filter((q) => q.feedbackFormId === formId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const q of list) {
      q.options = Array.from(memoryDb.feedbackOptions.values())
        .filter((opt) => opt.questionId === q.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return list;
  }

  // Responses & Answers
  public static async submitResponse(
    formId: string,
    respondent: { name?: string; email?: string; isAnonymous?: boolean; ipHash?: string; userAgent?: string },
    answers: Array<{ questionId: string; numericValue?: number; textValue?: string; selectedOptions?: any }>
  ): Promise<DbFeedbackResponse> {
    const response: DbFeedbackResponse = {
      id: memoryDb.generateId(),
      feedbackFormId: formId,
      respondentName: respondent.name,
      respondentEmail: respondent.email,
      isAnonymous: respondent.isAnonymous ?? true,
      ipHash: respondent.ipHash,
      userAgent: respondent.userAgent,
      submittedAt: new Date(),
      createdAt: new Date()
    };
    memoryDb.feedbackResponses.set(response.id, response);

    const savedAnswers: DbResponseAnswer[] = [];
    for (const a of answers) {
      const answer: DbResponseAnswer = {
        id: memoryDb.generateId(),
        feedbackResponseId: response.id,
        questionId: a.questionId,
        numericValue: a.numericValue,
        textValue: a.textValue,
        selectedOptions: a.selectedOptions,
        createdAt: new Date()
      };
      memoryDb.responseAnswers.set(answer.id, answer);
      savedAnswers.push(answer);
    }
    response.answers = savedAnswers;
    return response;
  }

  public static async getResponses(formId: string): Promise<DbFeedbackResponse[]> {
    const responses = Array.from(memoryDb.feedbackResponses.values())
      .filter((r) => r.feedbackFormId === formId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

    for (const res of responses) {
      res.answers = Array.from(memoryDb.responseAnswers.values()).filter(
        (a) => a.feedbackResponseId === res.id
      );
    }
    return responses;
  }

  public static async getResponseCountByProject(projectId: string): Promise<number> {
    const forms = await this.getFormsByProject(projectId);
    const formIds = new Set(forms.map((f) => f.id));
    return Array.from(memoryDb.feedbackResponses.values()).filter((r) => formIds.has(r.feedbackFormId)).length;
  }

  // Themes
  public static async saveThemes(projectId: string, formId: string, themes: Array<Omit<DbFeedbackTheme, 'id' | 'createdAt' | 'updatedAt'>>): Promise<DbFeedbackTheme[]> {
    // Remove existing themes for this project
    for (const [tId, t] of memoryDb.feedbackThemes.entries()) {
      if (t.projectId === projectId) memoryDb.feedbackThemes.delete(tId);
    }

    const saved: DbFeedbackTheme[] = [];
    for (const item of themes) {
      const theme: DbFeedbackTheme = {
        ...item,
        id: memoryDb.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryDb.feedbackThemes.set(theme.id, theme);
      saved.push(theme);
    }
    return saved;
  }

  public static async getThemesByProject(projectId: string): Promise<DbFeedbackTheme[]> {
    return Array.from(memoryDb.feedbackThemes.values()).filter((t) => t.projectId === projectId);
  }
}
