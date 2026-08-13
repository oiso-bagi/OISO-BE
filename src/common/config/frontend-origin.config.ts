export const LOCAL_FRONTEND_ORIGIN = 'http://localhost:5173';

export interface FrontendOriginRules {
  exactOrigins: string[];
  wildcardOrigins: RegExp[];
}

export function parseFrontendOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .filter((origin) => !origin.includes('*'))
    .map(normalizeHttpOrigin);
}

export function parseFrontendOriginRules(value: string): FrontendOriginRules {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .reduce<FrontendOriginRules>(
      (rules, origin) => {
        if (origin.includes('*')) {
          rules.wildcardOrigins.push(normalizeHttpOriginPattern(origin));
        } else {
          rules.exactOrigins.push(normalizeHttpOrigin(origin));
        }

        return rules;
      },
      { exactOrigins: [], wildcardOrigins: [] },
    );
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

export function resolveFrontendOriginRules(
  configuredOrigins: string | undefined,
  nodeEnv: string | undefined,
  fallbackOrigin = LOCAL_FRONTEND_ORIGIN,
): FrontendOriginRules {
  if (configuredOrigins === undefined || configuredOrigins.length === 0) {
    if (nodeEnv === 'production') {
      throw new Error('FRONTEND_ORIGIN environment variable is required.');
    }

    return {
      exactOrigins: [fallbackOrigin],
      wildcardOrigins: [],
    };
  }

  const rules = parseFrontendOriginRules(configuredOrigins);

  if (rules.exactOrigins.length === 0 && rules.wildcardOrigins.length === 0) {
    if (nodeEnv === 'production') {
      throw new Error('FRONTEND_ORIGIN must include at least one origin.');
    }

    return {
      exactOrigins: [fallbackOrigin],
      wildcardOrigins: [],
    };
  }

  return rules;
}

export function isAllowedFrontendOrigin(
  origin: string,
  rules: FrontendOriginRules,
): boolean {
  const normalizedOrigin = normalizeHttpOrigin(origin);

  return (
    rules.exactOrigins.includes(normalizedOrigin) ||
    rules.wildcardOrigins.some((pattern) => pattern.test(normalizedOrigin))
  );
}

function normalizeHttpOrigin(value: string): string {
  const url = new URL(value);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('FRONTEND_ORIGIN only supports http and https origins.');
  }

  return url.origin;
}

function normalizeHttpOriginPattern(value: string): RegExp {
  const origin = normalizeHttpOrigin(value);
  const escapedOrigin = origin.split('*').map(escapeRegExp).join('[^.]+');

  return new RegExp(`^${escapedOrigin}$`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
