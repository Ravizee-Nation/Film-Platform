import type { ExpoConfig } from 'expo/config';
import type * as AppConfig from '../../app.config';

type ConfigModule = typeof AppConfig;

// Loads app.config.ts fresh with the given environment, as Expo does at startup.
function loadConfig(env: Record<string, string | undefined>): {
  module: ConfigModule;
  config: ExpoConfig;
} {
  const saved = { ...process.env };
  for (const key of ['APP_ENV', 'APP_VARIANT']) delete process.env[key];
  Object.assign(process.env, env);
  try {
    let loaded: ConfigModule | undefined;
    jest.isolateModules(() => {
      loaded = jest.requireActual<ConfigModule>('../../app.config');
    });
    return { module: loaded!, config: loaded!.default };
  } finally {
    process.env = saved;
  }
}

describe('mobile app config', () => {
  it("ignores the API's APP_ENV from the shared .env file (regression)", () => {
    // Device testing on 2026-11-13: sourcing .env (APP_ENV=local) and starting Expo
    // directly crashed the mobile config. The mobile app must not read APP_ENV.
    const { config } = loadConfig({ APP_ENV: 'local' });
    expect(config.name).toBe('Film Platform (Dev)');
    expect(config.ios?.bundleIdentifier).toBe('com.filmplatform.app.dev');
  });

  it.each([
    ['development', 'Film Platform (Dev)', 'com.filmplatform.app.dev'],
    ['staging', 'Film Platform (Staging)', 'com.filmplatform.app.staging'],
    ['production', 'Film Platform', 'com.filmplatform.app'],
  ])('APP_VARIANT=%s selects its name and bundle IDs', (variant, name, id) => {
    const { config } = loadConfig({ APP_VARIANT: variant, APP_ENV: 'local' });
    expect(config.name).toBe(name);
    expect(config.ios?.bundleIdentifier).toBe(id);
    expect(config.android?.package).toBe(id);
    expect(config.extra).toEqual({ appVariant: variant });
  });

  it('defaults to development when APP_VARIANT is unset', () => {
    const { module } = loadConfig({});
    expect(module.resolveVariant({})).toBe('development');
  });

  it('rejects an unknown APP_VARIANT with a clear message', () => {
    const { module } = loadConfig({});
    expect(() => module.resolveVariant({ APP_VARIANT: 'local' })).toThrow(
      'APP_VARIANT must be one of development, staging, production; got "local".',
    );
  });
});
