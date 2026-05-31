const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);


// 1. Prefer platform/native files before generic TS/JS.
const platformExts = ['android.ts', 'android.tsx', 'native.ts', 'native.tsx', 'android.js', 'android.jsx', 'native.js', 'native.jsx'];
config.resolver.sourceExts = [
  ...platformExts,
  ...config.resolver.sourceExts.filter((ext) => !platformExts.includes(ext)),
  'mjs',
  'cjs',
];

// 2. Watch all files within the monorepo that mobile depends on
config.watchFolders = [
  path.resolve(workspaceRoot, 'packages'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Resolve modules from both project and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 4. Enable Package Exports for React 19 / Firebase v24 support
config.resolver.unstable_enablePackageExports = true;

// 5. Prioritize React Native entry points
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// 6. Ensure single instance and correct resolution of core libraries
config.resolver.extraNodeModules = {
  react: path.resolve(workspaceRoot, 'node_modules/react'),
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
  '@react-navigation/native': path.resolve(workspaceRoot, 'node_modules/@react-navigation/native'),
  // Force resolution for firebase packages to root
  '@react-native-firebase/app': path.resolve(workspaceRoot, 'node_modules/@react-native-firebase/app'),
  '@react-native-firebase/auth': path.resolve(workspaceRoot, 'node_modules/@react-native-firebase/auth'),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform !== 'web' &&
    moduleName === './ensureNativeModulesAreInstalled' &&
    context.originModulePath.includes(`${path.sep}expo-modules-core${path.sep}src${path.sep}`)
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(
        workspaceRoot,
        'node_modules/expo-modules-core/src/ensureNativeModulesAreInstalled.native.ts'
      ),
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
