module.exports = {
  dependencies: {
    // Keep Android native build stable on this workspace/device matrix.
    'react-native-screens': {
      platforms: { android: null },
    },
    // VisionCamera disabled: ESM resolution bug saat Gradle createExpoConfig.
    // LiveLivenessModal punya fallback graceful. fast-tflite masih butuh nitro-modules.
    'react-native-vision-camera': {
      platforms: { android: null },
    },
    'react-native-vision-camera-face-detector': {
      platforms: { android: null },
    },
    'react-native-nitro-image': {
      platforms: { android: null },
    },
    // nitro-modules butuh BaseReactPackage (RN 0.76+), tapi project pakai RN 0.74.5.
    'react-native-nitro-modules': {
      platforms: { android: null },
    },
    // fast-tflite depends on nitro-modules. faceRecognitionService punya fallback.
    'react-native-fast-tflite': {
      platforms: { android: null },
    },
    'react-native-worklets-core': {
      platforms: { android: null },
    },
    // Sentry: Gradle task naming conflict (dash vs underscore) pada Expo SDK 51+.
    // errorReportingService.ts punya fallback graceful jika native module tidak tersedia.
    '@sentry/react-native': {
      platforms: { android: null },
    },
  },
};
