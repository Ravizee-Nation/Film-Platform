import type { ExpoConfig } from 'expo/config';

type Variant = 'development' | 'staging' | 'production';

// APP_ENV picks the variant. Bundle IDs are placeholders until decision D3
// (app name and IDs) is approved; they must change before the first store build.
const BASE_ID = 'com.filmplatform.app';
const variant = (process.env.APP_ENV ?? 'development') as Variant;

const VARIANTS: Record<Variant, { name: string; idSuffix: string }> = {
  development: { name: 'Film Platform (Dev)', idSuffix: '.dev' },
  staging: { name: 'Film Platform (Staging)', idSuffix: '.staging' },
  production: { name: 'Film Platform', idSuffix: '' },
};

if (!(variant in VARIANTS)) {
  throw new Error(`APP_ENV must be one of ${Object.keys(VARIANTS).join(', ')}; got "${variant}".`);
}
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
  extra: { appEnv: variant },
};

export default config;
