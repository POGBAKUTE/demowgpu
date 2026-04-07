const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const threePackagePath = path.resolve(__dirname, 'node_modules/three');
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'obj',
  'glb',
  'gltf',
  'bin',
  'hdr',
];

// Redirect Skia's WebGPUViewNativeComponent to a stub to avoid duplicate registration
// with react-native-wgpu (both register "WebGPUView")
config.resolver.resolveRequest = (context, moduleName, platform) => {
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

  if (
    moduleName.includes('WebGPUViewNativeComponent') &&
    context.originModulePath.includes('@shopify/react-native-skia')
  ) {
    return {
      filePath: path.resolve(__dirname, 'src/stubs/webgpu-view-stub.js'),
      type: 'sourceFile',
    };
  }

  // Fall back to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
