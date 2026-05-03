const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.resolverMainFields = [
  'react-native',
  'native',
  'main',
  'module',
];

config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Use forward-slash-safe regex patterns for Windows
config.resolver.blockList = [
  /expo-router.build.rsc.router.client\.js$/,
  /expo-router.vendor.react-helmet-async.lib.index\.esm\.js$/,
  /expo-router.vendor.react-helmet-async.lib.index\.js$/,
];

module.exports = withNativeWind(config, { input: './global.css' });