import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { UsersService } from './users.service';

export class SyncUserDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

@ApiTags('Users')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Called by the client immediately after every Auth0 login.
   * Creates the MongoDB user document on first login, updates name/avatar on subsequent logins.
   */
  @Post('sync')
  @ApiOperation({ summary: 'Upsert the current user profile from Auth0 claims' })
  sync(@User('sub') sub: string, @Body() dto: SyncUserDto) {
    return this.usersService.findOrCreateUser(sub, {
      name: dto.name,
      email: dto.email,
      avatar: dto.avatar,
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user JWT claims' })
  getProfile(@User() user: any) {
    return user;
  }
}
