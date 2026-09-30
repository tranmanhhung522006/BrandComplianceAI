import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module.js';

import {
  PrismaModule,
} from '../prisma/prisma.module.js';

import {
  WordPressAuthController,
} from './wordpress-auth.controller.js';

import {
  WordPressAuthService,
} from './wordpress-auth.service.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],

  controllers: [
    WordPressAuthController,
  ],

  providers: [
    WordPressAuthService,
  ],
})
export class WordPressAuthModule {}