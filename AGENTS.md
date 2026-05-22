# Agent Notes — Porting Three.js to React Native + WebGPU

Tổng hợp kiến thức từ thực nghiệm port game three.js (Crossy Road web → RN) và build các demo three.js + physics trên React Native với `react-native-wgpu`.

---

## 1. Stack tổng quan

- **Renderer**: `react-native-wgpu` (Shopify) — expose WebGPU native qua Dawn → Metal (iOS) / Vulkan (Android). Không phải bridge JS như expo-gl.
- **3D engine**: Three.js — dùng `WebGPURenderer` (alias `three` → `three/build/three.webgpu.js` trong metro.config).
- **Physics (JS only)**: `cannon-es` (pure JS, chạy trên Hermes ngon).
- **Physics (WASM)**: `@dimforge/rapier3d-compat` — **không chạy được trên Hermes mặc định** (xem mục 5).

---

## 2. Boilerplate render Three.js + WGPU

```ts
import { Canvas, type CanvasRef } from 'react-native-wgpu';
import * as THREE from 'three';
import { makeWebGPURenderer } from './makeWebGPURenderer';

const ref = useRef<CanvasRef>(null);
useEffect(() => {
  const context = ref.current!.getContext('webgpu')!;
  const { width, height } = (context as any).canvas;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 100);
  // ... add lights/meshes ...

  const renderer = makeWebGPURenderer(context as any);
  await renderer.init();

  renderer.setAnimationLoop((t) => {
    renderer.render(scene, camera);
    (context as any).present(); // RN-WGPU phải push frame thủ công
  });
  return () => renderer.setAnimationLoop(null);
}, []);
```

Helper `makeWebGPURenderer` wrap RN canvas thành object có `width/height/clientWidth/clientHeight` để Three nhận diện.

---

## 3. metro.config.js (bắt buộc)

```js
defaultConfig.resolver.assetExts = [
  ...defaultConfig.resolver.assetExts,
  'obj', 'mtl', 'glb', 'gltf', 'bin', 'hdr', 'wav', 'mp3',
];

defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('three/addons/')) {
    return {
      filePath: path.resolve(threePath, `examples/jsm/${moduleName.replace('three/addons/', '')}.js`),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'three' || moduleName === 'three/webgpu') {
    return { filePath: path.resolve(threePath, 'build/three.webgpu.js'), type: 'sourceFile' };
  }
  if (moduleName === 'three/tsl') {
    return { filePath: path.resolve(threePath, 'build/three.tsl.js'), type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

---

## 4. Asset loading — pattern đúng cho RN

### 4.1 Polyfill cần có
`react-native-wgpu` tự polyfill `global.createImageBitmap` qua native module, NHƯNG chỉ chấp nhận **`ArrayBuffer | ArrayBufferView`**, không phải `Blob` (khác chuẩn web). Đây là cái duy nhất phải lưu ý khi load texture.

### 4.2 Pattern load OBJ + PNG (Crossy Road)

```js
import { Image } from 'react-native';
import { OBJLoader } from 'three/addons/loaders/OBJLoader';

// Asset map cần require() literal cho Metro bundle
const OBJ_MAP = { 'path/to/model.obj': require('../assets/path/to/model.obj') };
const TEX_MAP = { 'path/to/model.obj': require('../assets/path/to/model.png') };

async function loadModel(modelPath) {
  // Geometry: fetch text → OBJLoader.parse
  const objUri = Image.resolveAssetSource(OBJ_MAP[modelPath]).uri;
  const text = await (await fetch(objUri)).text();
  const group = new OBJLoader().parse(text);

  // Texture: fetch ARRAYBUFFER → createImageBitmap
  const texUri = Image.resolveAssetSource(TEX_MAP[modelPath]).uri;
  const buf = await (await fetch(texUri)).arrayBuffer();   // ⚠️ KHÔNG dùng .blob()
  const bitmap = await createImageBitmap(buf);
  const tex = new THREE.Texture(bitmap);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;

  group.traverse((c) => {
    if (c.isMesh) {
      c.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.05 });
      c.castShadow = true; c.receiveShadow = true;
    }
  });
  return group;
}
```

### 4.3 Pattern load GLTF (Michelle backdrop)

```ts
import { Asset } from 'expo-asset';   // Expo only; bare RN dùng Image.resolveAssetSource
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';

