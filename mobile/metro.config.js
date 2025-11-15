const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Workaround for Node.js 22 compatibility
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
};

module.exports = config;
