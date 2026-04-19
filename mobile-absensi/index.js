// Urutan impor penting untuk development build Android + Hermes:
// https://docs.expo.dev/develop/development-builds/use-development-builds/
import 'react-native-gesture-handler';
import 'expo-dev-client';
import 'react-native-url-polyfill/auto';

import registerRootComponent from 'expo/build/launch/registerRootComponent';
import App from './App';

registerRootComponent(App);
