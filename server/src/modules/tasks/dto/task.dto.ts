import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsEnum, IsDateString, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement Auth Module' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'project-id-here' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 'workspace-id-here' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({ example: 'Detailed description of the task' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ['TASK', 'BUG', 'EPIC', 'STORY'], default: 'TASK' })
  @IsEnum(['TASK', 'BUG', 'EPIC', 'STORY'])
  @IsOptional()
  type?: 'TASK' | 'BUG' | 'EPIC' | 'STORY';

  @ApiPropertyOptional({ enum: ['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' })
  @IsEnum(['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  @IsOptional()
  priority?: 'NO_PRIORITY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @ApiPropertyOptional({ example: 'To Do' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 'parent-task-id-here' })
  @IsString()
  @IsOptional()
  parentTaskId?: string;

  @ApiPropertyOptional({ example: ['user-id-1', 'user-id-2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assigneeIds?: string[];

  // Legacy support
  @ApiPropertyOptional({ example: 'user-id-here' })
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: ['backend', 'auth'] })
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ['TASK', 'BUG', 'EPIC', 'STORY'] })
  @IsEnum(['TASK', 'BUG', 'EPIC', 'STORY'])
  @IsOptional()
  type?: 'TASK' | 'BUG' | 'EPIC' | 'STORY';

  @ApiPropertyOptional({ enum: ['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsEnum(['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  @IsOptional()
  priority?: 'NO_PRIORITY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentTaskId?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assigneeIds?: string[];

  // Legacy support
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}

