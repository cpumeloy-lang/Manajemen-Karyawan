module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Wajib untuk react-native-vision-camera frame processors & worklets-core.
      // Harus diletakkan di akhir array plugins.
      'react-native-worklets-core/plugin',
    ],
  };
};
