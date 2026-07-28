import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PublicUser } from '../../users/users.service';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): PublicUser => {
    const request = ctx.switchToHttp().getRequest<{ user: PublicUser }>();
    return request.user;
  },
);
