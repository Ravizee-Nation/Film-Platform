import { describe, expect, it } from 'vitest';
import { isVersionSupported, metaResponseSchema, readyResponseSchema } from './system';

describe('isVersionSupported', () => {
  it.each([
    ['1.0.0', '1.0.0', true],
    ['1.2.0', '1.1.9', true],
    ['2.0.0', '1.9.9', true],
    ['1.0.0', '1.0.1', false],
    ['0.9.9', '1.0.0', false],
  ])('%s against minimum %s is %s', (version, minimum, expected) => {
    expect(isVersionSupported(version, minimum)).toBe(expected);
  });

  it('rejects malformed versions', () => {
    expect(() => isVersionSupported('1.0', '1.0.0')).toThrow();
  });
});

describe('response schemas', () => {
  it('accepts a valid meta response', () => {
    expect(
      metaResponseSchema.parse({
        apiVersion: '0.1.0',
        environment: 'test',
        minimumClientVersion: '0.1.0',
      }),
    ).toBeTruthy();
  });

  it('rejects an unknown ready status', () => {
    expect(() =>
      readyResponseSchema.parse({ status: 'maybe', checks: { database: 'ok' } }),
    ).toThrow();
  });
});
