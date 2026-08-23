import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from '../../database/schemas/project.schema';
import { Workflow, WorkflowDocument, TaskStatus, TaskStatusDocument } from '../../database/schemas/workflow.schema';
import { OrganizationMember, OrganizationMemberDocument } from '../../database/schemas/organization-member.schema';
import { Workspace, WorkspaceDocument } from '../../database/schemas/workspace.schema';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateProjectMemberDto,
  UpdateProjectMemberDto,
  CreateTaskStatusDto,
  UpdateTaskStatusDto,
} from './dto/project.dto';

const DEFAULT_STATUSES = [
  { name: 'To Do',       type: 'TODO',        color: '#94a3b8', position: 0 },
  { name: 'In Progress', type: 'IN_PROGRESS',  color: '#3b82f6', position: 1 },
  { name: 'In Review',   type: 'IN_REVIEW',    color: '#f59e0b', position: 2 },
  { name: 'Done',        type: 'DONE',         color: '#22c55e', position: 3 },
  { name: 'Cancelled',   type: 'CANCELLED',    color: '#ef4444', position: 4 },
];

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name)  private projectModel: Model<ProjectDocument>,
    @InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>,
    @InjectModel(TaskStatus.name) private statusModel: Model<TaskStatusDocument>,
    @InjectModel(OrganizationMember.name) private orgMemberModel: Model<OrganizationMemberDocument>,
    @InjectModel(Workspace.name) private workspaceModel: Model<WorkspaceDocument>,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async requireOrgRole(userId: string, organizationId: string, roles: string[]) {
    const m = await this.orgMemberModel.findOne({ userId, organizationId });
    if (!m || !roles.includes(m.role))
      throw new ForbiddenException(`Required org role: ${roles.join(' or ')}`);
  }

  private async requireProjectRole(projectId: string, userId: string, roles: string[]) {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    const member = project.members.find((m) => m.userId === userId);
    if (!member || !roles.includes(member.role))
      throw new ForbiddenException(`Required project role: ${roles.join(' or ')}`);
    return project;
  }

  private async generateSlug(name: string, workspaceId: string): Promise<string> {
    let base = name.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    let slug = base;
    let count = 0;
    while (await this.projectModel.findOne({ workspaceId, slug })) {
      slug = `${base}-${++count}`;
    }
    return slug;
  }

  private async generateIdentifier(name: string, organizationId: string): Promise<string> {
    const words = name.trim().split(/\s+/);
    let base = words.map((w) => w[0]).join('').toUpperCase();
    if (base.length < 2) base = name.slice(0, 3).toUpperCase();
    let identifier = base;
    let count = 2;
    while (await this.projectModel.findOne({ organizationId, identifier })) {
      identifier = `${base}${count++}`;
    }
    return identifier;
  }

  // ─── Projects CRUD ──────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateProjectDto): Promise<ProjectDocument> {
    await this.requireOrgRole(userId, dto.organizationId, ['OWNER', 'MANAGER']);

    const slug       = await this.generateSlug(dto.name, dto.workspaceId);
    const identifier = await this.generateIdentifier(dto.name, dto.organizationId);

    const project = await this.projectModel.create({
      name: dto.name,
      slug,
      identifier,
      workspaceId: dto.workspaceId,
      organizationId: dto.organizationId,
      ownerId: userId,
      description: dto.description ?? '',
      color: dto.color ?? '#6366f1',
      priority: dto.priority ?? 'NO_PRIORITY',
      startDate: dto.startDate,
      endDate: dto.endDate,
      members: [{ userId, role: 'OWNER' }],
      // Legacy statuses array for existing task schema compatibility
      statuses: DEFAULT_STATUSES.map((s) => s.name),
    });

    // Create default workflow + statuses
    const projectId = (project._id as unknown as string).toString();
    const workflow = await this.workflowModel.create({
      name: 'Default',
      projectId,
      isDefault: true,
    });
    const workflowId = (workflow._id as unknown as string).toString();

    await this.statusModel.insertMany(
      DEFAULT_STATUSES.map((s) => ({ ...s, projectId, workflowId })),
    );

    return project;
  }

  async findAllInWorkspace(workspaceId: string, userId: string): Promise<ProjectDocument[]> {
    // Any org member can see all projects — derive org from the workspace
    const workspace = await this.workspaceModel.findById(workspaceId).lean();

    if (workspace) {
      const orgId = (workspace as any).organizationId as string;
      const isOrgMember = await this.orgMemberModel.findOne({ userId, organizationId: orgId });
      if (isOrgMember) {
        return this.projectModel
          .find({ workspaceId, isArchived: false })
          .sort({ createdAt: -1 });
      }
    }

    // Fallback: only return projects the user is explicitly a member of
    const allProjects = await this.projectModel
      .find({ workspaceId, isArchived: false })
      .sort({ createdAt: -1 });

    return allProjects.filter((p) =>
      p.members.some((m) => m.userId === userId),
    );
  }

  async findById(id: string, userId: string): Promise<ProjectDocument> {
    const project = await this.projectModel.findById(id);
    if (!project) throw new NotFoundException('Project not found');

    // Allow access if user is an org member OR a project member
    const isOrgMember = await this.orgMemberModel.findOne({
      userId,
      organizationId: project.organizationId,
    });
    if (!isOrgMember) {
      const isProjectMember = project.members.some((m) => m.userId === userId);
      if (!isProjectMember) throw new ForbiddenException('Access denied');
    }

    return project;
  }

  async update(id: string, userId: string, dto: UpdateProjectDto): Promise<ProjectDocument> {
    await this.requireProjectRole(id, userId, ['OWNER', 'MANAGER']);
    const project = await this.projectModel.findByIdAndUpdate(id, dto, { new: true });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    await this.requireProjectRole(id, userId, ['OWNER']);
    const project = await this.projectModel.findById(id);
    if (!project) throw new NotFoundException('Project not found');

    // Cascade: delete workflows → statuses → project
    const workflows = await this.workflowModel.find({ projectId: id });
    for (const wf of workflows) {
      await this.statusModel.deleteMany({ workflowId: (wf._id as unknown as string).toString() });
    }
    await this.workflowModel.deleteMany({ projectId: id });
    await this.projectModel.findByIdAndDelete(id);

    return { message: 'Project deleted successfully' };
  }

  // ─── Task number generation ──────────────────────────────────────────────────

  async generateTaskNumber(projectId: string): Promise<{ number: number; identifier: string }> {
    const project = await this.projectModel.findByIdAndUpdate(
      projectId,
      { $inc: { taskSequence: 1 } },
      { new: true },
    );
    if (!project) throw new NotFoundException('Project not found');
    return { number: project.taskSequence, identifier: `${project.identifier}-${project.taskSequence}` };
  }

  // ─── Members ─────────────────────────────────────────────────────────────────

  async listMembers(projectId: string, userId: string) {
    const project = await this.findById(projectId, userId);
    return project.members;
  }

  async addMember(userId: string, dto: CreateProjectMemberDto) {
    await this.requireProjectRole(dto.projectId, userId, ['OWNER', 'MANAGER']);
    const project = await this.projectModel.findById(dto.projectId);
    if (!project) throw new NotFoundException('Project not found');

    const exists = project.members.find((m) => m.userId === dto.userId);
    if (exists) {
      exists.role = dto.role as any;
    } else {
      project.members.push({ userId: dto.userId, role: dto.role as any });
    }
    return project.save();
  }

  async updateMember(projectId: string, targetUserId: string, callerId: string, dto: UpdateProjectMemberDto) {
    await this.requireProjectRole(projectId, callerId, ['OWNER', 'MANAGER']);
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    const member = project.members.find((m) => m.userId === targetUserId);
    if (!member) throw new NotFoundException('Member not found in project');
    member.role = dto.role as any;
    return project.save();
  }

  async removeMember(projectId: string, targetUserId: string, callerId: string) {
    await this.requireProjectRole(projectId, callerId, ['OWNER', 'MANAGER']);
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    project.members = project.members.filter((m) => m.userId !== targetUserId);
    return project.save();
  }

  // ─── Workflows & Statuses ────────────────────────────────────────────────────

  async getWorkflows(projectId: string, userId: string) {
    await this.findById(projectId, userId);
    const workflows = await this.workflowModel.find({ projectId });
    const statuses  = await this.statusModel.find({ projectId }).sort({ position: 1 });
    return workflows.map((wf) => ({
      ...wf.toObject(),
      statuses: statuses.filter((s) => s.workflowId === (wf._id as unknown as string).toString()),
    }));
  }

  async addStatus(userId: string, dto: CreateTaskStatusDto) {
    await this.findById(dto.projectId, userId);
    return this.statusModel.create(dto);
  }

  async updateStatus(statusId: string, userId: string, dto: UpdateTaskStatusDto) {
    const status = await this.statusModel.findById(statusId);
    if (!status) throw new NotFoundException('Status not found');
    await this.findById(status.projectId, userId);
    Object.assign(status, dto);
    return status.save();
  }

  async removeStatus(statusId: string, userId: string) {
    const status = await this.statusModel.findById(statusId);
    if (!status) throw new NotFoundException('Status not found');
    await this.findById(status.projectId, userId);
    await this.statusModel.findByIdAndDelete(statusId);
    return { message: 'Status removed' };
  }
}
