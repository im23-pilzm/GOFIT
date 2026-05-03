import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';
import 'react-native-reanimated'
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../context/AuthContext'
import { LanguageProvider } from '../context/LanguageContext'
import { useLanguage } from '../hooks/useLanguage'
import { useAuth } from '../hooks/useAuth'

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { language } = useLanguage();
  const loginTitle = language === 'de-CH' ? 'Anmelden' : 'Login';
  const registerTitle = language === 'de-CH' ? 'Registrieren' : 'Register';

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false }}
        redirect={!session}
      />
      <Stack.Screen
        name="current-workout"
        options={{ headerShown: false }}
        redirect={!session}
      />
      <Stack.Screen
        name="exercise-select"
        options={{ headerShown: false }}
        redirect={!session}
      />
      <Stack.Screen
        name="create-exercise"
        options={{ headerShown: false }}
        redirect={!session}
      />
      <Stack.Screen
        name="equipment-select"
        options={{ headerShown: false }}
        redirect={!session}
      />
      <Stack.Screen
        name="muscle-group-select"
        options={{ headerShown: false }}
        redirect={!session}
      />
      <Stack.Screen name="login" options={{ title: loginTitle }} redirect={!!session} />
      <Stack.Screen name="register" options={{ title: registerTitle }} redirect={!!session} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <LanguageProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </LanguageProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}