const uri = await Asset.fromModule(require('./model.gltf')).downloadAsync();
new GLTFLoader().load(uri, (gltf) => scene.add(gltf.scene));
```
GLTFLoader tự gọi `createImageBitmap` cho texture trong file, hoạt động tốt khi format GLTF có ref texture đúng.

### 4.4 Lưu ý chuyển OBJ → GLTF/GLB
- `obj2gltf -b` → GLB embed: geometry + base64 buffer, **chỉ embed texture nếu OBJ có .mtl link đúng**. Nếu không có .mtl thì textures bị bỏ qua → model render trắng/xám.
- `obj2gltf` (no `-b`) → .gltf JSON + .png riêng: cùng vấn đề về .mtl. Nếu thiếu, GLTF không reference image, không có texture.
- → Với OBJ thiếu .mtl: dùng pattern 4.2 (OBJ + PNG load riêng).

---

## 5. Hermes & WebAssembly

- RN 0.85 (Hermes V1) **chưa enable WebAssembly default**. Doc Hermes ghi: "Wasm support is not yet ready for production use."
- Rapier3D (Rust→WASM) báo `ReferenceError: Property 'WebAssembly' doesn't exist`.
- Workaround:
  1. Switch JS engine sang JSC (`hermes_enabled: false` trong Podfile) — JSC iOS có WebAssembly native.
  2. Build Hermes custom với `-DWASM=1`.
  3. JSI binding native cho lib physics (nhanh nhất nhưng tốn công).
- Hệ quả: với mobile RN hiện tại, **cannon-es** là sweet spot cho < 100 bodies.

---

## 6. Polyfill cần thêm trong `index.js`

```js
import 'react-native-gesture-handler';
import { TextDecoder, TextEncoder } from 'text-encoding';
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
```
GLTFLoader cần `TextDecoder` để parse JSON chunk của GLB. Hermes không có default.

---

## 7. Babel config (RN bare + three.js)

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['@babel/plugin-transform-class-static-block'], // three.js dùng static blocks
};
```

---

## 8. Three.js → RN port effort estimate

Port game three.js từ web sang RN:

| Phần code | Tỷ lệ giữ nguyên | Lý do nếu phải sửa |
|---|---|---|
| Scene graph, Mesh, Material, Light, Camera, Geometry | 100% | identical API |
| Animation loop (`setAnimationLoop`, `requestAnimationFrame`) | 100% | có sẵn trong RN |
| Vector/Quaternion math, raycasting, easing | 100% | thuần JS |
| Asset loading (OBJ/GLTF/PNG) | 0% | phải viết adapter qua Metro + polyfill |
| DOM events (`document.*`, `window.addEventListener`) | 0% | đổi sang `useWindowDimensions`, GestureDetector, PanResponder |
| `localStorage` | 0% | → `AsyncStorage` |
| Audio HTML5 / Three Audio + Web Audio API | 0% | → `expo-av` / native |
| Firebase Web SDK | 0% | → `@react-native-firebase` |
| Custom GLSL shader (`onBeforeCompile`, ShaderMaterial source) | 0% | → TSL hoặc WGSL |
| Renderer (WebGLRenderer → WebGPURenderer) | ~95% | hầu hết tương thích, một vài flag khác |

Game medium (~1000 LOC): **1-2 ngày** với người đã quen RN + Three.

---

## 9. Bugs & gotchas đã hit thực tế

1. **`createImageBitmap` chỉ nhận `ArrayBuffer`** — không phải Blob (khác standard web). Đọc d.ts của rn-wgpu để biết.
2. **OBJLoader trên RN cần fetch text trước** (`OBJLoader().parse(text)`), không gọi `.load(url)` được vì DOM XHR khác.
3. **Metro tự thêm `.js` cho alias `three/addons/`** → import phải dùng `'three/addons/loaders/GLTFLoader'` (không có `.js`).
4. **Hai Metro cùng lúc cần 2 port khác nhau** — nhưng RN CLI bake port vào bundle URL lúc build, đổi runtime qua "Configure Bundler" yêu cầu Reload thêm 1 lần.
5. **iOS Simulator x86_64 + Rosetta**: WebGPU emulated, FPS thấp hơn device thật ~2-3 lần.
6. **Skia + rn-wgpu cùng register `WebGPUView`** → cần stub `WebGPUViewNativeComponent` của Skia trong metro.config.
7. **`document.createElement('div')`** trong game web → không có DOM trong RN, phải rewrite popup/score thành React component.

---

## 10. References

- `react-native-wgpu`: https://github.com/wcandillon/react-native-webgpu
- Three.js WebGPU docs: https://threejs.org/docs/#manual/en/introduction/How-to-use-WebGPU-with-three.js
- RN 0.84 + Hermes V1 release: https://reactnative.dev/blog/2026/02/11/react-native-0.84
- Hermes WebAssembly status: https://github.com/facebook/hermes/issues/429
