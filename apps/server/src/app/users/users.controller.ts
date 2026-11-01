import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Req,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  SafeUser,
  SafeUserSchema,
  UpdateProfileRequest,
  UpdateProfileRequestSchema,
} from '@shiftsync/data-access';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Controller managing user profile updates and staff preferences.
 */
@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Updates profile attributes for the authenticated user.
   *
   * @param {any} req - Authenticated HTTP request containing actor identity.
   * @param {UpdateProfileRequest} body - Validated profile update payload.
   * @returns {Promise<SafeUser>} Updated user profile without passwordHash.
   */
  @Patch('profile')
  @ApiOperation({ summary: 'Update personal profile details' })
  @ApiOkResponse({
    standardSchema: SafeUserSchema,
    description: 'Updated user profile',
  })
  @SerializeOptions({ schema: SafeUserSchema })
  async updateProfile(
    @Req() req,
    @Body({ schema: UpdateProfileRequestSchema }) body: UpdateProfileRequest,
  ): Promise<SafeUser> {
    const { userId } = req.user;
    return this.usersService.updateProfile(userId, body);
  }
}
