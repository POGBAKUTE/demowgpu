const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const threePackagePath = path.resolve(__dirname, 'node_modules/three');

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.assetExts = [
  ...defaultConfig.resolver.assetExts,
  'obj', 'mtl', 'glb', 'gltf', 'bin', 'hdr', 'wav', 'mp3',
];

defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('three/addons/')) {
    return {
      filePath: path.resolve(
        threePackagePath,
        `examples/jsm/${moduleName.replace('three/addons/', '')}.js`,
      ),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'three' || moduleName === 'three/webgpu') {
    return {
      filePath: path.resolve(threePackagePath, 'build/three.webgpu.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'three/tsl') {
    return {
      filePath: path.resolve(threePackagePath, 'build/three.tsl.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = mergeConfig(defaultConfig, {});
