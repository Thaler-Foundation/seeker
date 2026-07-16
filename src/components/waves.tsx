// Login backdrop image captured from the thaler.finance hero.

import { ImageBackground, StyleSheet } from 'react-native';

export function Waves() {
  return (
    <ImageBackground
      source={require('../../assets/images/hero-waves.png')}
      resizeMode="cover"
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
    />
  );
}
