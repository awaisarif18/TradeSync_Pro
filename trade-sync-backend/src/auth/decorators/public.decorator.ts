import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as accessible without a Bearer JWT (global JwtAuthGuard skips JWT). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
