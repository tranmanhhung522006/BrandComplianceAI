import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import {
  AuthGuard,
} from '../auth/auth.guard.js';

import {
  UsersService,
} from './users.service.js';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    private readonly usersService:
      UsersService,
  ) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}