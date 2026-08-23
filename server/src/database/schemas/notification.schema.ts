import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'COMMENT_CREATED'
  | 'MENTION'
  | 'STATUS_CHANGED'
  | 'WORKSPACE_INVITE';

@Schema({ timestamps: true })
export class Notification {
  // The user who receives this notification
  @Prop({ required: true })
  userId: string;

  // The user who triggered the action
  @Prop({ required: true })
  actorId: string;

  @Prop({ required: true })
  actorName: string;

  @Prop({ required: true, enum: ['TASK_ASSIGNED', 'TASK_UPDATED', 'COMMENT_CREATED', 'MENTION', 'STATUS_CHANGED', 'WORKSPACE_INVITE'] })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  // Optional deep-link (e.g. to a task)
  @Prop({ type: String, default: null })
  entityId: string | null;

  @Prop({ type: String, default: null })
  entityType: string | null;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;
}

export const NotificationSchema: MongooseSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
