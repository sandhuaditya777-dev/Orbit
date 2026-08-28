import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  GoneException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
} from '../../database/schemas/organization.schema';
import {
  OrganizationMember,
  OrganizationMemberDocument,
} from '../../database/schemas/organization-member.schema';
import {
  Workspace,
  WorkspaceDocument,
} from '../../database/schemas/workspace.schema';
import {
  OrgInvite,
  OrgInviteDocument,
} from '../../database/schemas/org-invite.schema';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  UpdateOrgMemberDto,
} from './dto/organization.dto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private orgModel: Model<OrganizationDocument>,
    @InjectModel(OrganizationMember.name)
    private memberModel: Model<OrganizationMemberDocument>,
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(OrgInvite.name)
    private inviteModel: Model<OrgInviteDocument>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  // ─── Slug generation ────────────────────────────────────────────────────────

  private async generateSlug(name: string): Promise<string> {
    let base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    let slug = base;
    let count = 0;
    while (await this.orgModel.findOne({ slug })) {
      count++;
      slug = `${base}-${count}`;
    }
    return slug;
  }

  // ─── Membership helpers ──────────────────────────────────────────────────────

  private async getMembership(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMemberDocument | null> {
    return this.memberModel.findOne({ userId, organizationId });
  }

  private async requireMembership(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMemberDocument> {
    const m = await this.getMembership(userId, organizationId);
    if (!m)
      throw new ForbiddenException('You are not a member of this organization');
    return m;
  }

  private async requireRole(
    userId: string,
    organizationId: string,
    allowedRoles: string[],
  ): Promise<void> {
    const m = await this.requireMembership(userId, organizationId);
    if (!allowedRoles.includes(m.role)) {
      throw new ForbiddenException(
        `Required role: ${allowedRoles.join(' or ')}`,
      );
    }
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async create(
    userId: string,
    dto: CreateOrganizationDto,
  ): Promise<OrganizationDocument> {
    const slug = await this.generateSlug(dto.name);

    const org = await this.orgModel.create({
      name: dto.name,
      slug,
      description: dto.description,
      logoUrl: dto.logoUrl,
      ownerId: userId,
    });

    // Auto-assign creator as OWNER
    await this.memberModel.create({
      userId,
      organizationId: (org._id as unknown as string).toString(),
      role: 'OWNER',
    });

    return org;
  }

  async findAllForUser(userId: string): Promise<OrganizationDocument[]> {
    const memberships = await this.memberModel.find({ userId: userId });

    const orgIds = memberships.map((m) => m.organizationId);
    return this.orgModel
      .find({ _id: { $in: orgIds }, isArchived: false })
      .sort({ createdAt: -1 });
  }

  async findOne(orgId: string, userId: string): Promise<OrganizationDocument> {
    await this.requireMembership(userId, orgId);
    const org = await this.orgModel.findById(orgId);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(
    orgId: string,
    userId: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationDocument> {
    await this.requireRole(userId, orgId, ['OWNER', 'MANAGER']);
    const org = await this.orgModel.findByIdAndUpdate(orgId, dto, {
      new: true,
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async archive(orgId: string, userId: string): Promise<OrganizationDocument> {
    await this.requireRole(userId, orgId, ['OWNER']);
    const org = await this.orgModel.findByIdAndUpdate(
      orgId,
      { isArchived: true },
      { new: true },
    );
    if (!org) throw new NotFoundException('Organization not found');

    // Cascade archive to workspaces
    await this.workspaceModel.updateMany(
      { organizationId: orgId },
      { isArchived: true },
    );

    return org;
  }

  async remove(orgId: string, userId: string): Promise<void> {
    await this.requireRole(userId, orgId, ['OWNER']);

    // Cascade delete: workspaces → members → invites → org
    await this.workspaceModel.deleteMany({ organizationId: orgId });
    await this.memberModel.deleteMany({ organizationId: orgId });
    await this.inviteModel.deleteMany({ organizationId: orgId });
    await this.orgModel.findByIdAndDelete(orgId);
  }

  // ─── Members ─────────────────────────────────────────────────────────────────

  async listMembers(orgId: string, userId: string) {
    await this.requireMembership(userId, orgId);
    const members = await this.memberModel
      .find({ organizationId: orgId })
      .exec();

    // Populate user profiles
    const populated = await Promise.all(
      members.map(async (m) => {
        const u = await this.usersService.findById(m.userId);
        return {
          ...m.toObject(),
          user: u
            ? { name: u.name, email: u.email, avatar: u.avatar }
            : undefined,
        };
      }),
    );
    return populated;
  }

  async updateMember(
    memberId: string,
    userId: string,
    dto: UpdateOrgMemberDto,
  ): Promise<OrganizationMemberDocument> {
    const member = await this.memberModel.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');

    await this.requireRole(userId, member.organizationId, ['OWNER', 'MANAGER']);

    member.role = dto.role;
    return member.save();
  }

  async removeMember(memberId: string, userId: string): Promise<void> {
    const member = await this.memberModel.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');

    await this.requireRole(userId, member.organizationId, ['OWNER', 'MANAGER']);

    // Cannot remove yourself if you're the only OWNER
    if (member.userId === userId && member.role === 'OWNER') {
      const ownerCount = await this.memberModel.countDocuments({
        organizationId: member.organizationId,
        role: 'OWNER',
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Cannot remove the only owner. Transfer ownership first.',
        );
      }
    }

    await this.memberModel.findByIdAndDelete(memberId);
  }

  // ─── Invite ──────────────────────────────────────────────────────────────────

  /**
   * Smart invite:
   *  - If the email already belongs to an Orbit user → add them directly as a member
   *  - Otherwise → create a pending OrgInvite token and send an email
   */
  async sendInvite(
    orgId: string,
    inviterId: string,
    dto: {
      email: string;
      role?: string;
      inviterName?: string;
      orgName?: string;
    },
  ): Promise<{ type: 'added' | 'invited'; message: string }> {
    await this.requireRole(inviterId, orgId, ['OWNER', 'MANAGER']);

    const org = await this.orgModel.findById(orgId);
    if (!org) throw new NotFoundException('Organization not found');

    const role = (dto.role as any) ?? 'MEMBER';
    const orgName = dto.orgName ?? org.name;
    const inviterName = dto.inviterName ?? 'A team member';

    // Check if this email already belongs to an Orbit user
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      // Check if already a member
      const alreadyMember = await this.getMembership(
        existingUser._id as string,
        orgId,
      );
      if (alreadyMember) {
        throw new ConflictException(
          'This user is already a member of the organization',
        );
      }

      // Add directly
      await this.memberModel.create({
        userId: existingUser._id as string,
        organizationId: orgId,
        role,
      });

      return {
        type: 'added',
        message: `${existingUser.name} was already on Orbit and has been added to ${orgName}`,
      };
    }

    // Check for an existing pending (unused, non-expired) invite for this email+org
    const existingInvite = await this.inviteModel.findOne({
      email: dto.email,
      organizationId: orgId,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (existingInvite) {
      throw new ConflictException(
        'A pending invite already exists for this email. Use resend to refresh it.',
      );
    }

    // Create a secure invite token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.inviteModel.create({
      token,
      organizationId: orgId,
      email: dto.email,
      role,
      invitedBy: inviterId,
      expiresAt,
      usedAt: null,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const inviteUrl = `${appUrl}?invite_token=${token}`;

    this.mailService.sendInvite({
      to: dto.email,
      orgName,
      inviterName,
      inviteUrl,
    });

    return {
      type: 'invited',
      message: `Invite email sent to ${dto.email}`,
    };
  }

  /**
   * Accept an invite by token — called after the invitee signs in via Auth0.
   * Returns the org so the client can activate it.
   */
  async acceptInvite(
    token: string,
    userId: string,
  ): Promise<OrganizationDocument> {
    const invite = await this.inviteModel.findOne({ token });

    if (!invite)
      throw new NotFoundException('Invite not found or already used');
    if (invite.usedAt)
      throw new GoneException('This invite has already been used');
    if (invite.expiresAt < new Date())
      throw new GoneException('This invite has expired');

    // Idempotent — silently skip if already a member
    const alreadyMember = await this.getMembership(
      userId,
      invite.organizationId,
    );
    if (!alreadyMember) {
      await this.memberModel.create({
        userId,
        organizationId: invite.organizationId,
        role: invite.role,
      });
    }

    // Mark invite as used
    invite.usedAt = new Date();
    await invite.save();

    const org = await this.orgModel.findById(invite.organizationId);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  // ─── Pending Invites ─────────────────────────────────────────────────────────

  async listPendingInvites(orgId: string, userId: string) {
    await this.requireRole(userId, orgId, ['OWNER', 'MANAGER']);
    return this.inviteModel
      .find({
        organizationId: orgId,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async cancelInvite(inviteId: string, userId: string): Promise<void> {
    const invite = await this.inviteModel.findById(inviteId);
    if (!invite) throw new NotFoundException('Invite not found');
    await this.requireRole(userId, invite.organizationId, ['OWNER', 'MANAGER']);
    await this.inviteModel.findByIdAndDelete(inviteId);
  }

  async resendInvite(
    inviteId: string,
    userId: string,
    inviterName?: string,
  ): Promise<void> {
    const invite = await this.inviteModel.findById(inviteId);
    if (!invite) throw new NotFoundException('Invite not found');
    await this.requireRole(userId, invite.organizationId, ['OWNER', 'MANAGER']);

    const org = await this.orgModel.findById(invite.organizationId);
    if (!org) throw new NotFoundException('Organization not found');

    // Reset expiry and generate a fresh token
    invite.token = crypto.randomUUID();
    invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    invite.usedAt = null;
    await invite.save();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const inviteUrl = `${appUrl}?invite_token=${invite.token}`;

    this.mailService.sendInvite({
      to: invite.email,
      orgName: org.name,
      inviterName: inviterName ?? 'A team member',
      inviteUrl,
    });
  }
}
