import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Workspace, WorkspaceSchema } from '../../database/schemas/workspace.schema';
import {
  OrganizationMember,
  OrganizationMemberSchema,
} from '../../database/schemas/organization-member.schema';
import {
  WorkspaceInvite,
  WorkspaceInviteSchema,
} from '../../database/schemas/workspace-invite.schema';
import {
  Notification,
  NotificationSchema,
} from '../../database/schemas/notification.schema';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: OrganizationMember.name, schema: OrganizationMemberSchema },
      { name: WorkspaceInvite.name, schema: WorkspaceInviteSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    MailModule,
    UsersModule,
  ],
  providers: [WorkspacesService],
  controllers: [WorkspacesController],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
