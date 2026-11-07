import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Status' }} />
        <Stack.Screen name="poc/feed" options={{ title: 'Feed scroll test' }} />
        <Stack.Screen name="poc/form" options={{ title: 'Form accessibility test' }} />
      </Stack>
    </>
  );
}
