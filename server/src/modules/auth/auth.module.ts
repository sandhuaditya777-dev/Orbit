import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { Auth0Strategy } from './auth0.strategy';
import { UsersModule } from '../users/users.module';
import { AuthGuard } from '../../common/guards/auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    UsersModule,
  ],
  providers: [Auth0Strategy, AuthGuard],
  exports: [PassportModule, AuthGuard],
})
export class AuthModule {}
