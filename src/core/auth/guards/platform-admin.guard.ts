import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const PLATFORM_ROLE = 'SUPER_ADMIN';

/**
 * Industry-standard isolation: platform SUPER_ADMIN may only access
 * auth + platform (company management) APIs — never tenant operational data.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return true; // GlobalAuthGuard handles unauthenticated
    }

    const roles: string[] = user.roles || [];
    const isPlatformAdmin =
      roles.includes(PLATFORM_ROLE) || user.tenant?.isPlatform === true;

    if (!isPlatformAdmin) {
      return true;
    }

    const path: string =
      request.originalUrl || request.url || request.path || '';
    const normalized = path.split('?')[0];
    const allowed =
      normalized.startsWith('/api/auth') ||
      normalized.startsWith('/auth') ||
      normalized.startsWith('/api/platform') ||
      normalized.startsWith('/platform') ||
      normalized === '/api' ||
      normalized === '/api/' ||
      normalized === '/';

    if (!allowed) {
      throw new ForbiddenException(
        'Platform administrators can only manage organizations, not organization data',
      );
    }

    return true;
  }
}
