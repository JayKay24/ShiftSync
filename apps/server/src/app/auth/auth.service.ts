import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository, User } from '@shiftsync/data-access';
import * as bcrypt from 'bcryptjs';

export type UserWithoutPassword = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<UserWithoutPassword | null> {
    const user = await this.userRepository.findByEmail(email);

    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: UserWithoutPassword) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}

