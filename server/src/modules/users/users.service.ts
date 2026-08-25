import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findOrCreateUser(
    sub: string,
    data: { name: string; email: string; avatar?: string },
  ): Promise<UserDocument> {
    const existingUser = await this.userModel.findById(sub).exec();
    if (existingUser) {
      let dirty = false;
      if (
        data.name &&
        data.name !== 'Anonymous User' &&
        data.name !== 'Orbit User' &&
        existingUser.name !== data.name
      ) {
        existingUser.name = data.name;
        dirty = true;
      }
      if (
        data.email &&
        !data.email.endsWith('@placeholder.local') &&
        !data.email.endsWith('@example.com') &&
        existingUser.email !== data.email
      ) {
        existingUser.email = data.email;
        dirty = true;
      }
      if (data.avatar && existingUser.avatar !== data.avatar) {
        existingUser.avatar = data.avatar;
        dirty = true;
      }
      if (dirty) return existingUser.save();
      return existingUser;
    }

    // Lazy registration — cast to bypass TS strict _id insert
    const newUser = new this.userModel({
      _id: sub,
      name: data.name,
      email: data.email,
      avatar:
        data.avatar ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}`,
    } as Partial<UserDocument>);
    return newUser.save();
  }

  async findById(sub: string): Promise<UserDocument | null> {
    return this.userModel.findById(sub).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }
}
