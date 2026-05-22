// RN loader — OBJ geometry + PNG texture via createImageBitmap polyfill
// from react-native-wgpu (same path GLTFLoader uses for the Michelle demo).
import 'react-native-wgpu'; // side-effect: polyfill createImageBitmap
import { Image } from 'react-native';
import { OBJLoader } from 'three/addons/loaders/OBJLoader';
import {
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Texture,
} from 'three';

import { OBJ_MAP, TEX_MAP } from './asset-map.js';

const _geoCache = new Map();
const _texCache = new Map();

async function loadTexture(modelPath) {
  if (_texCache.has(modelPath)) return _texCache.get(modelPath);
  const handle = TEX_MAP[modelPath];
  if (!handle) return null;
  const src = Image.resolveAssetSource(handle);
  if (!src?.uri) return null;

  try {
    const res = await fetch(src.uri);
    const buf = await res.arrayBuffer();
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
  const handle = OBJ_MAP[modelPath];
  if (!handle) {
    console.warn('[loader] missing OBJ for', modelPath);
    return null;
  }
  const src = Image.resolveAssetSource(handle);
  if (!src?.uri) return null;
  const text = await (await fetch(src.uri)).text();
  const group = new OBJLoader().parse(text);
  _geoCache.set(modelPath, group);
  return group;
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
      child.material = new MeshStandardMaterial({
        map: texture ?? null,
        color: texture ? 0xffffff : 0xbbbbbb,
        roughness: 0.7,
        metalness: 0.05,
      });
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return clone;
}
