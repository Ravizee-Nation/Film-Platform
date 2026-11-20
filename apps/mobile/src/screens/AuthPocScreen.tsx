import { minTouchTarget, spacing, typography } from '@film/ui';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import {
  RESET_CODE_LENGTH,
  authClient,
  fetchMe,
  normalizeResetCode,
  requestRegistration,
  submitResetCode,
} from '../auth-client';
import { usePalette } from '../theme';

// PROTOTYPE (D7 trial): the email flows of docs/testing/d7-auth-device-checklist.md
// against the local API: create account, sign in, who am I, sign out, and recovery.
// Verification and reset links are printed in the API log (no email is sent).
export function AuthPocScreen() {
  const palette = usePalette();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [status, setStatus] = useState('Signed out');
  const input = [styles.input, { borderColor: palette.border, color: palette.text }];
  const button = [styles.button, { borderColor: palette.border }];

  return (
    <ScrollView
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <TextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={input}
      />
      <TextInput
        accessibilityLabel="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={input}
      />
      <Pressable
        accessibilityRole="button"
        style={button}
        onPress={async () => {
          const { error } = await requestRegistration(email);
          setStatus(
            error
              ? `Create account failed: ${error.status}`
              : 'Check the API log for your registration code, then set a password.',
          );
        }}
      >
        <Text style={{ color: palette.text }}>Create account</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={button}
        onPress={async () => {
          const { error } = await authClient.signIn.email({ email, password });
          setStatus(error ? `Sign-in failed: ${error.code ?? error.status}` : 'Signed in');
        }}
      >
        <Text style={{ color: palette.text }}>Sign in</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={button}
        onPress={async () => {
          const result = await fetchMe();
          setStatus(
            result.email ? `Signed in as ${result.email}` : `Not signed in (${result.status})`,
          );
        }}
      >
        <Text style={{ color: palette.text }}>Who am I</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={button}
        onPress={async () => {
          await authClient.signOut();
          setStatus('Signed out');
        }}
      >
        <Text style={{ color: palette.text }}>Sign out</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={button}
        onPress={async () => {
          const { error } = await authClient.requestPasswordReset({ email, redirectTo: '/reset' });
          setStatus(
            error
              ? `Reset request failed: ${error.code ?? error.status}`
              : 'If the account exists, a reset link is in the API log.',
          );
        }}
      >
        <Text style={{ color: palette.text }}>Send reset link</Text>
      </Pressable>
      <TextInput
        accessibilityLabel="Reset code"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        importantForAutofill="no"
        // Android keyboards may still suggest or capitalise in a plain field; this
        // keyboard type turns both off. Codes are case-sensitive.
        keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
        value={resetCode}
        onChangeText={setResetCode}
        style={input}
      />
      <Text style={[typography.small, { color: palette.textMuted }]}>
        {`${normalizeResetCode(resetCode).length}/${RESET_CODE_LENGTH} characters (spaces ignored, capitals matter)`}
      </Text>
      <Pressable
        accessibilityRole="button"
        style={button}
        onPress={async () => {
          const { error } = await submitResetCode(resetCode, password);
          setStatus(
            error
              ? error.code === 'INVALID_TOKEN'
                ? 'Reset failed: INVALID_TOKEN. The code is wrong, used or expired. Check all 24 characters and capitals, or request a new code.'
                : `Reset failed: ${error.code ?? error.status}`
              : 'Password set. Sign in with it now.',
          );
        }}
      >
        <Text style={{ color: palette.text }}>Set new password</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={[typography.body, { color: palette.text }]}>
        {status}
      </Text>
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
  button: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 8,
  },
});
