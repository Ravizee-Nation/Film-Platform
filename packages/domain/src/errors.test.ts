import { describe, expect, it } from 'vitest';
import { buildError, ERROR_CODES, ERROR_STATUS, errorResponseSchema } from './errors';

describe('error model', () => {
  it('maps every code to an HTTP status', () => {
    for (const code of ERROR_CODES) {
      expect(ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });

  it('builds a response that matches the schema', () => {
    const body = buildError('NOT_FOUND', 'Route not found', 'req-1');
    expect(errorResponseSchema.parse(body)).toEqual(body);
    expect(body.error).not.toHaveProperty('details');
  });

  it('includes details only when given', () => {
    const body = buildError('VALIDATION_FAILED', 'Bad input', 'req-2', [{ path: 'name' }]);
    expect(body.error.details).toEqual([{ path: 'name' }]);
  });
});
