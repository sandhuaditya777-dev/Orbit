import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import {
  Organization,
  OrganizationSchema,
} from '../../database/schemas/organization.schema';
import {
  OrganizationMember,
  OrganizationMemberSchema,
} from '../../database/schemas/organization-member.schema';
import { Workspace, WorkspaceSchema } from '../../database/schemas/workspace.schema';
import { OrgInvite, OrgInviteSchema } from '../../database/schemas/org-invite.schema';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationMember.name, schema: OrganizationMemberSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: OrgInvite.name, schema: OrgInviteSchema },
    ]),
    UsersModule,
    MailModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
