import { request } from './api';

export interface FeedbackOption {
  id?: string;
  label: string;
  value: string;
  sort_order: number;
}

export interface FeedbackQuestion {
  id: string;
  prompt: string;
  description?: string;
  question_type:
    | 'rating'
    | 'rating_1_5'
    | 'rating_1_10'
    | 'multiple_choice'
    | 'single_choice'
    | 'checkbox'
    | 'multi_choice'
    | 'yes_no'
    | 'boolean'
    | 'likert'
    | 'nps'
    | 'short_text'
    | 'long_text'
    | 'emoji_rating'
    | 'category_select'
    | string;
  is_required: boolean;
  sort_order: number;
  min_label?: string;
  max_label?: string;
  options: FeedbackOption[];
}

export interface FeedbackForm {
  id: string;
  project_id: string;
  slug: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'closed';
  allow_anonymous: boolean;
  questions: FeedbackQuestion[];
  project?: {
    name: string;
    event_name: string;
  };
}

export const feedbackService = {
  async getForm(projectId: string): Promise<FeedbackForm> {
    return request<FeedbackForm>(`/projects/${projectId}/form`);
  },

  async generateWithAI(projectId: string, focusArea?: string): Promise<FeedbackForm> {
    return request<FeedbackForm>(`/projects/${projectId}/form/generate`, {
      method: 'POST',
      body: JSON.stringify({ focus_area: focusArea }),
    });
  },

  async publish(projectId: string): Promise<FeedbackForm> {
    return request<FeedbackForm>(`/projects/${projectId}/form/publish`, {
      method: 'POST',
    });
  },

  async unpublish(projectId: string): Promise<FeedbackForm> {
    return request<FeedbackForm>(`/projects/${projectId}/form/unpublish`, {
      method: 'POST',
    });
  },

  async getQRCode(projectId: string): Promise<{ slug: string; qr_code_url: string }> {
    return request<{ slug: string; qr_code_url: string }>(`/projects/${projectId}/form/qr`);
  },

  async getPublicForm(slug: string): Promise<FeedbackForm> {
    return request<FeedbackForm>(`/public/forms/${slug}`);
  },

  async submitPublicResponse(
    slug: string,
    data: {
      respondent_name?: string;
      respondent_email?: string;
      is_anonymous: boolean;
      answers: Array<{
        question_id: string;
        numeric_value?: number;
        text_value?: string;
        selected_options?: string[];
      }>;
      honeypot?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/public/forms/${slug}/responses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async sendInvitations(
    projectId: string,
    recipients: string[],
    customMessage?: string
  ): Promise<{ success: boolean; total_sent: number; message: string }> {
    return request<{ success: boolean; total_sent: number; message: string }>(
      `/projects/${projectId}/invitations`,
      {
        method: 'POST',
        body: JSON.stringify({ recipients, custom_message: customMessage }),
      }
    );
  },
};
