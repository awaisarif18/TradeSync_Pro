import type { ConfigService } from '@nestjs/config';

const DEV_FALLBACK =
  'development-only-jwt-secret-min-32-chars-replace-in-env!!!!';

let devFallbackWarningShown = false;

/**
 * Resolves JWT signing secret from ConfigService / process.env, with a
 * non-production fallback so local `nest start` works without a `.env` file.
 */
export function resolveJwtSecret(config: ConfigService): string {
  let secret =
    config.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET ?? '';
  secret = secret.trim();

  if (!secret && process.env.NODE_ENV !== 'production') {
    if (!devFallbackWarningShown) {
      devFallbackWarningShown = true;
      console.warn(
        '[Auth] JWT_SECRET is unset; using insecure development default. Set JWT_SECRET in trade-sync-backend/.env (see .env.example).',
      );
    }
    return DEV_FALLBACK;
  }

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return secret;
}
