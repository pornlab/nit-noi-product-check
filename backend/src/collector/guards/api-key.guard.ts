import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

interface CollectorRequest extends Request {
  collectorOrgId?: string;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<CollectorRequest>();
    const provided = (req.header('x-api-key') ?? '').trim();
    const expected = (process.env.COLLECTOR_API_KEY ?? '').trim();
    const orgId = (process.env.COLLECTOR_ORG_ID ?? '').trim();

    if (!expected || !orgId) {
      // Не настроено — считаем endpoint выключенным.
      throw new UnauthorizedException('Collector API disabled');
    }
    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid API key');
    }
    req.collectorOrgId = orgId;
    return true;
  }
}

/** Постоянного времени сравнение, чтобы не палить длину ключа через time-attack. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
