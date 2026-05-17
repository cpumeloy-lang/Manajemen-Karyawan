#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const androidAppDir = path.join(projectRoot, 'android', 'app');
const appJsonPath = path.join(projectRoot, 'app.json');
const easJsonPath = path.join(projectRoot, 'eas.json');
const packageJsonPath = path.join(projectRoot, 'package.json');
const projectGradlePropertiesPath = path.join(projectRoot, 'android', 'gradle.properties');
const homeGradlePropertiesPath = path.join(os.homedir(), '.gradle', 'gradle.properties');

const red = '\x1b[31m';
const yellow = '\x1b[33m';
const green = '\x1b[32m';
const reset = '\x1b[0m';

let failures = 0;
let warnings = 0;

function logPass(message) {
  console.log(`${green}✅${reset} ${message}`);
}

function logWarn(message) {
  console.log(`${yellow}⚠️ ${reset} ${message}`);
  warnings += 1;
}

function logFail(message) {
  console.log(`${red}❌${reset} ${message}`);
  failures += 1;
}

function checkFile(filePath, label) {
  if (fs.existsSync(filePath)) {
    logPass(`${label} exists`);
    return true;
  }
  logFail(`${label} missing: ${path.relative(projectRoot, filePath)}`);
  return false;
}

function readPropertiesFile(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) {
    return result;
  }

  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) {
      result[key] = value;
    }
  }

  return result;
}

const projectGradleProperties = readPropertiesFile(projectGradlePropertiesPath);
const homeGradleProperties = readPropertiesFile(homeGradlePropertiesPath);

function readReleaseSigningValue(name) {
  return (
    process.env[name] ||
    projectGradleProperties[name] ||
    homeGradleProperties[name] ||
    ''
  ).trim();
}

console.log('\nAndroid release readiness check\n');

checkFile(appJsonPath, 'app.json');
checkFile(easJsonPath, 'eas.json');
checkFile(packageJsonPath, 'package.json');
checkFile(path.join(androidAppDir, 'build.gradle'), 'android/app/build.gradle');
checkFile(path.join(androidAppDir, 'src', 'main', 'AndroidManifest.xml'), 'AndroidManifest.xml');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
const expo = appJson.expo || {};

if (expo.android?.package) {
  logPass(`Android package: ${expo.android.package}`);
} else {
  logFail('Android package is not set in app.json');
}

if (expo.plugins?.includes('expo-secure-store')) {
  logPass('expo-secure-store plugin configured');
} else {
  logWarn('expo-secure-store plugin is not configured');
}

if (expo.plugins?.includes('react-native-fast-tflite')) {
  logPass('react-native-fast-tflite plugin configured');
} else {
  logWarn('react-native-fast-tflite plugin is not configured');
}

const releaseKeystore = readReleaseSigningValue('HRMS_RELEASE_STORE_FILE');
const releaseStorePassword = readReleaseSigningValue('HRMS_RELEASE_STORE_PASSWORD');
const releaseKeyAlias = readReleaseSigningValue('HRMS_RELEASE_KEY_ALIAS');
const releaseKeyPassword = readReleaseSigningValue('HRMS_RELEASE_KEY_PASSWORD');

if (releaseKeystore) {
  const resolvedKeystore = path.isAbsolute(releaseKeystore)
    ? releaseKeystore
    : path.resolve(projectRoot, releaseKeystore);
  if (fs.existsSync(resolvedKeystore)) {
    logPass(`Release keystore found: ${resolvedKeystore}`);
  } else {
    logFail(`Release keystore file not found: ${resolvedKeystore}`);
  }
} else {
  logWarn('Release keystore is not configured; production APK will still fall back to debug signing');
}

if (releaseStorePassword && releaseKeyAlias && releaseKeyPassword) {
  logPass('Release keystore credentials are configured');
} else if (releaseKeystore) {
  logWarn('Release keystore file set, but one or more credentials are missing');
}

const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf-8'));
const productionBuild = easJson.build?.production || {};
const productionAabBuild = easJson.build?.['production-aab'] || {};

if (productionBuild.android?.buildType === 'apk') {
  logPass('EAS production profile produces APK for internal distribution');
} else {
  logWarn('EAS production profile does not explicitly produce APK');
}

if (productionAabBuild.android?.buildType === 'app-bundle') {
  logPass('EAS production-aab profile exists for store-ready AAB');
} else {
  logWarn('EAS production-aab profile missing or misconfigured');
}

console.log('\nSummary');
console.log(`  passed: ${Math.max(0, 10 - warnings - failures)}`);
console.log(`  warnings: ${warnings}`);
console.log(`  failures: ${failures}`);

if (failures > 0) {
  process.exit(2);
}

process.exit(warnings > 0 ? 1 : 0);
