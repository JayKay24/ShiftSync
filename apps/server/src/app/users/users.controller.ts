import { Controller, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileRequest } from '@shiftsync/data-access';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile')
  async updateProfile(@Req() req, @Body() body: UpdateProfileRequest) {
    const { userId } = req.user;
    return this.usersService.updateProfile(userId, body);
  }
}
