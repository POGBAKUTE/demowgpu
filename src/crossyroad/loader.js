// RN loader — OBJ geometry + PNG texture.
// Debug: fetch via Metro (Image.resolveAssetSource → http URL).
// Release: react-native-nitro-file-system (asset://crossy/<path>) since
// fetch() can't reach asset:// URIs for binary files on Android release.
import 'react-native-wgpu'; // side-effect: polyfill createImageBitmap
import { Image } from 'react-native';
import { OBJLoader } from 'three/addons/loaders/OBJLoader';
import {
  Mesh,
  MeshLambertMaterial,
  SRGBColorSpace,
  Texture,
} from 'three';
import { OBJ_MAP, TEX_MAP, TEX_PATH_MAP } from './asset-map.js';

const _geoCache = new Map();
const _texCache = new Map();

// Lazy require so iOS debug builds without nitro-fs linked don't crash on import.
let _fs;
const getFs = () => {
  if (!_fs) _fs = require('react-native-nitro-file-system').default;
  return _fs;
};
const readAssetBuf = (rel) => {
  const buf = getFs().readFileSync('asset://crossy/' + rel);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

async function loadTexture(modelPath) {
  if (_texCache.has(modelPath)) return _texCache.get(modelPath);
  try {
    let buf;
    if (__DEV__) {
      const handle = TEX_MAP[modelPath];
      if (!handle) return null;
      const src = Image.resolveAssetSource(handle);
      if (!src?.uri) return null;
      buf = await (await fetch(src.uri)).arrayBuffer();
    } else {
      const path = TEX_PATH_MAP[modelPath];
      if (!path) return null;
      buf = readAssetBuf(path);
    }
    const bitmap = await createImageBitmap(buf);
    const tex = new Texture(bitmap);
    tex.needsUpdate = true;
    tex.colorSpace = SRGBColorSpace;
    _texCache.set(modelPath, tex);
    return tex;
  } catch (e) {
    console.warn('[tex] FAILED', modelPath, e?.message ?? String(e));
    return null;
  }
}

async function loadGeometryGroup(modelPath) {
  if (_geoCache.has(modelPath)) return _geoCache.get(modelPath);
  try {
    let text;
    if (__DEV__) {
      const handle = OBJ_MAP[modelPath];
      if (!handle) {
        console.warn('[loader] missing OBJ for', modelPath);
        return null;
      }
      const src = Image.resolveAssetSource(handle);
      if (!src?.uri) return null;
      text = await (await fetch(src.uri)).text();
    } else {
      // modelPath IS the relative path under crossy/
      text = getFs().readFileSync('asset://crossy/' + modelPath, 'utf8');
    }
    const group = new OBJLoader().parse(text);
    _geoCache.set(modelPath, group);
    return group;
  } catch (e) {
    console.warn('[obj] FAILED', modelPath, e?.message ?? String(e));
    return null;
  }
}

export async function loadModel(modelPath /* texturePath ignored — paired via TEX_MAP */) {
  const [group, texture] = await Promise.all([
    loadGeometryGroup(modelPath),
    loadTexture(modelPath),
  ]);
  if (!group) return null;

  const clone = group.clone(true);
  clone.traverse((child) => {
    if (child instanceof Mesh) {
      // Lambert is ~2-3× faster than Standard (PBR) — fine for low-poly Crossy aesthetic.
      child.material = new MeshLambertMaterial({
        map: texture ?? null,
        color: texture ? 0xffffff : 0xbbbbbb,
      });
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return clone;
}

// Preload all OBJ + textures so subsequent loadModel() hits cache.
// onProgress(loaded, total) is called after each asset finishes.
export async function preloadAll(onProgress) {
  const paths = Object.keys(OBJ_MAP);
  const total = paths.length;
  let loaded = 0;
  await Promise.all(
    paths.map(async (p) => {
      await Promise.all([loadGeometryGroup(p), loadTexture(p)]);
      loaded += 1;
      onProgress?.(loaded, total);
    }),
  );
}
