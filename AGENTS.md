# Agent Notes — demoWGPU2: Crossy Road on React Native + WebGPU

Tổng hợp kiến thức từ thực nghiệm port game three.js (Crossy Road web → RN 0.85) và build các demo three.js + physics trên React Native với `react-native-wgpu`.

---

## 0. Dev environment — port & Metro

- **Metro port cho project này: 8086** (đã được bake vào iOS Simulator build).
- Start Metro: `npm run start -- --port 8086`
- iOS Simulator đã được cấu hình dùng port 8086 — KHÔNG cần rebuild native, KHÔNG cần kill Metro project khác.
- Hot reload hoạt động bình thường khi Metro chạy đúng port 8086.

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

### 4.3 Pattern load GLTF (có textures riêng — đã verified với Porsche 911 GT3)

**Root cause quan trọng:** Three.js WebGPU renderer dùng `ImageBitmapLoader` để load textures. `ImageBitmapLoader` gọi `fetch(url).then(r => r.blob()).then(blob => createImageBitmap(blob))` — nhưng `react-native-wgpu`'s `createImageBitmap` **chỉ nhận `ArrayBuffer`**, không nhận `Blob` → fail hoàn toàn.

**Fix:** Patch `ImageBitmapLoader.prototype.load` để dùng `arrayBuffer()` thay `blob()` trước khi parse GLTF.

**Vì sao cần patch GLTF JSON:** Metro chỉ serve assets được `require()` tĩnh trong JS bundle. GLTFLoader sẽ dùng relative URIs từ file GLTF (e.g. `textures/Foo.png`, `scene.bin`) — những URI này không resolve được qua Metro. Cần fetch GLTF JSON, patch image URIs và buffer URI sang Metro absolute URLs, rồi dùng `loader.parse()`.

```ts
import { Image } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// @ts-ignore — require() tất cả assets để Metro bundle chúng
const GLTF_ASSET = require('./scene.gltf');
const BIN_ASSET  = require('./scene.bin');
const TEX_ASSETS: Record<string, any> = {
  'textures/Foo_baseColor.png': require('./textures/Foo_baseColor.png'),
  // ... tất cả textures
};

// Patch ImageBitmapLoader: dùng arrayBuffer thay blob (RN-WGPU constraint)
const IBL = (THREE as any).ImageBitmapLoader;
const origLoad = IBL.prototype.load;
IBL.prototype.load = function(url: string, onLoad: any, _: any, onError: any) {
  fetch(url).then(r => r.arrayBuffer()).then(buf => createImageBitmap(buf as any)).then(onLoad).catch(onError);
  return null;
};

// Fetch GLTF JSON, patch URIs → Metro absolute URLs
const gltfText = await fetch(Image.resolveAssetSource(GLTF_ASSET).uri).then(r => r.text());
const gltfJson = JSON.parse(gltfText);
for (const img of gltfJson.images ?? []) {
  if (img.uri && TEX_ASSETS[img.uri])
    img.uri = Image.resolveAssetSource(TEX_ASSETS[img.uri]).uri;
}
for (const buf of gltfJson.buffers ?? []) {
  if (buf.uri?.endsWith('.bin'))
    buf.uri = Image.resolveAssetSource(BIN_ASSET).uri;
}

const loader = new GLTFLoader();
const gltf = await new Promise<any>((resolve, reject) => {
  loader.parse(JSON.stringify(gltfJson), '', resolve, reject);
});
IBL.prototype.load = origLoad; // restore sau khi parse xong
scene.add(gltf.scene);
```

**Tóm tắt 4 bước bắt buộc:**
1. `require()` tất cả assets tĩnh (gltf, bin, mọi texture png) → Metro bundle
2. Pre-fetch GLTF JSON + **bin file** đồng thời (`Promise.all`)
3. Embed bin dưới dạng base64 data URI trong `gltfJson.buffers[0].uri` — **KHÔNG** dùng Metro HTTP URI vì `loader.parse()` sẽ fetch lại 13MB làm hang toàn bộ
4. Patch `ImageBitmapLoader.prototype.load` dùng `arrayBuffer()` thay `blob()`, rồi `loader.parse()`

