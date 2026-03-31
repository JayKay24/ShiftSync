import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '@shiftsync/data-access';

@Injectable()
export class UsersService {
  constructor(
    private userRepository: UserRepository,
  ) {}

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string; desiredWeeklyHours?: number }) {
    const user = await this.userRepository.updateUser(userId, data);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
