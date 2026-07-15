module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated v4: worklets plugin moved to separate package — MUST be last
      'react-native-worklets/plugin',
    ],
  };
};
