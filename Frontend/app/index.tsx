// Entry point screen - redirects to login or main tabs based on auth state
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  const { session, isLoading } = useAuth();

  // Show loading while checking session
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Redirect authenticated users to home tab, otherwise to login
  if (session) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/login" />;
}