```ts
// Step 2: pre-fetch cả gltf + bin
const [gltfText, binBuf] = await Promise.all([
  fetch(Image.resolveAssetSource(GLTF_ASSET).uri).then(r => r.text()),
  fetch(Image.resolveAssetSource(BIN_ASSET).uri).then(r => r.arrayBuffer()),
]);
// Step 3: embed bin as base64 (chunked btoa để tránh stack overflow)
const bytes = new Uint8Array(binBuf);
let b64 = '';
for (let i = 0; i < bytes.length; i += 0x8000)
  b64 += btoa(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
for (const buf of gltfJson.buffers ?? [])
  if (buf.uri?.endsWith('.bin'))
    buf.uri = 'data:application/octet-stream;base64,' + b64;
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

## 8b. Pattern render ĐÚNG cho CrossyRoadGame (đã verified)

```ts
// ✅ ĐÚNG — phải await init, dùng sync render
const renderer = makeWebGPURenderer(context as any);
await renderer.init();           // BẮT BUỘC await
renderer.render(scene, camera);  // sync render trong animate loop
(context as any).present();

// ❌ SAI — render trước khi init xong → Three.js crash nội bộ (property not exist)
renderer.init();                 // không await → animate chạy trước init xong
renderer.render(scene, camera);  // crash

// ❌ SAI — renderAsync trong setAnimationLoop → frames chồng lên nhau → canvas đen
await renderer.renderAsync(scene, camera);
```

**Lý do:** Three.js WebGPU renderer build lazy-init node/pipeline khi `render()` được gọi lần đầu. Nếu `init()` chưa resolve (Promise pending), node backend chưa sẵn sàng → internal error "Property X doesn't exist".

**Canvas mount:** Canvas phải luôn được mount (không conditional render). Nếu có start screen, dùng `absoluteFill` overlay lên trên Canvas, KHÔNG unmount Canvas.

**Debug tip:** Canvas đen mà không có error → check `context.present()` có được gọi không. Canvas đen + error trong Three.js → check `await renderer.init()`.

---

## 8c. Shadows trong react-native-wgpu (đã verified)

**Chỉ VSMShadowMap hoạt động.** PCFShadowMap dùng `textureSampleCompare` (depth comparison sampler) — Dawn trong react-native-wgpu không support → **canvas trắng/blank hoàn toàn**.

```ts
const renderer = makeWebGPURenderer(context as any);
await renderer.init();          // BẮT BUỘC await trước khi set shadowMap
(renderer as any).shadowMap.enabled = true;
(renderer as any).shadowMap.type = VSMShadowMap;  // ✅ hoạt động
// (renderer as any).shadowMap.type = PCFShadowMap; // ❌ canvas trắng

