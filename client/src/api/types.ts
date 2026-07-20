export interface Organization {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  isArchived: boolean;
  ownerId: string;
  settings: Record<string, unknown>;
  createdAt: string;
}

export interface OrganizationMember {
  _id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER';
  user?: {
    name: string;
    email: string;
    avatar: string;
  };
  createdAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  organizationId: string;
  ownerId: string;
  parentId: string | null;
  description?: string;
  logoUrl?: string;
  isArchived: boolean;
  members: { userId: string; role: string }[];
  createdAt: string;
}

export type ProjectStatus   = 'ACTIVE' | 'ARCHIVED' | 'ON_HOLD' | 'COMPLETED';
export type ProjectPriority = 'NO_PRIORITY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ProjectMember {
  userId: string;
  role: 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER';
}

export interface TaskStatus {
  _id: string;
  name: string;
  color: string;
  type: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
  position: number;
  workflowId: string;
  projectId: string;
}

export interface Workflow {
  _id: string;
  name: string;
  projectId: string;
  isDefault: boolean;
  statuses: TaskStatus[];
}

export interface Project {
  _id: string;
  name: string;
  slug: string;
  identifier: string;
  workspaceId: string;
  organizationId: string;
  ownerId: string;
  description: string;
  color: string;
  iconUrl?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate?: string;
  endDate?: string;
  taskSequence: number;
  isArchived: boolean;
  members: ProjectMember[];
  statuses: string[]; // legacy compat
  createdAt: string;
}

export type TaskType = 'TASK' | 'BUG' | 'EPIC' | 'STORY';
export type TaskPriority = 'NO_PRIORITY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  _id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  description: string;
  taskNumber: number;
  slug: string;
  type: TaskType;
  priority: TaskPriority;
  status: string;
  parentTaskId: string | null;
  assigneeIds: string[];
  assigneeId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  labels: string[];
  createdBy: string;
  updatedBy?: string | null;
  isArchived: boolean;
  createdAt: string;
}

export interface User {
  sub: string;
  name: string;
  email: string;
  avatar?: string;
  roles: string[];
}

export interface Comment {
  _id: string;
  taskId: string;
  projectId: string;
  workspaceId: string;
  authorId: string;
  content: string;
  mentions: string[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

