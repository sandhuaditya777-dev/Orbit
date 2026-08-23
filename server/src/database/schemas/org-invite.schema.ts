import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OrgRole } from './organization.schema';

export type OrgInviteDocument = HydratedDocument<OrgInvite>;

@Schema({ timestamps: true })
export class OrgInvite {
  /** Secure random UUID sent in the invite email link */
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  organizationId: string;

  /** Email address the invite was sent to */
  @Prop({ required: true })
  email: string;

  @Prop({
    type: String,
    enum: ['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'],
    default: 'MEMBER',
  })
  role: OrgRole;

  /** Auth0 sub of the person who sent the invite */
  @Prop({ required: true })
  invitedBy: string;

  @Prop({ required: true })
  expiresAt: Date;

  /** Set when the invite is accepted */
  @Prop({ type: Date, default: null })
  usedAt: Date | null;
}

export const OrgInviteSchema = SchemaFactory.createForClass(OrgInvite);

// Fast lookup by token
OrgInviteSchema.index({ token: 1 }, { unique: true });

// Prevent duplicate pending invites for the same email+org
OrgInviteSchema.index({ email: 1, organizationId: 1 });