// Light config để tránh shadow bị blurry
dir.castShadow = true;
dir.shadow.mapSize.width = 2048;
dir.shadow.mapSize.height = 2048;
(dir.shadow as any).radius = 1;   // default quá cao → blur; đặt 1 cho sharp
dir.shadow.camera.left = -20; dir.shadow.camera.right = 20;
dir.shadow.camera.top = 20; dir.shadow.camera.bottom = -20;
```

**Lý do `enabled` phải set sau `await init()`:** Three.js WebGPU renderer check `renderer.shadowMap.enabled` trong `AnalyticLightNode.js:208`. Nếu set trước khi init, một số path khởi tạo có thể override lại về false.

---

## 9. Bugs & gotchas đã hit thực tế

1. **`createImageBitmap` chỉ nhận `ArrayBuffer`** — không phải Blob. Dùng `.arrayBuffer()` thay `.blob()`.
2. **OBJLoader trên RN**: dùng `OBJLoader().parse(text)`, không dùng `.load(url)`.
3. **GLTFLoader + textures trên RN**: `ImageBitmapLoader` dùng `blob()` → crash vì RN-WGPU chỉ nhận `ArrayBuffer`. Phải patch `ImageBitmapLoader.prototype.load` để dùng `arrayBuffer()`. Kết hợp patch GLTF JSON để replace relative URIs với Metro absolute URLs (xem mục 4.3).
4. **PCFShadowMap → canvas trắng**: Dawn không support `textureSampleCompare`. Chỉ dùng `VSMShadowMap`. Set `shadowMap.enabled` SAU `await renderer.init()`.
5. **Metro alias `three/addons/`**: import không có `.js` suffix — `'three/addons/loaders/OBJLoader'` ✓, `'three/addons/loaders/OBJLoader.js'` ✗.
6. **Port Metro**: RN CLI bake port vào binary lúc build. Cần set `RCT_METRO_PORT` trong `GCC_PREPROCESSOR_DEFINITIONS` của Podfile trước `pod install`. Default 8081, đổi sang 8088 cần rebuild native.
7. **iOS Simulator x86_64 + Rosetta**: WebGPU emulated, FPS thấp hơn device thật ~2-3 lần.
8. **`document.createElement`** → không có DOM trong RN, phải rewrite thành React component.
9. **MetalView off-main-thread warning**: renderer chạy từ JS thread, có thể thấy warning nhưng không crash.

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

## 12. AI điều khiển iOS Simulator để test game

### Trạng thái hiện tại (đã verify)

**`mobile` MCP** (`mcp__mobile__screen`, `mcp__mobile__app`) — đã cài, hoạt động:
- `screen(action:'capture')` → screenshot simulator ✅
- `app(action:'restart', package:'org.reactjs.native.example.demoWGPU2')` → restart app ✅
- `input(action:'tap')` → **KHÔNG hoạt động** (cần Appium/WebDriverAgent chưa cài) ❌
- `input(action:'swipe')` → **KHÔNG hoạt động** (cần WebDriverAgent) ❌

**`idb`** (`/usr/local/bin/idb`) — đã cài, dùng cho tap/screenshot:
- `idb ui tap <x> <y> --udid <UDID>` → tap tại device coordinates ✅
- `idb ui swipe <x1> <y1> <x2> <y2> --duration <s> --udid <UDID>` → **KHÔNG trigger RN Fling gesture** ❌
- `idb ui describe-all --udid <UDID>` → lấy exact element positions (device coordinates) ✅
- `idb screenshot <file> --udid <UDID>` → screenshot ✅
- UDID của iPhone 17 Pro Max: `C765A109-F549-4F38-B42E-548F45E38ADD`

**Fling gesture (React Native)** — không trigger được bằng automation:
- `idb ui swipe` không đủ velocity để trigger `Gesture.Fling()` từ react-native-gesture-handler
- Cần Appium/WebDriverAgent hoặc native XCTest injection để trigger
- **Workaround**: test logic code thủ công, không cần swipe để verify game load

### Cách tap đúng: dùng idb với device coordinates

```bash
UDID="C765A109-F549-4F38-B42E-548F45E38ADD"

# Lấy exact coordinates của elements trên màn hình hiện tại
idb ui describe-all --udid $UDID | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data:
    label = item.get('AXLabel','')
    frame = item.get('frame',{})
    if label:
        cx = frame.get('x',0) + frame.get('width',0)/2
        cy = frame.get('y',0) + frame.get('height',0)/2
        print(f'{label[:50]}: ({cx:.0f},{cy:.0f})')
"

# Tap vào element
idb ui tap 220 473 --udid $UDID

# Back về home
osascript -e 'tell application "Simulator" to activate' \
  -e 'tell application "System Events" to key code 33 using command down'

# Screenshot
idb screenshot /tmp/screen.png --udid $UDID

