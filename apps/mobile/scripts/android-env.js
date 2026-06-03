const { spawnSync } = require('node:child_process');
const path = require('node:path');

const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');
const expoCli = path.join(repoRoot, 'node_modules', 'expo', 'bin', 'cli');
const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const validEnvironments = new Set(['development', 'staging', 'production']);
const validActions = new Set(['prebuild', 'run', 'assemble']);

const [environment, action] = process.argv.slice(2);

if (!validEnvironments.has(environment) || !validActions.has(action)) {
  console.error('Usage: node scripts/android-env.js <development|staging|production> <prebuild|run|assemble>');
  process.exit(1);
}

const env = {
  ...process.env,
  APP_ENV: environment,
  CI: '1',
  EXPO_PUBLIC_APP_ENV: environment,
  SENTRY_DISABLE_AUTO_UPLOAD: 'true',
  SENTRY_DISABLE_NATIVE_DEBUG_UPLOAD: 'true',
};

if (environment !== 'development') {
  env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;
  env.EXPO_PUBLIC_CDN_URL = process.env.EXPO_PUBLIC_CDN_URL;
  delete env.EXPO_PUBLIC_USE_LOCAL_CDN;
}

function run(command, args, cwd = appDir, shell = false) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    env,
    shell,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run(process.execPath, [expoCli, 'prebuild', '--platform', 'android', '--clean']);

// Patch build.gradle to ensure Metro is run with correct project root and configure APK splits
const fs = require('node:fs');
const buildGradlePath = path.join(appDir, 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  let content = fs.readFileSync(buildGradlePath, 'utf8');
  
  // 1. Set project root
  content = content.replace('// root = file("../../")', 'root = file("../../")');
  
  // 2. Add APK splits block for architecture split & universal builds
  if (!content.includes('splits {')) {
    const splitsBlock = `
    splits {
        abi {
            enable ${environment !== 'development'}
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
            universalApk true
        }
    }`;
    content = content.replace(
      'compileSdk rootProject.ext.compileSdkVersion',
      'compileSdk rootProject.ext.compileSdkVersion\n' + splitsBlock
    );
  }
  
  fs.writeFileSync(buildGradlePath, content, 'utf8');
  console.log(`Successfully patched build.gradle to set root = file("../../") and configure APK splits (enabled: ${environment !== 'development'})`);
}

if (action === 'prebuild') {
  process.exit(0);
}

if (action === 'run') {
  const args = [expoCli, 'run:android'];
  if (environment !== 'development') args.push('--variant', 'release');
  run(process.execPath, args);
  process.exit(0);
}

const gradleTask = environment === 'development' ? 'app:assembleDebug' : 'app:assembleRelease';
run(gradleCommand, [gradleTask], path.join(appDir, 'android'), process.platform === 'win32');
