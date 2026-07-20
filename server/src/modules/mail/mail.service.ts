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
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host:   this.config.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port:   this.config.get<number>('MAIL_PORT', 587),
      secure: this.config.get<number>('MAIL_PORT', 587) === 465,
      auth: {
        user: this.config.get<string>('MAIL_USER', ''),
        pass: this.config.get<string>('MAIL_PASS', ''),
      },
    });
  }

  async sendMail(opts: SendMailOptions): Promise<void> {
    const from = this.config.get<string>('MAIL_FROM', 'Orbit <noreply@orbit.app>');
    try {
      await this.transporter.sendMail({ from, ...opts });
      this.logger.log(`Email sent to ${opts.to}: ${opts.subject}`);
    } catch (err) {
      // Never crash the request — email is best-effort
      this.logger.warn(`Failed to send email to ${opts.to}: ${(err as Error).message}`);
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
        <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:28px 32px">
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff">🎯 New Task Assigned</h1>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 8px;color:#94a3b8;font-size:14px">Hi ${opts.recipientName},</p>
            <p style="margin:0 0 20px;font-size:16px"><strong>${opts.actorName}</strong> assigned you a task:</p>
            <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px 20px;margin-bottom:24px">
              <p style="margin:0;font-size:16px;font-weight:600;color:#f1f5f9">${opts.taskTitle}</p>
            </div>
            <p style="margin:0;color:#64748b;font-size:12px">You received this because you were assigned a task on Orbit.</p>
          </div>
        </div>
      `,
    }).catch(() => {/* fire and forget */});
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
        <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:28px 32px">
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff">💬 You were mentioned</h1>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 8px;color:#94a3b8;font-size:14px">Hi ${opts.recipientName},</p>
            <p style="margin:0 0 20px;font-size:16px"><strong>${opts.actorName}</strong> mentioned you in a comment on:</p>
            <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px 20px;margin-bottom:24px">
              <p style="margin:0;font-size:16px;font-weight:600;color:#f1f5f9">${opts.taskTitle}</p>
            </div>
            <p style="margin:0;color:#64748b;font-size:12px">You received this because someone mentioned you on Orbit.</p>
          </div>
        </div>
      `,
    }).catch(() => {/* fire and forget */});
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
        <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px">
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff">&#x1F680; You're Invited!</h1>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 16px;font-size:16px"><strong>${opts.inviterName}</strong> invited you to join <strong>${opts.orgName}</strong> on Orbit.</p>
            <a href="${opts.inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px">Accept Invitation</a>
            <p style="margin:24px 0 0;color:#64748b;font-size:12px">This invite link expires in 7 days. If you didn't expect this, you can safely ignore it.</p>
          </div>
        </div>
      `,
    }).catch(() => {/* fire and forget */});
  }
}