# Chụp screenshot (mobile MCP - tốt hơn cho AI đọc)
# mcp__mobile__screen(action:'capture', preset:'medium')
```

**Tọa độ Crossy Road start screen (device coordinates, iPhone 17 Pro Max):**
| Element | x | y |
|---------|---|---|
| Chicken button | 90 | 544 |
| Palmer button | 178 | 544 |
| Juwan button | 262 | 544 |
| Wheeler button | 349 | 544 |
| Avocoder button | 142 | 589 |
| Bacon button | 233 | 589 |
| Brent button | 311 | 589 |
| START button | 220 | 658 |

**Tọa độ home list (device coordinates):**
| Item | x | y |
|------|---|---|
| Three WGPU Box | 220 | 235 |
| Physics cannon-es | 220 | 315 |
| Physics Rapier | 220 | 395 |
| Crossy Road | 220 | 473 |

**Lưu ý quan trọng:**
- Dùng `idb ui describe-all` để lấy exact coordinates — không đoán
- Luôn delay ≥ 1.5s giữa back và click tiếp theo
- Reload JS: Cmd+D → Reload (hoặc Cmd+R trong simulator)

### Script test tất cả characters

```bash
UDID="C765A109-F549-4F38-B42E-548F45E38ADD"

go_to_start_screen() {
  osascript -e 'tell application "Simulator" to activate' \
    -e 'tell application "System Events" to key code 33 using command down'
  sleep 1.5
  idb ui tap 220 473 --udid $UDID
  sleep 2
}

test_char() {
  local name=$1 cx=$2 cy=$3
  idb ui tap $cx $cy --udid $UDID   # select character
  sleep 0.3
  idb ui tap 220 658 --udid $UDID   # START
  sleep 7
  idb screenshot /tmp/char_${name}.png --udid $UDID
  go_to_start_screen
}

go_to_start_screen
test_char chicken  90  544
test_char palmer  178  544
test_char juwan   262  544
test_char wheeler 349  544
test_char avocoder 142 589
test_char bacon   233  589
test_char brent   311  589
```

### Kết quả test characters (đã verify 2026-05-26)

| Character | Load | Env render | FPS | Ghi chú |
|-----------|------|-----------|-----|---------|
| Chicken | ✅ | ✅ | 60 | Default |
| Palmer | ✅ | ✅ | 60 | |
| Juwan | ✅ | ✅ | 60 | |
| Wheeler | ✅ | ✅ | 60 | |
| Avocoder | ✅ | ✅ | 60 | |
| Bacon | ✅ | ✅ | 60 | Pink pig, clearly visible |
| Brent | ✅ | ✅ | 60 | Humanoid, clearly visible |

Tất cả 7 characters load OBJ + PNG texture thành công, environment (grass/road/river/logs/cars/trees) render đúng.

---

## 13. Expo Web — export Three.js game ra web

### Tổng quan

Dùng **Expo Web** (React Native Web) để reuse toàn bộ codebase RN, chỉ swap renderer.

- `View/Text/TouchableOpacity/StyleSheet` → tự map sang HTML/CSS bởi RNW
- Three.js scene, camera, lighting, animation loop → giữ 100%
- Game logic JS (`moove.js`, `environement.js`, v.v.) → giữ 100%
- `react-native-wgpu` → mock/swap ra DOM canvas trên web

### makeRenderer util — pattern chuẩn

```ts
// src/three-helpers/makeRenderer.ts
export async function makeRenderer(canvas: any, platform: 'rn' | 'web') {
  if (platform === 'rn') {
    const { makeWebGPURenderer } = await import('./makeWebGPURenderer');
    const context = canvas.getContext('webgpu');
    const renderer = makeWebGPURenderer(context);
    await renderer.init();
    return { renderer, present: () => context.present() };
  } else {
    const THREE = await import('three');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    return { renderer, present: () => {} };  // no-op trên web
  }
}

