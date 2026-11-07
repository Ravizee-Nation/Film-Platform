import { minTouchTarget, spacing, typography } from '@film/ui';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { apiBaseUrl, fetchApiStatus, type ApiStatus } from '../api';
import { usePalette } from '../theme';

export function StatusScreen({ check = fetchApiStatus }: { check?: () => Promise<ApiStatus> }) {
  const palette = usePalette();
  const [status, setStatus] = useState<ApiStatus | 'checking'>('checking');

  const refresh = useCallback(() => {
    setStatus('checking');
    void check().then(setStatus);
  }, [check]);

  useEffect(refresh, [refresh]);

  const label = status === 'checking' ? 'API: checking…' : `API: ${status}`;
  const color =
    status === 'ok'
      ? palette.success
      : status === 'unavailable'
        ? palette.danger
        : palette.textMuted;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Text accessibilityRole="header" style={[typography.title, { color: palette.text }]}>
        Film Platform
      </Text>
      <Text accessibilityLiveRegion="polite" testID="api-status" style={[styles.status, { color }]}>
        {label}
      </Text>
      <Text style={[typography.small, { color: palette.textMuted }]}>{apiBaseUrl()}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={refresh}
        style={[styles.button, { borderColor: palette.border }]}
      >
        <Text style={{ color: palette.text }}>Check again</Text>
      </Pressable>

      <Text style={[typography.small, styles.section, { color: palette.textMuted }]}>
        Proof of concept (prototype)
      </Text>
      <Link href="/poc/feed" asChild>
        <Pressable
          accessibilityRole="link"
          style={[styles.button, { borderColor: palette.border }]}
        >
          <Text style={{ color: palette.accent }}>1,000-item feed scroll test</Text>
        </Pressable>
      </Link>
      <Link href="/poc/form" asChild>
        <Pressable
          accessibilityRole="link"
          style={[styles.button, { borderColor: palette.border }]}
        >
          <Text style={{ color: palette.accent }}>Screen reader form test</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  status: { ...typography.body, fontWeight: '600' },
  section: { marginTop: spacing.lg },
  button: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 8,
  },
});
