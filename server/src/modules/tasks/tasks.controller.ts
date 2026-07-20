import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { User } from '../../common/decorators/user.decorator';

@ApiTags('Tasks')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task inside a project' })
  create(@User('sub') userId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(userId, dto);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export tasks as CSV or JSON' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'format',    required: false, description: 'csv | json (default: csv)' })
  async export(
    @Query('projectId') projectId: string,
    @Query('format')    format: string = 'csv',
    @User('sub')        userId: string,
    @Res()              res: Response,
  ) {
    const tasks = await this.tasksService.findAllInProject(projectId, userId, {});

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="tasks-${projectId}.json"`);
      return res.send(JSON.stringify(tasks, null, 2));
    }

    // Default: CSV
    const headers = [
      'slug', 'title', 'type', 'status', 'priority',
      'assigneeIds', 'labels', 'dueDate', 'createdAt',
    ];
    const rows = tasks.map((t) => [
      t.slug,
      `"${(t.title ?? '').replace(/"/g, '""')}"`,
      t.type,
      `"${t.status}"`,
      t.priority,
      (t.assigneeIds ?? []).join('|'),
      (t.labels ?? []).join('|'),
      (t as any).dueDate ? new Date((t as any).dueDate).toISOString().slice(0, 10) : '',
      new Date((t as any).createdAt).toISOString().slice(0, 10),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tasks-${projectId}.csv"`);
    return res.send(csv);
  }

  @Get()
  @ApiOperation({ summary: 'List all tasks in a project' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'parentTaskId', required: false })
  @ApiQuery({ name: 'isArchived', required: false, type: Boolean })
  findAll(
    @Query('projectId') projectId: string,
    @User('sub') userId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('type') type?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('parentTaskId') parentTaskId?: string,
    @Query('isArchived') isArchived?: string,
  ) {
    const parentIdParsed = parentTaskId === 'null' ? null : parentTaskId;
    const isArchivedParsed = isArchived !== undefined ? isArchived === 'true' : undefined;
    return this.tasksService.findAllInProject(projectId, userId, {
      status,
      priority,
      type,
      assigneeId,
      parentTaskId: parentIdParsed,
      isArchived: isArchivedParsed,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single task by ID' })
  findOne(@Param('id') id: string, @User('sub') userId: string) {
    return this.tasksService.findById(id, userId);
  }

  @Get(':id/subtasks')
  @ApiOperation({ summary: 'Get subtasks of a parent task' })
  findSubtasks(@Param('id') id: string, @User('sub') userId: string) {
    return this.tasksService.findSubtasks(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task (title, status, priority, assignee, etc.)' })
  update(
    @Param('id') id: string,
    @User('sub') userId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  remove(@Param('id') id: string, @User('sub') userId: string) {
    return this.tasksService.delete(id, userId);
  }
}
