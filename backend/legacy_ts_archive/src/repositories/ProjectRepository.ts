import { DbProject, DbProjectLink, memoryDb } from '../models/db.js';

export class ProjectRepository {
  public static async create(data: Omit<DbProject, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<DbProject> {
    const project: DbProject = {
      ...data,
      id: memoryDb.generateId(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryDb.projects.set(project.id, project);
    return project;
  }

  public static async findById(id: string): Promise<DbProject | null> {
    const p = memoryDb.projects.get(id);
    return (p && p.isActive) ? p : null;
  }

  /**
   * Anti-IDOR: strictly query by both ID and User ID (Owner).
   */
  public static async findByIdAndOwner(id: string, userId: string): Promise<DbProject | null> {
    const project = memoryDb.projects.get(id);
    if (!project || !project.isActive || project.userId !== userId) {
      return null;
    }
    return project;
  }

  public static async listByUser(userId: string): Promise<DbProject[]> {
    return Array.from(memoryDb.projects.values())
      .filter((p) => p.userId === userId && p.isActive)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public static async update(
    id: string,
    userId: string,
    updates: Partial<Omit<DbProject, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<DbProject | null> {
    const project = await this.findByIdAndOwner(id, userId);
    if (!project) return null;

    const updated: DbProject = {
      ...project,
      ...updates,
      updatedAt: new Date()
    };
    memoryDb.projects.set(id, updated);
    return updated;
  }

  public static async softDelete(id: string, userId: string): Promise<boolean> {
    const project = await this.findByIdAndOwner(id, userId);
    if (!project) return false;

    project.isActive = false;
    project.updatedAt = new Date();
    memoryDb.projects.set(id, project);
    return true;
  }

  // Links
  public static async addLink(projectId: string, linkType: string, url: string, label?: string): Promise<DbProjectLink> {
    const link: DbProjectLink = {
      id: memoryDb.generateId(),
      projectId,
      linkType,
      url,
      label,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryDb.projectLinks.set(link.id, link);
    return link;
  }

  public static async getLinks(projectId: string): Promise<DbProjectLink[]> {
    return Array.from(memoryDb.projectLinks.values()).filter((l) => l.projectId === projectId);
  }
}
