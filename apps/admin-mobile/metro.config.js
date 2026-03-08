const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [...config.watchFolders, workspaceRoot];

// 2. Let Metro look for modules in both the project's and workspace's node_modules
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force all react-related modules to resolve from the workspace root
//    where npm hoisted them, ensuring a single copy is used.
config.resolver.extraNodeModules = {
    react: path.resolve(workspaceRoot, 'node_modules/react'),
    'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
    'react-dom': path.resolve(workspaceRoot, 'node_modules/react-dom'),
};

module.exports = config;
