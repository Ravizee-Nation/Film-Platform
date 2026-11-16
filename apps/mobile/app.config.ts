import type { ExpoConfig } from 'expo/config';

export type AppVariant = 'development' | 'staging' | 'production';

// APP_VARIANT picks the build variant. It is deliberately not APP_ENV: the API
// reads APP_ENV with different values (local, test, staging, production), and
// both share the repository's .env file. Bundle IDs are placeholders until
// decision D3 (app name and IDs) is approved; they must change before the first
// store build.
const BASE_ID = 'com.filmplatform.app';

const VARIANTS: Record<AppVariant, { name: string; idSuffix: string }> = {
  development: { name: 'Film Platform (Dev)', idSuffix: '.dev' },
  staging: { name: 'Film Platform (Staging)', idSuffix: '.staging' },
  production: { name: 'Film Platform', idSuffix: '' },
};

export function resolveVariant(env: Record<string, string | undefined>): AppVariant {
  const variant = env.APP_VARIANT ?? 'development';
  if (!(variant in VARIANTS)) {
    throw new Error(
      `APP_VARIANT must be one of ${Object.keys(VARIANTS).join(', ')}; got "${variant}".`,
    );
  }
  return variant as AppVariant;
}

const variant = resolveVariant(process.env);
const { name, idSuffix } = VARIANTS[variant];

const config: ExpoConfig = {
  name,
  slug: 'film-platform',
  scheme: 'filmplatform',
  version: '0.1.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: `${BASE_ID}${idSuffix}`,
    supportsTablet: true,
  },
  android: {
    package: `${BASE_ID}${idSuffix}`,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  plugins: ['expo-router'],
  experiments: { typedRoutes: true },
  extra: { appVariant: variant },
};

export default config;
