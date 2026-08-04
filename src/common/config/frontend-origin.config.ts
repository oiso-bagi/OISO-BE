export const LOCAL_FRONTEND_ORIGIN = 'http://localhost:5173';

export function parseFrontendOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map(normalizeHttpOrigin);
}

export function resolveFrontendOrigins(
  configuredOrigins: string | undefined,
  nodeEnv: string | undefined,
  fallbackOrigin = LOCAL_FRONTEND_ORIGIN,
): string[] {
  if (configuredOrigins === undefined || configuredOrigins.length === 0) {
    if (nodeEnv === 'production') {
      throw new Error('FRONTEND_ORIGIN environment variable is required.');
    }

    return [fallbackOrigin];
  }

  const origins = parseFrontendOrigins(configuredOrigins);

  if (origins.length === 0) {
    if (nodeEnv === 'production') {
      throw new Error('FRONTEND_ORIGIN must include at least one origin.');
    }

    return [fallbackOrigin];
  }

  return origins;
}

function normalizeHttpOrigin(value: string): string {
  const url = new URL(value);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('FRONTEND_ORIGIN only supports http and https origins.');
  }

  return url.origin;
}
