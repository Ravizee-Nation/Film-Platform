import { minTouchTarget, spacing, typography } from '@film/ui';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { usePalette } from '../theme';

// PROTOTYPE: checks that VoiceOver and TalkBack announce every control. It submits nothing.
export function FormPocScreen() {
  const palette = usePalette();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [available, setAvailable] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const input = [styles.input, { borderColor: palette.border, color: palette.text }];

  return (
    // ScrollView so the form stays reachable when the keyboard is open: iOS insets it
    // for the keyboard automatically; Android resizes the window (Expo default).
    <ScrollView
      testID="form-scroll"
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <Text nativeID="name-label" style={[typography.body, { color: palette.text }]}>
        Full name
      </Text>
      <TextInput
        accessibilityLabel="Full name"
        accessibilityLabelledBy="name-label"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        style={input}
      />

      <Text nativeID="role-label" style={[typography.body, { color: palette.text }]}>
        Primary role
      </Text>
      <TextInput
        accessibilityLabel="Primary role"
        accessibilityHint="For example actor, director or cinematographer"
        accessibilityLabelledBy="role-label"
        value={role}
        onChangeText={setRole}
        style={input}
      />

      <View style={styles.row}>
        <Text style={[typography.body, { color: palette.text, flex: 1 }]}>Available for work</Text>
        <Switch
          accessibilityLabel="Available for work"
          value={available}
          onValueChange={setAvailable}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: name.length === 0 }}
        disabled={name.length === 0}
        onPress={() => setSubmitted(true)}
        style={[
          styles.button,
          { backgroundColor: name.length === 0 ? palette.border : palette.accent },
        ]}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Save</Text>
      </Pressable>

      {submitted ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ color: palette.success }}
        >
          Saved locally (prototype, nothing was sent).
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg, gap: spacing.sm },
  input: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: minTouchTarget },
  button: {
    minHeight: minTouchTarget,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
});
