// Browser condition names steer jose to its browser build.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.unstable_conditionNames = ['browser', 'require', 'react-native'];

module.exports = config;
