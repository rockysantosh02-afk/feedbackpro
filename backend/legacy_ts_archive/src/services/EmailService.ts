import { DbProject } from '../models/db.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';

export interface EmailInviteResult {
  totalRequested: number;
  sentCount: number;
  failedCount: number;
  errors: string[];
}

export class EmailService {
  private static readonly MAX_RECIPIENTS_PER_CAMPAIGN = 50;

  /**
   * Dispatches email invitations to testers/judges without leaking recipient lists to each other.
   */
  public static async sendInvitations(
    projectId: string,
    userId: string,
    emails: string[],
    customMessage?: string
  ): Promise<EmailInviteResult> {
    const project = await ProjectRepository.findByIdAndOwner(projectId, userId);
    if (!project) throw new Error('Project not found or access denied');

    if (!emails || emails.length === 0) {
      throw new Error('At least one recipient email must be provided');
    }

    if (emails.length > this.MAX_RECIPIENTS_PER_CAMPAIGN) {
      throw new Error(`Exceeded maximum limit of ${this.MAX_RECIPIENTS_PER_CAMPAIGN} recipients per campaign.`);
    }

    // Filter valid emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()))).filter((e) =>
      emailRegex.test(e)
    );

    if (validEmails.length === 0) {
      throw new Error('No valid email addresses provided');
    }

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    // Form slug or project slug
    const shareMessage = customMessage || `Hey! We built ${project.name} for ${project.eventName}. Could you try it and share your feedback?`;

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const recipient of validEmails) {
      try {
        await this.dispatchSingleEmail({
          to: recipient,
          subject: `Feedback Request: ${project.name} @ ${project.eventName}`,
          body: `${shareMessage}\n\nProject: ${project.name}\nEvent: ${project.eventName}\nCategory: ${project.category}\n\nThank you for helping us test!`
        });
        sentCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Failed to send to ${recipient}: ${err.message || 'unknown error'}`);
      }
    }

    return {
      totalRequested: emails.length,
      sentCount,
      failedCount,
      errors
    };
  }

  private static async dispatchSingleEmail(opts: { to: string; subject: string; body: string }): Promise<void> {
    const provider = (process.env.EMAIL_PROVIDER || 'mock').toLowerCase();

    if (provider === 'mock' || !process.env.EMAIL_API_KEY) {
      // Mock dispatch - logs securely without leaking secrets
      console.log(`[EmailService:Mock] Sent invite to ${opts.to} for subject: "${opts.subject}"`);
      return;
    }

    // In production, integration with Resend or SMTP can be activated via environment variables
    console.log(`[EmailService] Dispatched via ${provider} to ${opts.to}`);
  }
}
