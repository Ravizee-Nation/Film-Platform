import { render } from '@testing-library/react-native';
import { stackScreenOptions } from '../navigation';

// WCAG relative luminance and contrast ratio for #RRGGBB colours.
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('stackScreenOptions', () => {
  it.each(['light', 'dark'] as const)('gives the %s header an opaque background', (scheme) => {
    const options = stackScreenOptions(scheme);
    // A solid background keeps the iOS 26 header non-translucent, so content is inset below it.
    expect(options.headerTransparent).toBe(false);
    expect(options.headerStyle.backgroundColor).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it.each(['light', 'dark'] as const)('keeps the %s header title readable (WCAG AA)', (scheme) => {
    const options = stackScreenOptions(scheme);
    expect(options.headerTitleStyle.color).toBe(options.headerTintColor);
    expect(
      contrast(options.headerTitleStyle.color, options.headerStyle.backgroundColor),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('uses different header colours for light and dark mode', () => {
    expect(stackScreenOptions('dark').headerStyle.backgroundColor).not.toBe(
      stackScreenOptions('light').headerStyle.backgroundColor,
    );
  });
});

const mockStack = jest.fn();
jest.mock('expo-router', () => {
  const Stack = (props: { screenOptions: unknown }) => {
    mockStack(props.screenOptions);
    return null;
  };
  Stack.Screen = () => null;
  return { Stack };
});

describe('RootLayout', () => {
  beforeEach(() => mockStack.mockClear());

  it.each(['light', 'dark'] as const)(
    'applies the shared header options in %s mode',
    async (scheme) => {
      const rn = jest.requireActual('react-native');
      const spy = jest.spyOn(rn, 'useColorScheme').mockReturnValue(scheme);
      const { default: RootLayout } = jest.requireActual('../../app/_layout');
      await render(<RootLayout />);
      expect(mockStack).toHaveBeenLastCalledWith(stackScreenOptions(scheme));
      spy.mockRestore();
    },
  );
});
