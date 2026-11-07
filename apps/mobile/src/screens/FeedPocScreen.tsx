import { spacing, typography } from '@film/ui';
import { FlashList } from '@shopify/flash-list';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../theme';

// PROTOTYPE: synthetic data only, to measure scroll performance on real phones.
export interface FeedItem {
  id: string;
  title: string;
  body: string;
}

export const FEED_ITEMS: FeedItem[] = Array.from({ length: 1000 }, (_, index) => ({
  id: String(index),
  title: `Post ${index + 1}`,
  body:
    index % 3 === 0
      ? 'Casting call: short film, two roles, shooting next month.'
      : 'Portfolio update with new stills.',
}));

export function FeedPocScreen() {
  const palette = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <FlashList
        data={FEED_ITEMS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            accessible
            accessibilityLabel={`${item.title}. ${item.body}`}
            style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            <Text style={[typography.body, styles.title, { color: palette.text }]}>
              {item.title}
            </Text>
            <Text style={[typography.small, { color: palette.textMuted }]}>{item.body}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 8,
  },
  title: { fontWeight: '600' },
});
