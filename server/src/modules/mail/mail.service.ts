import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.initTransporter();
  }

  private initTransporter(): void {
    const rawUser =
      this.config.get<string>('MAIL_USER') ||
      this.config.get<string>('SMTP_USER') ||
      '';
    const rawPass =
      this.config.get<string>('MAIL_PASS') ||
      this.config.get<string>('SMTP_PASS') ||
      '';

    const user = rawUser.trim();
    // Strip spaces from Gmail App Password if present (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
    const pass = rawPass.replace(/\s+/g, '');

    const host =
      this.config.get<string>('MAIL_HOST') ||
      this.config.get<string>('SMTP_HOST') ||
      'smtp.gmail.com';
    const port = Number(
      this.config.get<number>('MAIL_PORT') ||
        this.config.get<number>('SMTP_PORT') ||
        587,
    );

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Nodemailer transport ready for user: ${user}`);
    } else {
      this.logger.warn(
        `MAIL_USER or MAIL_PASS missing in server/.env — emails will be logged only.`,
      );
    }
  }

  async sendMail(opts: SendMailOptions): Promise<void> {
    const from = this.config.get<string>(
      'MAIL_FROM',
      'Orbit <noreply@orbit.app>',
    );

    if (!this.transporter) {
      // Re-check in case .env was populated at runtime
      this.initTransporter();
    }

    if (!this.transporter) {
      this.logger.warn(
        `Email to ${opts.to} skipped: MAIL_USER and MAIL_PASS must be configured in server/.env.`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({ from, ...opts });
      this.logger.log(`Email sent successfully to ${opts.to}: ${opts.subject}`);
    } catch (err) {
      this.logger.warn(
        `Failed to send email to ${opts.to}: ${(err as Error).message}`,
      );
    }
  }

  /** Task assigned notification email */
  sendTaskAssigned(opts: {
    to: string;
    recipientName: string;
    actorName: string;
    taskTitle: string;
  }): void {
    this.sendMail({
      to: opts.to,
      subject: `[Orbit] You've been assigned: ${opts.taskTitle}`,
      html: `
        <div style="font-family:'Geist',Inter,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;color:#1e293b;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 32px">
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff">🎯 New Task Assigned</h1>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 8px;color:#64748b;font-size:14px">Hi ${opts.recipientName},</p>
            <p style="margin:0 0 20px;font-size:16px;color:#0f172a"><strong>${opts.actorName}</strong> assigned you a task:</p>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:24px">
              <p style="margin:0;font-size:16px;font-weight:600;color:#92400e">${opts.taskTitle}</p>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:12px">You received this because you were assigned a task on Orbit.</p>
          </div>
        </div>
      `,
    }).catch(() => {
      /* fire and forget */
    });
  }

  /** Mention notification email */
  sendMentionNotification(opts: {
    to: string;
    recipientName: string;
    actorName: string;
    taskTitle: string;
  }): void {
    this.sendMail({
      to: opts.to,
      subject: `[Orbit] ${opts.actorName} mentioned you in "${opts.taskTitle}"`,
      html: `
        <div style="font-family:'Geist',Inter,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;color:#1e293b;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 32px">
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff">💬 You were mentioned</h1>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 8px;color:#64748b;font-size:14px">Hi ${opts.recipientName},</p>
            <p style="margin:0 0 20px;font-size:16px;color:#0f172a"><strong>${opts.actorName}</strong> mentioned you in a comment on:</p>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:24px">
              <p style="margin:0;font-size:16px;font-weight:600;color:#92400e">${opts.taskTitle}</p>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:12px">You received this because someone mentioned you on Orbit.</p>
          </div>
        </div>
      `,
    }).catch(() => {
      /* fire and forget */
    });
  }

  /** Org invite email */
  sendInvite(opts: {
    to: string;
    orgName: string;
    inviterName: string;
    inviteUrl: string;
  }): void {
    this.sendMail({
      to: opts.to,
      subject: `[Orbit] ${opts.inviterName} invited you to join ${opts.orgName}`,
      html: `
        <div style="font-family:'Geist',Inter,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;color:#1e293b;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 32px">
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff">&#x1F680; You're Invited!</h1>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 16px;font-size:16px;color:#0f172a"><strong>${opts.inviterName}</strong> invited you to join <strong>${opts.orgName}</strong> on Orbit.</p>
            <a href="${opts.inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(245,158,11,0.25)">Accept Invitation</a>
            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">This invite link expires in 7 days. If you didn't expect this, you can safely ignore it.</p>
          </div>
        </div>
      `,
    }).catch(() => { /* fire and forget */ });
  }

  /** Workspace invite email */
  sendWorkspaceInvite(opts: {
    to: string;
    inviterName: string;
    workspaceName: string;
    role: string;
    appUrl: string;
  }): void {
    this.sendMail({
      to: opts.to,
      subject: `[Orbit] ${opts.inviterName} invited you to the "${opts.workspaceName}" workspace`,
      html: `
        <div style="font-family:'Geist',Inter,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;color:#1e293b;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 32px">
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff">&#x1F680; You're Invited!</h1>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 16px;font-size:16px;color:#0f172a"><strong>${opts.inviterName}</strong> invited you to join the <strong>${opts.workspaceName}</strong> workspace on Orbit as <strong>${opts.role}</strong>.</p>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:24px">
              <p style="margin:0;font-size:14px;color:#92400e">To accept, log in to Orbit and open the <strong>Invites</strong> tab in the sidebar.</p>
            </div>
            <a href="${opts.appUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(245,158,11,0.25)">Open Orbit</a>
            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">This invite expires in 7 days. If you didn't expect this, you can safely ignore it.</p>
          </div>
        </div>
      `,
    }).catch(() => { /* fire and forget */ });
  }
}
