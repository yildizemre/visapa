import React from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions, ActivityIndicator } from 'react-native';

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Yükleniyor...' }) => {
  const { width } = useWindowDimensions();
  const logoSize = Math.min(width * 0.4, 160);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../vislivis_logo.png')}
        style={[styles.logo, { width: logoSize, height: logoSize / 2 }]}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#3b82f6" style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#94a3b8',
  },
});

export default LoadingOverlay;
