import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/theme';

function RootNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/(app)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 260,
    height: 120,
    marginBottom: 24,
  },
});
