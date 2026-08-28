import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { User } from '../../common/decorators/user.decorator';

@ApiTags('Comments')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a comment on a task' })
  create(
    @User('sub') userId: string,
    @User('name') userName: string,
    @User('email') userEmail: string,
    @Body() dto: CreateCommentDto,
  ) {
    const actor = (userName && userName !== 'Someone') ? userName : (userEmail || 'Team member');
    return this.commentsService.create(userId, dto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'Get all comments for a task' })
  @ApiQuery({ name: 'taskId', required: true })
  findAll(@Query('taskId') taskId: string, @User('sub') userId: string) {
    return this.commentsService.findAllForTask(taskId, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a comment (author only)' })
  update(
    @Param('id') id: string,
    @User('sub') userId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment (author only)' })
  remove(@Param('id') id: string, @User('sub') userId: string) {
    return this.commentsService.delete(id, userId);
  }
}
