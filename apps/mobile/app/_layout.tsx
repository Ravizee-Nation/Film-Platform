import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { stackScreenOptions } from '../src/navigation';

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={stackScreenOptions(scheme)}>
        <Stack.Screen name="index" options={{ title: 'Status' }} />
        <Stack.Screen name="poc/feed" options={{ title: 'Feed scroll test' }} />
        <Stack.Screen name="poc/form" options={{ title: 'Form accessibility test' }} />
      </Stack>
    </>
  );
}
