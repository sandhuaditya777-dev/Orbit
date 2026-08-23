import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  UpdateOrgMemberDto,
} from './dto/organization.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { User } from '../../common/decorators/user.decorator';

// ── DTOs defined here to keep things simple ──────────────────────────────────

export class InviteMemberDto {
  @ApiProperty({ example: 'colleague@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MEMBER', required: false })
  @IsOptional()
  @IsEnum(['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'])
  role?: 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER';

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  inviterName?: string;

  @ApiProperty({ example: 'Acme Corp', required: false })
  @IsOptional()
  @IsString()
  orgName?: string;
}

export class AcceptInviteDto {
  @ApiProperty({ example: 'uuid-token-here' })
  @IsString()
  token: string;
}

export class ResendInviteDto {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  inviterName?: string;
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('Organizations')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  // ── Org CRUD ────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  create(@User('sub') userId: string, @Body() dto: CreateOrganizationDto) {
    return this.orgsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations the current user belongs to' })
  findAll(@User('sub') userId: string) {
    return this.orgsService.findAllForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single organization (members only)' })
  findOne(@Param('id') id: string, @User('sub') userId: string) {
    return this.orgsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update org metadata (OWNER/MANAGER only)' })
  update(
    @Param('id') id: string,
    @User('sub') userId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgsService.update(id, userId, dto);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive organization and all child workspaces (OWNER only)' })
  archive(@Param('id') id: string, @User('sub') userId: string) {
    return this.orgsService.archive(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hard delete organization + cascade (OWNER only)' })
  remove(@Param('id') id: string, @User('sub') userId: string) {
    return this.orgsService.remove(id, userId);
  }

  // ── Members ─────────────────────────────────────────────────────────────────

  @Get(':id/members')
  @ApiOperation({ summary: 'List members of an organization' })
  listMembers(@Param('id') id: string, @User('sub') userId: string) {
    return this.orgsService.listMembers(id, userId);
  }

  @Patch('members/:memberId')
  @ApiOperation({ summary: 'Update a member role (OWNER/MANAGER only)' })
  updateMember(
    @Param('memberId') memberId: string,
    @User('sub') userId: string,
    @Body() dto: UpdateOrgMemberDto,
  ) {
    return this.orgsService.updateMember(memberId, userId, dto);
  }

  @Delete('members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from the organization' })
  removeMember(@Param('memberId') memberId: string, @User('sub') userId: string) {
    return this.orgsService.removeMember(memberId, userId);
  }

  // ── Invite ──────────────────────────────────────────────────────────────────

  @Post(':id/invite')
  @ApiOperation({
    summary:
      'Invite a user by email. If they already have an Orbit account they are added directly; otherwise an email with a secure token link is sent.',
  })
  async invite(
    @Param('id') orgId: string,
    @User('sub') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.orgsService.sendInvite(orgId, userId, dto);
  }

  @Post('invites/accept')
  @ApiOperation({ summary: 'Accept an invite token — called after Auth0 login/signup' })
  async acceptInvite(
    @User('sub') userId: string,
    @Body() dto: AcceptInviteDto,
  ) {
    return this.orgsService.acceptInvite(dto.token, userId);
  }

  // ── Pending Invites (OWNER/MANAGER only) ─────────────────────────────────────

  @Get(':id/invites')
  @ApiOperation({ summary: 'List pending invites for an organization' })
  listPendingInvites(@Param('id') id: string, @User('sub') userId: string) {
    return this.orgsService.listPendingInvites(id, userId);
  }

  @Delete('invites/:inviteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a pending invite' })
  cancelInvite(
    @Param('inviteId') inviteId: string,
    @User('sub') userId: string,
  ) {
    return this.orgsService.cancelInvite(inviteId, userId);
  }

  @Post('invites/:inviteId/resend')
  @ApiOperation({ summary: 'Resend a pending invite (resets 7-day expiry)' })
  resendInvite(
    @Param('inviteId') inviteId: string,
    @User('sub') userId: string,
    @Body() dto: ResendInviteDto,
  ) {
    return this.orgsService.resendInvite(inviteId, userId, dto.inviterName);
  }
}
