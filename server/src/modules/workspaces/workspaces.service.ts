import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  GoneException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workspace, WorkspaceDocument } from '../../database/schemas/workspace.schema';
import {
  OrganizationMember,
  OrganizationMemberDocument,
} from '../../database/schemas/organization-member.schema';
import {
  WorkspaceInvite,
  WorkspaceInviteDocument,
} from '../../database/schemas/workspace-invite.schema';
import { Notification, NotificationDocument } from '../../database/schemas/notification.schema';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/workspace.dto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(OrganizationMember.name)
    private orgMemberModel: Model<OrganizationMemberDocument>,
    @InjectModel(WorkspaceInvite.name)
    private inviteModel: Model<WorkspaceInviteDocument>,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  // ─── Slug generation ─────────────────────────────────────────────────────────

  private async generateSlug(name: string, organizationId: string): Promise<string> {
    let base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    let slug = base;
    let count = 0;
    while (await this.workspaceModel.findOne({ organizationId, slug })) {
      count++;
      slug = `${base}-${count}`;
    }
    return slug;
  }

  // ─── Membership helpers ──────────────────────────────────────────────────────

  private async requireOrgMembership(userId: string, organizationId: string): Promise<void> {
    const m = await this.orgMemberModel.findOne({ userId, organizationId });
    if (!m) throw new ForbiddenException('You are not a member of this organization');
  }

  private async requireOrgRole(
    userId: string,
    organizationId: string,
    allowedRoles: string[],
  ): Promise<void> {
    const m = await this.orgMemberModel.findOne({ userId, organizationId });
    if (!m || !allowedRoles.includes(m.role)) {
      throw new ForbiddenException(`Required org role: ${allowedRoles.join(' or ')}`);
    }
  }

  private requireWorkspaceRole(
    workspace: WorkspaceDocument,
    userId: string,
    allowedRoles: string[],
  ): void {
    const member = workspace.members.find((m) => m.userId === userId);
    if (!member || !allowedRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient workspace permissions');
    }
  }

  private getWorkspaceMemberRole(workspace: WorkspaceDocument, userId: string): string | null {
    const member = workspace.members.find((m) => m.userId === userId);
    return member?.role ?? null;
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateWorkspaceDto): Promise<WorkspaceDocument> {
    // Must be OWNER or MANAGER in the org to create a workspace
    await this.requireOrgRole(userId, dto.organizationId, ['OWNER', 'MANAGER']);

    if (dto.parentId) {
      const parent = await this.workspaceModel.findById(dto.parentId);
      if (!parent || parent.organizationId !== dto.organizationId) {
        throw new NotFoundException('Parent workspace not found in this organization');
      }
    }

    const slug = await this.generateSlug(dto.name, dto.organizationId);

    return this.workspaceModel.create({
      name: dto.name,
      slug,
      organizationId: dto.organizationId,
      parentId: dto.parentId ?? null,
      description: dto.description,
      logoUrl: dto.logoUrl,
      ownerId: userId,
      members: [{ userId, role: 'OWNER' }],
    });
  }

  async findAllInOrg(orgId: string, userId: string): Promise<WorkspaceDocument[]> {
    await this.requireOrgMembership(userId, orgId);
    return this.workspaceModel
      .find({ organizationId: orgId, parentId: null, isArchived: false })
      .sort({ createdAt: -1 });
  }

  async findById(id: string, userId: string): Promise<WorkspaceDocument> {
    const workspace = await this.workspaceModel.findById(id);
    if (!workspace) throw new NotFoundException('Workspace not found');

    const isOrgMember = await this.orgMemberModel.findOne({
      userId,
      organizationId: workspace.organizationId,
    });
    if (!isOrgMember) throw new ForbiddenException('Access denied');

    return workspace;
  }

  async getChildren(id: string, userId: string): Promise<WorkspaceDocument[]> {
    const workspace = await this.findById(id, userId);
    return this.workspaceModel.find({
      parentId: workspace._id.toString(),
      isArchived: false,
    });
  }

  async getAncestors(id: string, userId: string): Promise<WorkspaceDocument[]> {
    const workspace = await this.findById(id, userId);
    const ancestors: WorkspaceDocument[] = [];

    let currentParentId = workspace.parentId;
    while (currentParentId) {
      const parent = await this.workspaceModel.findById(currentParentId);
      if (!parent) break;
      ancestors.unshift(parent);
      currentParentId = parent.parentId;
    }

    return ancestors;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceDocument> {
    const workspace = await this.findById(id, userId);
    await this.requireOrgRole(userId, workspace.organizationId, ['OWNER', 'MANAGER']);

    const { organizationId, parentId, ...updateData } = dto;

    Object.assign(workspace, updateData);
    return workspace.save();
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    const workspace = await this.findById(id, userId);
    await this.requireOrgRole(userId, workspace.organizationId, ['OWNER']);

    await this.deleteRecursive(id);

    return { message: 'Workspace deleted successfully' };
  }

  private async deleteRecursive(workspaceId: string): Promise<void> {
    const children = await this.workspaceModel.find({ parentId: workspaceId });
    for (const child of children) {
      await this.deleteRecursive(child._id.toString());
    }
    await this.workspaceModel.findByIdAndDelete(workspaceId);
  }

  // ─── Workspace Invites ────────────────────────────────────────────────────────

  /**
   * Send an invite to join a specific workspace.
   * - Checks inviter has OWNER or MANAGER role in the workspace OR OWNER/MANAGER in the org.
   * - If invitee already has an Orbit account → also creates an in-app notification.
   * - Sends an email notification.
   */
  async sendInvite(
    workspaceId: string,
    inviterId: string,
    dto: { email: string; role?: string; inviterName: string },
  ): Promise<{ message: string }> {
    const workspace = await this.workspaceModel.findById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');

    // Must be workspace OWNER/MANAGER OR org OWNER/MANAGER
    const wsRole = this.getWorkspaceMemberRole(workspace, inviterId);
    const orgMember = await this.orgMemberModel.findOne({
      userId: inviterId,
      organizationId: workspace.organizationId,
    });

    const canInvite =
      (wsRole && ['OWNER', 'MANAGER'].includes(wsRole)) ||
      (orgMember && ['OWNER', 'MANAGER'].includes(orgMember.role));

    if (!canInvite) {
      throw new ForbiddenException('Only workspace or org Owners/Managers can invite members');
    }

    const role = dto.role ?? 'MEMBER';

    // Check if this email is already a workspace member
    const inviteeUser = await this.usersService.findByEmail(dto.email);
    if (inviteeUser) {
      const alreadyMember = workspace.members.some(
        (m) => m.userId === (inviteeUser._id as string),
      );
      if (alreadyMember) {
        throw new ConflictException('This user is already a member of this workspace');
      }
    }

    // Check for existing PENDING invite
    const existingInvite = await this.inviteModel.findOne({
      email: dto.email,
      workspaceId,
      status: 'PENDING',
    });
    if (existingInvite) {
      throw new ConflictException(
        'A pending invite already exists for this email. Cancel it first or wait for them to accept.',
      );
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await this.inviteModel.create({
      email: dto.email,
      workspaceId,
      organizationId: workspace.organizationId,
      workspaceName: workspace.name,
      role,
      invitedBy: inviterId,
      inviterName: dto.inviterName,
      status: 'PENDING',
      expiresAt,
    });

    // If the invitee already has an Orbit account, create an in-app notification
    if (inviteeUser) {
      await this.notificationModel.create({
        userId: inviteeUser._id as string,
        actorId: inviterId,
        actorName: dto.inviterName,
        type: 'WORKSPACE_INVITE',
        title: `You're invited to "${workspace.name}"`,
        body: `${dto.inviterName} invited you to join the "${workspace.name}" workspace as ${role}.`,
        entityId: (invite._id as unknown as string).toString(),
        entityType: 'WorkspaceInvite',
      });
    }

    // Send email notification
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    this.mailService.sendWorkspaceInvite({
      to: dto.email,
      inviterName: dto.inviterName,
      workspaceName: workspace.name,
      role,
      appUrl,
    });

    return { message: `Invite sent to ${dto.email}` };
  }

  /**
   * Returns all PENDING workspace invites addressed to the logged-in user's email.
   */
  async listIncomingInvites(userId: string): Promise<WorkspaceInviteDocument[]> {
    const user = await this.usersService.findById(userId);
    if (!user) return [];

    // Expire old invites on the fly
    await this.inviteModel.updateMany(
      { email: user.email, status: 'PENDING', expiresAt: { $lte: new Date() } },
      { status: 'EXPIRED' },
    );

    return this.inviteModel
      .find({ email: user.email, status: 'PENDING' })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Accept a workspace invite — adds the user to workspace.members[].
   */
  async acceptInvite(inviteId: string, userId: string): Promise<WorkspaceDocument> {
    const invite = await this.inviteModel.findById(inviteId);
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.status !== 'PENDING') {
      throw new GoneException(`Invite is already ${invite.status.toLowerCase()}`);
    }
    if (invite.expiresAt < new Date()) {
      invite.status = 'EXPIRED';
      await invite.save();
      throw new GoneException('This invite has expired');
    }

    // Verify the logged-in user's email matches the invite
    const user = await this.usersService.findById(userId);
    if (!user || user.email !== invite.email) {
      throw new ForbiddenException('This invite was not sent to your email address');
    }

    const workspace = await this.workspaceModel.findById(invite.workspaceId);
    if (!workspace) throw new NotFoundException('Workspace no longer exists');

    // Idempotent: skip if already a member
    const alreadyMember = workspace.members.some((m) => m.userId === userId);
    if (!alreadyMember) {
      workspace.members.push({ userId, role: invite.role as any });
      await workspace.save();
    }

    // Also ensure user is an org member (needed for org-level queries to work)
    const isOrgMember = await this.orgMemberModel.findOne({
      userId,
      organizationId: invite.organizationId,
    });
    if (!isOrgMember) {
      await this.orgMemberModel.create({
        userId,
        organizationId: invite.organizationId,
        role: 'MEMBER',
      });
    }

    invite.status = 'ACCEPTED';
    await invite.save();

    return workspace;
  }

  /**
   * Decline a workspace invite.
   */
  async declineInvite(inviteId: string, userId: string): Promise<void> {
    const invite = await this.inviteModel.findById(inviteId);
    if (!invite) throw new NotFoundException('Invite not found');

    const user = await this.usersService.findById(userId);
    if (!user || user.email !== invite.email) {
      throw new ForbiddenException('This invite was not sent to your email address');
    }

    invite.status = 'DECLINED';
    await invite.save();
  }

  /**
   * List sent (pending) invites for a workspace — OWNER/MANAGER only.
   */
  async listSentInvites(workspaceId: string, userId: string): Promise<WorkspaceInviteDocument[]> {
    const workspace = await this.workspaceModel.findById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');

    const wsRole = this.getWorkspaceMemberRole(workspace, userId);
    const orgMember = await this.orgMemberModel.findOne({
      userId,
      organizationId: workspace.organizationId,
    });

    const canView =
      (wsRole && ['OWNER', 'MANAGER'].includes(wsRole)) ||
      (orgMember && ['OWNER', 'MANAGER'].includes(orgMember.role));

    if (!canView) throw new ForbiddenException('Only Owners/Managers can view sent invites');

    return this.inviteModel
      .find({ workspaceId, status: 'PENDING' })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Cancel a sent invite — OWNER/MANAGER only.
   */
  async cancelInvite(inviteId: string, userId: string): Promise<void> {
    const invite = await this.inviteModel.findById(inviteId);
    if (!invite) throw new NotFoundException('Invite not found');

    const workspace = await this.workspaceModel.findById(invite.workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');

    const wsRole = this.getWorkspaceMemberRole(workspace, userId);
    const orgMember = await this.orgMemberModel.findOne({
      userId,
      organizationId: workspace.organizationId,
    });

    const canCancel =
      (wsRole && ['OWNER', 'MANAGER'].includes(wsRole)) ||
      (orgMember && ['OWNER', 'MANAGER'].includes(orgMember.role));

    if (!canCancel) throw new ForbiddenException('Only Owners/Managers can cancel invites');

    await this.inviteModel.findByIdAndDelete(inviteId);
  }
}
