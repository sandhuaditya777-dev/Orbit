import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project, ProjectSchema } from '../../database/schemas/project.schema';
import { Workflow, WorkflowSchema, TaskStatus, TaskStatusSchema } from '../../database/schemas/workflow.schema';
import { OrganizationMember, OrganizationMemberSchema } from '../../database/schemas/organization-member.schema';
import { Workspace, WorkspaceSchema } from '../../database/schemas/workspace.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name,            schema: ProjectSchema },
      { name: Workflow.name,           schema: WorkflowSchema },
      { name: TaskStatus.name,         schema: TaskStatusSchema },
      { name: OrganizationMember.name, schema: OrganizationMemberSchema },
      { name: Workspace.name,          schema: WorkspaceSchema },
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
