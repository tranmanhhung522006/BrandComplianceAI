import {
  Injectable,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },

      orderBy: {
        email: 'asc',
      },
    });
  }
}