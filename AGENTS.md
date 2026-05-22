# Agent Notes — demoWGPU2: Crossy Road on React Native + WebGPU

Tổng hợp kiến thức từ thực nghiệm port game three.js (Crossy Road web → RN 0.85) và build các demo three.js + physics trên React Native với `react-native-wgpu`.

---

## 1. Stack tổng quan

- **Renderer**: `react-native-wgpu` (Shopify) — expose WebGPU native qua Dawn → Metal (iOS) / Vulkan (Android). Không phải bridge JS như expo-gl.
- **3D engine**: Three.js — dùng `WebGPURenderer` (alias `three` → `three/build/three.webgpu.js` trong metro.config).
- **Physics (JS only)**: `cannon-es` (pure JS, chạy trên Hermes ngon).
- **Physics (WASM)**: `@dimforge/rapier3d-compat` — **không chạy được trên Hermes mặc định** (xem mục 5).
- **Audio**: `react-native-sound` — cần link `AVFoundation` thủ công (xem mục 12).
- **Storage**: `@react-native-async-storage/async-storage` — best score, user name.

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
`react-native-wgpu` tự polyfill `global.createImageBitmap` qua native module, NHƯNG chỉ chấp nhận **`ArrayBuffer | ArrayBufferView`**, không phải `Blob` (khác chuẩn web). Đây là điểm quan trọng nhất khi load texture.

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

### 4.3 Pattern load GLTF

```ts
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';
const uri = Image.resolveAssetSource(require('./model.gltf')).uri;
new GLTFLoader().load(uri, (gltf) => scene.add(gltf.scene));
```

### 4.4 Lưu ý chuyển OBJ → GLTF/GLB
- `obj2gltf -b` chỉ embed texture nếu OBJ có .mtl link đúng. Thiếu .mtl → model trắng/xám.
- → Với OBJ thiếu .mtl: dùng pattern 4.2 (OBJ + PNG load riêng).

---

## 5. Hermes & WebAssembly

- RN 0.85 (Hermes V1) **chưa enable WebAssembly default**.
- Rapier3D (Rust→WASM) báo `ReferenceError: Property 'WebAssembly' doesn't exist`.
- Workaround: switch sang JSC (`hermes_enabled: false`) hoặc dùng cannon-es (pure JS).
- **cannon-es** là sweet spot cho < 100 bodies trên mobile RN hiện tại.

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

## 7. Babel config

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['@babel/plugin-transform-class-static-block'], // three.js dùng static blocks
};
```

---

## 8. Three.js → RN port effort estimate

| Phần code | Tỷ lệ giữ nguyên | Lý do nếu phải sửa |
|---|---|---|
| Scene graph, Mesh, Material, Light, Camera, Geometry | 100% | identical API |
| Animation loop | 100% | có sẵn trong RN |
| Vector/Quaternion math, raycasting | 100% | thuần JS |
| Asset loading (OBJ/GLTF/PNG) | 0% | phải viết adapter qua Metro + polyfill |
| DOM events (`document.*`, `window.*`) | 0% | đổi sang GestureDetector, PanResponder |
| `localStorage` | 0% | → `AsyncStorage` |
| Audio HTML5 / Web Audio API | 0% | → `react-native-sound` / `expo-av` |
| Renderer (WebGLRenderer → WebGPURenderer) | ~95% | hầu hết tương thích |

Game medium (~1000 LOC): **1-2 ngày** với người đã quen RN + Three.

---

## 9. Bugs & gotchas đã hit thực tế

1. **`createImageBitmap` chỉ nhận `ArrayBuffer`** — không phải Blob. Dùng `.arrayBuffer()` thay `.blob()`.
2. **OBJLoader trên RN**: dùng `OBJLoader().parse(text)`, không dùng `.load(url)`.
3. **Metro alias `three/addons/`**: import không có `.js` suffix — `'three/addons/loaders/OBJLoader'` ✓, `'three/addons/loaders/OBJLoader.js'` ✗.
4. **Port Metro**: RN CLI bake port vào binary lúc build. Cần set `RCT_METRO_PORT` trong `GCC_PREPROCESSOR_DEFINITIONS` của Podfile trước `pod install`. Default 8081, đổi sang 8088 cần rebuild native.
5. **iOS Simulator x86_64 + Rosetta**: WebGPU emulated, FPS thấp hơn device thật ~2-3 lần.
6. **`document.createElement`** → không có DOM trong RN, phải rewrite thành React component.
7. **MetalView off-main-thread warning**: renderer chạy từ JS thread, có thể thấy warning nhưng không crash.

---

## 10. RN Metro port — cách đúng

Để `react-native run-ios --port 8088` hoạt động, port phải được bake vào binary lúc build:

```ruby
# ios/Podfile — trong post_install
installer.pods_project.targets.each do |target|
  target.build_configurations.each do |config|
    defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS']
    defs = ['$(inherited)'] if defs.nil?
    defs = [defs] if defs.is_a?(String)
    defs += ["RCT_METRO_PORT=#{ENV['RCT_METRO_PORT'] || 8081}"]
    config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
  end
end
```

Sau đó: `RCT_METRO_PORT=8088 pod install` → rebuild native.

---

## 11. react-native-sound + AVFoundation

RNSound podspec không khai báo AVFoundation. Phải link thủ công vào xcodeproj. Cách an toàn nhất: add trực tiếp vào `OTHER_LDFLAGS` trong Xcode GUI (Target → Build Settings → Other Linker Flags → thêm `-framework AVFoundation`), thay vì dùng `agg.user_project.save` trong Podfile (cách này có thể corrupt xcodeproj).

---

## 12. MCP ios-simulator-mcp — debug simulator từ Claude Code

**Model Context Protocol (MCP)** là chuẩn để AI client (Claude, Cursor...) gọi tool bên ngoài.

### Kiến trúc
```
Claude Code  ←→  MCP Server (ios-simulator-mcp)  ←→  idb  ←→  iOS Simulator
   (AI)            (Node.js process)              (CLI)     (xcrun simctl)
```

### Setup (1 lần duy nhất)
```bash
claude mcp add ios-simulator -- npx -y ios-simulator-mcp
```
Ghi vào `~/.claude.json`:
```json
{
  "mcpServers": {
    "ios-simulator": { "command": "npx", "args": ["-y", "ios-simulator-mcp"] }
  }
}
```

### Cách hoạt động
- Claude Code spawn process `ios-simulator-mcp` khi khởi động
- MCP server đăng ký tool: `ui_tap`, `ui_swipe`, `screenshot`...
- Claude gọi `mcp__ios-simulator__screenshot` như tool nội bộ

### Dùng với client khác
Cùng config dùng cho: Cursor (Settings → MCP), Claude Desktop (`claude_desktop_config.json`), Cline/Roo Code trong VS Code.

---

## 13. References

- `react-native-wgpu`: https://github.com/wcandillon/react-native-webgpu
- Three.js WebGPU: https://threejs.org/docs/#manual/en/introduction/How-to-use-WebGPU-with-three.js
- Hermes WebAssembly status: https://github.com/facebook/hermes/issues/429
- Crossy Road web source: https://github.com/ibrahim-sall/crossyroad
