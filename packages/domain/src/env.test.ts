import { describe, expect, it } from 'vitest';
import { EnvValidationError, parseApiEnv } from './env';

const valid = { APP_ENV: 'test', DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

describe('parseApiEnv', () => {
  it('applies defaults', () => {
    const env = parseApiEnv(valid);
    expect(env).toMatchObject({ HOST: '0.0.0.0', PORT: 4000, LOG_LEVEL: 'info', CORS_ORIGINS: [] });
  });

  it('splits CORS origins', () => {
    const env = parseApiEnv({ ...valid, CORS_ORIGINS: 'http://a.test, http://b.test,' });
    expect(env.CORS_ORIGINS).toEqual(['http://a.test', 'http://b.test']);
  });

  it('reports every problem at once', () => {
    try {
      parseApiEnv({ APP_ENV: 'nope', PORT: '99999' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const issues = (error as EnvValidationError).issues.join('\n');
      expect(issues).toContain('APP_ENV');
      expect(issues).toContain('DATABASE_URL');
      expect(issues).toContain('PORT');
    }
  });

  it('rejects a non-Postgres database URL', () => {
    expect(() => parseApiEnv({ ...valid, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      EnvValidationError,
    );
  });
});
