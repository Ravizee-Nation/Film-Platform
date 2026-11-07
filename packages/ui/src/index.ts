// Design tokens shared by web and mobile. Placeholder brand values until the
// brand is decided (decision D3); swap values here, not in the apps.

export const colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F4',
    text: '#1C1917',
    textMuted: '#57534E',
    border: '#D6D3D1',
    accent: '#1D4ED8',
    success: '#15803D',
    danger: '#B91C1C',
  },
  dark: {
    background: '#0C0A09',
    surface: '#1C1917',
    text: '#FAFAF9',
    textMuted: '#A8A29E',
    border: '#44403C',
    accent: '#60A5FA',
    success: '#4ADE80',
    danger: '#F87171',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorToken = keyof (typeof colors)['light'];

/** 4-point spacing scale. */
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const typography = {
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
} as const;

/** Minimum touch target in points (iOS 44pt; Android 48dp is enforced in the app). */
export const minTouchTarget = 48;
