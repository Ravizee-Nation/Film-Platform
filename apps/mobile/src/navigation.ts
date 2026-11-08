import { colors, type ColorScheme } from '@film/ui';

/**
 * Stack header options shared by every screen.
 *
 * Why an explicit, opaque header: on iOS 26 (Liquid Glass), expo-router treats a
 * header with no background as a transparent system bar. A transparent header is
 * translucent, so react-native-screens lays content out underneath it with no top
 * inset, and the title colour is left to the system. Giving the header a solid
 * background makes it non-translucent; react-native-screens then insets the content
 * below it with its own SafeAreaView. Android headers are already opaque, so no
 * extra padding is added there.
 */
export function stackScreenOptions(scheme: ColorScheme) {
  const palette = colors[scheme];
  return {
    headerTransparent: false,
    headerStyle: { backgroundColor: palette.surface },
    headerTintColor: palette.text,
    headerTitleStyle: { color: palette.text },
    contentStyle: { backgroundColor: palette.background },
  };
}
