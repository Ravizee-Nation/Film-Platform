import { colors } from '@film/ui';
import { useColorScheme } from 'react-native';

export function usePalette() {
  return useColorScheme() === 'dark' ? colors.dark : colors.light;
}
