import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  LoginRequest,
  LoginRequestSchema,
  AuthResponse,
  AuthResponseSchema,
} from '@shiftsync/data-access';
import { AuthService } from './auth.service';

/**
 * Controller managing authentication and session credential verification.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Authenticates user credentials and issues a signed JWT access token.
   *
   * @param {LoginRequest} loginDto - Validated login credentials payload.
   * @returns {Promise<AuthResponse>} Signed JWT token and sanitized user profile.
   * @throws {UnauthorizedException} If credentials do not match any user record.
   */
  @Post('login')
  @ApiOperation({ summary: 'Authenticate user credentials' })
  @ApiOkResponse({
    standardSchema: AuthResponseSchema,
    description: 'JWT bearer token and safe user profile',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @SerializeOptions({ schema: AuthResponseSchema })
  async login(
    @Body({ schema: LoginRequestSchema }) loginDto: LoginRequest,
  ): Promise<AuthResponse> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.pass,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }
}