// Dùng trong mọi screen:
const { renderer, present } = await makeRenderer(canvasEl, Platform.OS === 'web' ? 'web' : 'rn');
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  present();  // WebGPU RN: push frame; Web: no-op
});
```

### Những gì cần đổi khi thêm Expo Web

| Phần | RN hiện tại | Web |
|------|------------|-----|
| Renderer | `makeWebGPURenderer` + `context.present()` | `THREE.WebGLRenderer` |
| Canvas mount | `<Canvas>` từ react-native-wgpu | DOM `<canvas>` ref |
| UI overlay | RN components (giữ nguyên) | RNW tự convert |
| `react-native-wgpu` import | native module | mock empty module |
| Performance | WebGPU via Dawn (slower on simulator) | WebGL2 native (60fps stable) |

### Mock react-native-wgpu cho web

```js
// src/mocks/react-native-wgpu.web.ts
export const Canvas = ({ style, ...props }: any) => <canvas {...props} style={style} />;
export type CanvasRef = HTMLCanvasElement;
```

Khai báo trong `package.json` hoặc `metro.config.js` để resolve đúng platform.

---

## 13b. Đọc binary asset từ APK bundle (GLTF/BIN/PNG) — đã verified

### Vấn đề
GLTF model lớn (Porsche 911 GT3: ~10MB `.bin` + 27 PNG textures + `.gltf` JSON) cần đọc raw bytes từ APK. RN tiêu chuẩn:
- `require('.../file.bin')` + `fetch(Image.resolveAssetSource(...).uri)` chỉ chạy trong **debug** (Metro serve qua HTTP).
- **Release crash với `Network request failed`** vì `fetch` của RN không hỗ trợ `asset:///android_asset/...` URI cho binary.

### Cách đúng: `react-native-nitro-file-system` (JSI, zero-copy)
- Package: `react-native-nitro-file-system` + peer `react-native-nitro-modules` + `react-native-nitro-buffer`
- Hỗ trợ scheme `asset://` chung cho Android (AssetManager) và iOS (Main Bundle), zero-copy ArrayBuffer qua JSI — **không qua base64**.
- API là callback-style → dùng `fs.readFileSync` hoặc `fs.promises.readFile`. KHÔNG `await fs.readFile(...)` trực tiếp (return void).

```ts
import fs from 'react-native-nitro-file-system';

const buf = fs.readFileSync('asset://porsche/scene_geometry.bin') as any;
const arrayBuf: ArrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const text = fs.readFileSync('asset://porsche/scene.gltf', 'utf8') as string;
```

### Đặt file ở đâu
Copy assets vào `android/app/src/main/assets/<your-dir>/` để bundle vào APK. Cho iOS, thêm vào Xcode bundle resources hoặc cấu hình `react-native.config.js`.

### Pattern GLTF: bypass fetch trong GLTFLoader
Three.js `GLTFLoader` gọi `THREE.FileLoader` (XHR) cho `.bin` + `THREE.ImageBitmapLoader` cho textures — cả hai cần fetch. Cách bypass:

1. Parse `gltf` JSON ngoài loader, rewrite URI `.bin` và texture sang sentinel string (`__porsche_bin__`, `__porsche_tex__<rel>`).
2. Monkey-patch `FileLoader.prototype.load` để khi gặp sentinel `.bin` thì trả `binBuf` đã đọc.
3. Monkey-patch `ImageBitmapLoader.prototype.load` để khi gặp sentinel texture thì `readAssetBuf(rel)` → `createImageBitmap(arrayBuffer)`.
4. Gọi `loader.parse(JSON.stringify(patchedJson), '', resolve, reject)`.
5. Restore prototype patches sau khi xong.

### Tại sao KHÔNG dùng `react-native-blob-util` / `react-native-fs`
- Cả hai dùng bridge cũ → trả base64 string → JS phải `atob` decode → tốn RAM + CPU.
- File 10MB bin → 13MB base64 string + `JSON.stringify` để embed `data:` URI → **OOM crash** trên emulator.
- Trên New Arch (RN 0.85+) đã có JSI — không cần chịu overhead này.

### Tại sao KHÔNG embed `.bin` thành `data:base64` URI trong gltf JSON
- 10MB bin → 13MB base64 → khi gọi `JSON.stringify(gltfJson)` tạo thêm copy → 73MB allocation → OOM.
- Ngoài ra RN `XMLHttpRequest` (mà `FileLoader` dùng) không hỗ trợ `data:` URI → vẫn fail dù có RAM.

---

## 14. References

- `react-native-wgpu`: https://github.com/wcandillon/react-native-webgpu
- Three.js WebGPU: https://threejs.org/docs/#manual/en/introduction/How-to-use-WebGPU-with-three.js
- Hermes WebAssembly status: https://github.com/facebook/hermes/issues/429
- Crossy Road web source: https://github.com/ibrahim-sall/crossyroad
