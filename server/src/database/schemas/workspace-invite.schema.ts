import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WorkspaceInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
export type WorkspaceInviteDocument = HydratedDocument<WorkspaceInvite>;

@Schema({ timestamps: true })
export class WorkspaceInvite {
  /** Email address the invite was sent to */
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  workspaceId: string;

  @Prop({ required: true })
  organizationId: string;

  /** Display name of the workspace (denormalised for the invite email/UI) */
  @Prop({ required: true })
  workspaceName: string;

  @Prop({
    type: String,
    enum: ['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'],
    default: 'MEMBER',
  })
  role: string;

  /** Auth0 sub of the person who sent the invite */
  @Prop({ required: true })
  invitedBy: string;

  /** Display name of the inviter (denormalised so it shows correctly in email) */
  @Prop({ required: true })
  inviterName: string;

  @Prop({
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
    default: 'PENDING',
  })
  status: WorkspaceInviteStatus;

  @Prop({ required: true })
  expiresAt: Date;
}

export const WorkspaceInviteSchema = SchemaFactory.createForClass(WorkspaceInvite);

// Fast lookup for a user's incoming invites by email
WorkspaceInviteSchema.index({ email: 1, status: 1 });

// Fast lookup for sent invites per workspace
WorkspaceInviteSchema.index({ workspaceId: 1, status: 1 });

// Prevent duplicate pending invites for same email + workspace
WorkspaceInviteSchema.index(
  { email: 1, workspaceId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'PENDING' },
  },
);
