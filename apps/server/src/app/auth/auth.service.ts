import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository, User } from '@shiftsync/data-access';
import * as bcrypt from 'bcryptjs';

/**
 * User representation with sensitive password hash excluded.
 */
export type UserWithoutPassword = Omit<User, 'passwordHash'>;

/**
 * Service managing user authentication, password verification, and JWT issuance.
 */
@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
  ) {}

  /**
   * Validates user credentials against database email and bcrypt password hash.
   *
   * @param {string} email - User email address.
   * @param {string} pass - Plaintext password attempt.
   * @returns {Promise<UserWithoutPassword | null>} Sanitized user record if valid, otherwise null.
   */
  async validateUser(
    email: string,
    pass: string,
  ): Promise<UserWithoutPassword | null> {
    const user = await this.userRepository.findByEmail(email);

    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Generates a signed JWT bearer token containing user identity and role claims.
   *
   * @param {UserWithoutPassword} user - Authenticated user entity.
   * @returns {Promise<{ access_token: string; user: UserWithoutPassword }>} Access token and user payload.
   */
  async login(user: UserWithoutPassword) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
