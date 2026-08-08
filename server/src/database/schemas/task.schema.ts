import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type TaskType = 'TASK' | 'BUG' | 'EPIC' | 'STORY';
export type TaskPriority = 'NO_PRIORITY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskDocument = HydratedDocument<Task>;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true })
  workspaceId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  taskNumber: number;

  @Prop({ required: true })
  slug: string;

  @Prop({
    type: String,
    enum: ['TASK', 'BUG', 'EPIC', 'STORY'],
    default: 'TASK',
  })
  type: TaskType;

  @Prop({
    type: String,
    enum: ['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM',
  })
  priority: TaskPriority;

  @Prop({ required: true, default: 'To Do' })
  status: string;

  // Sort position within a status column (fractional indexing — see tasks.service.ts)
  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: String, default: null })
  parentTaskId: string | null;

  @Prop({ type: [String], default: [] })
  assigneeIds: string[];

  // Legacy compatibility for simple UI references
  @Prop({ type: String, default: null })
  assigneeId: string | null;

  @Prop({ type: Number, default: null })
  storyPoints: number | null;

  @Prop({ type: Date, default: null })
  startDate: Date | null;

  @Prop({ type: Date, default: null })
  dueDate: Date | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: [String], default: [] })
  labels: string[];

  @Prop({ required: true })
  createdBy: string;

  @Prop({ type: String, default: null })
  updatedBy: string | null;

  @Prop({ type: Boolean, default: false })
  isArchived: boolean;
}

export const TaskSchema: MongooseSchema = SchemaFactory.createForClass(Task);

// Compounded index for quick project-scoped task lookup and uniqueness
TaskSchema.index({ projectId: 1, taskNumber: 1 }, { unique: true });
TaskSchema.index({ parentTaskId: 1 });
// Free-tier MongoDB $text search
TaskSchema.index({ title: 'text', description: 'text' }, { name: 'task_text_idx', weights: { title: 3, description: 1 } });

