/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import { Image } from 'react-native';
import { useEffect, useState } from 'react';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader';
import { RGBELoader } from 'three/addons/loaders/RGBELoader';

// Lazy require — nitro-fs native module only present after native rebuild.
// Debug paths never touch it, so iOS dev builds that haven't been re-linked
// can still load this module without crashing.
let _fs: any;
const getFs = () => {
  if (!_fs) _fs = require('react-native-nitro-file-system').default;
  return _fs;
};

// react-native-wgpu@0.5.11 native createImageBitmap Blob path is broken with
// Hermes Blob — swap ImageBitmapLoader to arrayBuffer() once globally.
const IBL: any = (THREE as any).ImageBitmapLoader;
if (!IBL.__rnwgpuPatched) {
  IBL.prototype.load = function (url: string, onLoad: any, _: any, onError: any) {
    fetch(url)
      .then(r => r.arrayBuffer())
      .then(buf => (createImageBitmap as any)(buf))
      .then(onLoad)
      .catch(onError);
    return null;
  };
  IBL.__rnwgpuPatched = true;
}

export interface GLTF {
  animations: THREE.AnimationClip[];
  scene: THREE.Group;
  scenes: THREE.Group[];
  cameras: THREE.Camera[];
  asset: {
    copyright?: string | undefined;
    generator?: string | undefined;
    version?: string | undefined;
    minVersion?: string | undefined;
    extensions?: any;
    extras?: any;
  };
  parser: any;
  userData: Record<string, any>;
}

export const resolveAsset = (mod: ReturnType<typeof require>) => {
  return Image.resolveAssetSource(mod).uri;
};

export const debugManager = new THREE.LoadingManager();

debugManager.onStart = function (url, itemsLoaded, itemsTotal) {
  console.log(
    'Started loading file: ' +
      url +
      '.\nLoaded ' +
      itemsLoaded +
      ' of ' +
      itemsTotal +
      ' files.',
  );
};

debugManager.onProgress = function (url, itemsLoaded, itemsTotal) {
  console.log(
    'Loading file: ' +
      url +
      '.\nLoaded ' +
      itemsLoaded +
      ' of ' +
      itemsTotal +
      ' files.',
  );
};

debugManager.onError = function (url) {
  console.error('There was an error loading ' + url);
};

export const useGeometry = (uri: string) => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    const loader = new THREE.BufferGeometryLoader();
    loader.load(uri, function (geo) {
      setGeometry(geo);
    });
  }, [uri]);
  return geometry;
};

export const useRGBE = (asset: ReturnType<typeof require> | null, bundlePath?: string) => {
  const url = asset != null ? resolveAsset(asset) : null;
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url && !bundlePath) return;
    const loader = new RGBELoader();
    if (__DEV__ || !bundlePath) {
      if (url) loader.load(url, (tex: THREE.Texture) => setTexture(tex));
    } else {
      try {
        const buf = readAssetBuf(bundlePath);
        const tex = loader.parse(buf) as unknown as THREE.Texture;
        setTexture(tex);
      } catch (e: any) {
        console.error('[useRGBE release]', e?.message ?? e);
      }
    }
  }, [url, bundlePath]);
  return texture;
};

export const useGLTF = (asset: ReturnType<typeof require>, bundlePath?: string) => {
  const [GLTF, setGLTF] = useState<GLTF | null>(null);
  const url = resolveAsset(asset);
  useEffect(() => {
    if (__DEV__ || !bundlePath) {
      // Debug: Metro HTTP fetch — canonical wcandillon pattern.
      const loader = new GLTFLoader(debugManager);
      const dracoLoader = new DRACOLoader();
      loader.setDRACOLoader(dracoLoader);
      loader.load(url, (model: GLTF) => setGLTF(model));
    } else {
      // Release: read bundled asset via JSI (nitro-fs asset://), bypass fetch.
      loadGLTFFromBundle(bundlePath).then(setGLTF).catch((e) => {
        console.error('[useGLTF release]', e?.message ?? e);
      });
    }
  }, [url, bundlePath]);
  return GLTF;
};

// Release path: read bundled gltf + bin + textures via react-native-nitro-file-system
// using asset:// scheme. fetch() can't reach asset:// for binary on Android
// release, so we monkey-patch FileLoader (for .bin) and ImageBitmapLoader (for
// textures) to short-circuit on sentinel URIs.
const BIN_SENTINEL = '__rnwgpu_bin__';
const TEX_SENTINEL = '__rnwgpu_tex__';

const readAssetBuf = (rel: string): ArrayBuffer => {
  const buf = getFs().readFileSync('asset://' + rel) as any;
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

async function loadGLTFFromBundle(bundlePath: string): Promise<GLTF> {
  const slash = bundlePath.lastIndexOf('/');
  const dir = slash >= 0 ? bundlePath.slice(0, slash + 1) : '';

  const gltfText = getFs().readFileSync('asset://' + bundlePath, 'utf8') as string;
  const gltfJson = JSON.parse(gltfText);

  // Pre-load all .bin buffers; rewrite uri to sentinel
  const binBufs: Record<string, ArrayBuffer> = {};
  for (const b of gltfJson.buffers ?? []) {
    if (b.uri && !b.uri.startsWith('data:')) {
      const key = BIN_SENTINEL + b.uri;
      binBufs[key] = readAssetBuf(dir + b.uri);
      b.uri = key;
    }
  }
  // Rewrite image uris to sentinel; real read happens lazily in IBL.load
  for (const img of gltfJson.images ?? []) {
    if (img.uri && !img.uri.startsWith('data:')) {
      img.uri = TEX_SENTINEL + dir + img.uri;
    }
  }

  const FL: any = (THREE as any).FileLoader;
  const origFLLoad = FL.prototype.load;
  FL.prototype.load = function (url: string, onLoad: any, onProgress: any, onError: any) {
    if (typeof url === 'string') {
      const i = url.indexOf(BIN_SENTINEL);
      if (i >= 0) {
        const key = url.slice(i);
        setTimeout(() => onLoad && onLoad(binBufs[key]), 0);
        return;
      }
    }
    return origFLLoad.call(this, url, onLoad, onProgress, onError);
  };
  const origIBLLoad = IBL.prototype.load;
  IBL.prototype.load = function (url: string, onLoad: any, _: any, onError: any) {
    if (typeof url === 'string') {
      const i = url.indexOf(TEX_SENTINEL);
      if (i >= 0) {
        const rel = url.slice(i + TEX_SENTINEL.length);
        try {
          const buf = readAssetBuf(rel);
          (createImageBitmap as any)(buf).then(onLoad).catch(onError);
        } catch (e) {
          onError && onError(e);
        }
        return null;
      }
    }
    // Fallback (shouldn't happen in release-bundle flow)
    fetch(url).then(r => r.arrayBuffer()).then(buf => (createImageBitmap as any)(buf)).then(onLoad).catch(onError);
    return null;
  };

  try {
    const loader = new GLTFLoader();
    return await new Promise<GLTF>((resolve, reject) => {
      loader.parse(JSON.stringify(gltfJson), '', resolve as any, reject);
    });
  } finally {
    FL.prototype.load = origFLLoad;
    IBL.prototype.load = origIBLLoad;
  }
}
