import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService, PublicUser } from '../users/users.service';
import type { JwtPayload } from './strategies/jwt.strategy';

export interface LoginResult {
  accessToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalized);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const publicUser = this.users.toPublic(user);
    const payload: JwtPayload = {
      sub: publicUser.id,
      email: publicUser.email,
      role: publicUser.role,
      organizationId: publicUser.organizationId,
    };
    const accessToken = await this.jwt.signAsync(payload);

    return { accessToken, user: publicUser };
  }
}
