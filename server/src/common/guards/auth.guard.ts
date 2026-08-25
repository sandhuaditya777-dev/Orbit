import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Delegate validation to Passport (validate JWT signature/expiry with Auth0)
    let passportActivated = false;
    try {
      passportActivated = (await super.canActivate(context)) as boolean;
    } catch (err) {
      throw new UnauthorizedException(err.message || 'Authentication failed');
    }

    if (!passportActivated) return false;

    const request = context.switchToHttp().getRequest();
    // Passport injected Auth0 token payload into request.user
    const payload = request.user as any;
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // 2. Look up existing DB user first — avoid overwriting real profile with JWT fallbacks.
    //    Auth0 access tokens often omit name/email; the real profile comes from /users/sync.
    let dbUser = await this.usersService.findById(payload.sub);

    if (!dbUser) {
      // First-ever request from this user — bootstrap a minimal record.
      // Prefer JWT claims if present; fall back to email prefix (never 'Anonymous User').
      const rawName: string =
        payload.name && !payload.name.includes('@')
          ? payload.name
          : payload.nickname ||
            (payload.email ? (payload.email as string).split('@')[0] : null) ||
            'Orbit User';

      const rawEmail: string = payload.email || `${payload.sub}@placeholder.local`;

      dbUser = await this.usersService.findOrCreateUser(payload.sub, {
        name: rawName,
        email: rawEmail,
        avatar: payload.picture || '',
      });
    }

    // 3. Replace request.user with fully-typed user context
    request.user = {
      sub: dbUser._id,
      name: dbUser.name,
      email: dbUser.email,
      avatar: dbUser.avatar,
      roles: payload['https://cosync.com/roles'] || payload.roles || ['member'],
    };

    return true;
  }
}
