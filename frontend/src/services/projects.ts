import { request } from './api';

export interface ProjectLink {
  id?: string;
  link_type: string;
  url: string;
  label?: string;
}

export interface Project {
  id: string;
  name: string;
  short_description: string;
  detailed_description?: string;
  problem_statement?: string;
  solution?: string;
  target_users?: string;
  category: string;
  event_name: string;
  event_organizer?: string;
  event_type?: string;
  event_date?: string;
  event_description?: string;
  tech_frontend?: string;
  tech_backend?: string;
  tech_database?: string;
  tech_ai?: string;
  tech_apis?: string;
  tech_hosting?: string;
  tech_other?: string;
  feedback_goal: string;
  authorized_at?: string;
  is_active: boolean;
  created_at: string;
  links: ProjectLink[];
}

export const projectService = {
  async list(): Promise<Project[]> {
    return request<Project[]>('/projects');
  },

  async get(id: string): Promise<Project> {
    return request<Project>(`/projects/${id}`);
  },

  async getProject(id: string): Promise<Project> {
    return request<Project>(`/projects/${id}`);
  },

  async create(data: Partial<Project> & { authorize_audit: boolean }): Promise<Project> {
    return request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<Project>): Promise<Project> {
    return request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  },
};
