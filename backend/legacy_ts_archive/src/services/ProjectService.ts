import { DbProject, DbProjectLink } from '../models/db.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';

export interface CreateProjectDTO {
  name: string;
  shortDescription: string;
  detailedDescription?: string;
  problemStatement?: string;
  solution?: string;
  targetUsers?: string;
  category?: string;
  eventName: string;
  eventOrganizer?: string;
  eventType?: string;
  eventDate?: string;
  eventDescription?: string;
  techFrontend?: string;
  techBackend?: string;
  techDatabase?: string;
  techAi?: string;
  techApis?: string;
  techHosting?: string;
  techOther?: string;
  feedbackGoal?: string;
  isAuthorized: boolean;
  links?: Array<{ linkType: string; url: string; label?: string }>;
}

export class ProjectService {
  public static async createProject(userId: string, data: CreateProjectDTO): Promise<{ project: DbProject; links: DbProjectLink[] }> {
    if (!data.isAuthorized) {
      throw new Error('Project authorization confirmation is required before proceeding.');
    }

    if (!data.name || !data.shortDescription || !data.eventName) {
      throw new Error('Project name, short description, and event name are required.');
    }

    const project = await ProjectRepository.create({
      userId,
      name: data.name.trim(),
      shortDescription: data.shortDescription.trim(),
      detailedDescription: data.detailedDescription?.trim(),
      problemStatement: data.problemStatement?.trim(),
      solution: data.solution?.trim(),
      targetUsers: data.targetUsers?.trim(),
      category: data.category || 'General',
      eventName: data.eventName.trim(),
      eventOrganizer: data.eventOrganizer?.trim(),
      eventType: data.eventType || 'Hackathon',
      eventDate: data.eventDate,
      eventDescription: data.eventDescription,
      techFrontend: data.techFrontend,
      techBackend: data.techBackend,
      techDatabase: data.techDatabase,
      techAi: data.techAi,
      techApis: data.techApis,
      techHosting: data.techHosting,
      techOther: data.techOther,
      feedbackGoal: data.feedbackGoal || 'General Feedback',
      authorizedAt: new Date()
    });

    const createdLinks: DbProjectLink[] = [];
    if (data.links && Array.isArray(data.links)) {
      for (const link of data.links) {
        if (link.url && link.linkType) {
          const l = await ProjectRepository.addLink(project.id, link.linkType, link.url, link.label);
          createdLinks.push(l);
        }
      }
    }

    return { project, links: createdLinks };
  }

  public static async getProject(projectId: string, userId: string): Promise<{ project: DbProject; links: DbProjectLink[] }> {
    const project = await ProjectRepository.findByIdAndOwner(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied (IDOR protection)');
    }
    const links = await ProjectRepository.getLinks(projectId);
    return { project, links };
  }

  public static async listProjects(userId: string): Promise<DbProject[]> {
    return await ProjectRepository.listByUser(userId);
  }

  public static async updateProject(projectId: string, userId: string, updates: Partial<CreateProjectDTO>): Promise<DbProject> {
    const updated = await ProjectRepository.update(projectId, userId, updates as any);
    if (!updated) {
      throw new Error('Project not found or access denied');
    }
    return updated;
  }

  public static async deleteProject(projectId: string, userId: string): Promise<void> {
    const success = await ProjectRepository.softDelete(projectId, userId);
    if (!success) {
      throw new Error('Project not found or access denied');
    }
  }
}
