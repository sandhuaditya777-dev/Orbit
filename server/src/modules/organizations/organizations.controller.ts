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
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  UpdateOrgMemberDto,
} from './dto/organization.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { MailService } from '../mail/mail.service';

export class InviteMemberDto {
  @ApiProperty({ example: 'colleague@company.com', description: 'Email to invite' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MEMBER', required: false, description: 'Role to assign on join' })
  @IsOptional() @IsString()
  role?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional() @IsString()
  inviterName?: string;

  @ApiProperty({ example: 'Acme Corp', required: false })
  @IsOptional() @IsString()
  orgName?: string;
}

@ApiTags('Organizations')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly orgsService: OrganizationsService,
    private readonly mailService: MailService,
  ) {}

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
  @ApiOperation({ summary: 'Send an email invitation to join the organization' })
  async invite(
    @Param('id') orgId: string,
    @User('sub') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    // Build a simple invite URL (the recipient clicks it, then signs up / logs in)
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}?invite=${orgId}&email=${encodeURIComponent(dto.email)}`;

    this.mailService.sendInvite({
      to:          dto.email,
      orgName:     dto.orgName     ?? 'our organization',
      inviterName: dto.inviterName ?? 'A team member',
      inviteUrl,
    });

    return { success: true, inviteUrl };
  }
}
