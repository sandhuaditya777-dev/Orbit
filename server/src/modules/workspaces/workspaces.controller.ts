import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/workspace.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { User } from '../../common/decorators/user.decorator';

export class SendWorkspaceInviteDto {
  @ApiProperty({ example: 'colleague@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['MANAGER', 'MEMBER', 'VIEWER'], required: false })
  @IsOptional()
  @IsEnum(['MANAGER', 'MEMBER', 'VIEWER'])
  role?: 'MANAGER' | 'MEMBER' | 'VIEWER';

  @ApiProperty({ example: 'Aditya Kumar', required: false })
  @IsOptional()
  @IsString()
  inviterName?: string;
}

@ApiTags('Workspaces')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  // ── Workspace CRUD ───────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new workspace (org OWNER/MANAGER only)' })
  create(@User('sub') userId: string, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(userId, dto);
  }

  @Get('org/:orgId')
  @ApiOperation({ summary: 'List top-level workspaces in an organization' })
  findAllInOrg(@Param('orgId') orgId: string, @User('sub') userId: string) {
    return this.workspacesService.findAllInOrg(orgId, userId);
  }

  @Get('invites/incoming')
  @ApiOperation({ summary: 'List all pending workspace invites for the current user' })
  listIncomingInvites(@User('sub') userId: string) {
    return this.workspacesService.listIncomingInvites(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace details by ID' })
  findOne(@Param('id') id: string, @User('sub') userId: string) {
    return this.workspacesService.findById(id, userId);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get child workspaces' })
  getChildren(@Param('id') id: string, @User('sub') userId: string) {
    return this.workspacesService.getChildren(id, userId);
  }

  @Get(':id/ancestors')
  @ApiOperation({ summary: 'Get ancestor chain (breadcrumb) to workspace root' })
  getAncestors(@Param('id') id: string, @User('sub') userId: string) {
    return this.workspacesService.getAncestors(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace (org OWNER/MANAGER only)' })
  update(
    @Param('id') id: string,
    @User('sub') userId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete workspace + all children (org OWNER only)' })
  remove(@Param('id') id: string, @User('sub') userId: string) {
    return this.workspacesService.delete(id, userId);
  }

  // ── Workspace Invites ────────────────────────────────────────────────────────

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a user to this workspace by email' })
  sendInvite(
    @Param('id') workspaceId: string,
    @User('sub') userId: string,
    @User('name') userName: string,
    @Body() dto: SendWorkspaceInviteDto,
  ) {
    return this.workspacesService.sendInvite(workspaceId, userId, {
      email: dto.email,
      role: dto.role,
      inviterName: dto.inviterName ?? userName ?? 'A team member',
    });
  }

  @Post('invites/:inviteId/accept')
  @ApiOperation({ summary: 'Accept a workspace invite' })
  acceptInvite(@Param('inviteId') inviteId: string, @User('sub') userId: string) {
    return this.workspacesService.acceptInvite(inviteId, userId);
  }

  @Post('invites/:inviteId/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Decline a workspace invite' })
  declineInvite(@Param('inviteId') inviteId: string, @User('sub') userId: string) {
    return this.workspacesService.declineInvite(inviteId, userId);
  }

  @Get(':id/invites')
  @ApiOperation({ summary: 'List pending invites sent for this workspace (OWNER/MANAGER only)' })
  listSentInvites(@Param('id') workspaceId: string, @User('sub') userId: string) {
    return this.workspacesService.listSentInvites(workspaceId, userId);
  }

  @Delete('invites/:inviteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a sent workspace invite (OWNER/MANAGER only)' })
  cancelInvite(@Param('inviteId') inviteId: string, @User('sub') userId: string) {
    return this.workspacesService.cancelInvite(inviteId, userId);
  }
}
