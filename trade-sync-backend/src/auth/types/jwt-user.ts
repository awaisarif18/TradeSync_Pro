import type { User } from '../../database/user.entity';

/** User attached to `req.user` after JwtStrategy validate (no password field). */
export type JwtUser = Omit<User, 'password'>;
