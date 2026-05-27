import { useEffect, useRef, useState, useCallback } from 'react';
import { View, PanResponder, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Canvas, type CanvasRef } from 'react-native-wgpu';
import 'react-native-wgpu';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import fs from 'react-native-nitro-file-system';
import { makeWebGPURenderer } from '../three-helpers/makeWebGPURenderer';

// asset:// works on both Android (AssetManager) and iOS (Main Bundle).
// readFileSync (no encoding) returns a NitroBuffer wrapping the underlying
// ArrayBuffer — JSI zero-copy, no base64 round-trip.
const readAssetBuf = (rel: string): ArrayBuffer => {
  const buf = fs.readFileSync('asset://' + rel) as any;
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};
const readAssetText = (rel: string): string => fs.readFileSync('asset://' + rel, 'utf8') as string;

// Texture filenames present under porsche/textures/ inside the app bundle
const TEX_FILES = new Set<string>([
  'textures/Porsche_911GT3_2022BadgeA_Material_baseColor.png',
  'textures/Porsche_911GT3_2022BadgeA_Material_normal.png',
  'textures/Porsche_911GT3_2022Carbon1_Material_baseColor.png',
  'textures/Porsche_911GT3_2022Carbon1_Material_normal.png',
  'textures/Porsche_911GT3_2022Coloured_Material_baseColor.png',
  'textures/Porsche_911GT3_2022Grille1A_Material_baseColor.png',
  'textures/Porsche_911GT3_2022Grille1A_Material_normal.png',
  'textures/Porsche_911GT3_2022Grille2A_Material_baseColor.png',
  'textures/Porsche_911GT3_2022Grille2A_Material_normal.png',
  'textures/Porsche_911GT3_2022Grille3A_Material_baseColor.png',
  'textures/Porsche_911GT3_2022Grille3A_Material_normal.png',
  'textures/Porsche_911GT3_2022Grille4A_Material_baseColor.png',
  'textures/Porsche_911GT3_2022Grille4A_Material_normal.png',
  'textures/Porsche_911GT3_2022Grille5A_Material_baseColor.png',
  'textures/Porsche_911GT3_2022Grille5A_Material_normal.png',
  'textures/Porsche_911GT3_2022Grille6A_Material_baseColor.png',
  'textures/Porsche_911GT3_2022Grille7A_Material_baseColor.png',
  'textures/Porsche_911GT3_2022Grille7A_Material_normal.png',
  'textures/Porsche_911GT3_2022InteriorA_Material_baseColor.png',
  'textures/Porsche_911GT3_2022InteriorA_Material_normal.png',
  'textures/Porsche_911GT3_2022InteriorTillingA_Material_baseColor.png',
  'textures/Porsche_911GT3_2022InteriorTillingA_Material_normal.png',
  'textures/Porsche_911GT3_2022LightA_Material_baseColor.png',
  'textures/Porsche_911GT3_2022ManufacturerPlateA_Material_baseColor.png',
  'textures/Porsche_911GT3_2022_CallipersCalliperA_Zone_Material_baseColor.png',
  'textures/Porsche_911GT3_2022_Wheel1A_3D_3DWheel1A_Material_baseColor.png',
  'textures/Porsche_911GT3_2022_Wheel1A_3D_3DWheel1A_Material_normal.png',
]);
const TEX_SENTINEL = '__porsche_tex__';

export const PorscheViewer = () => {
  const ref = useRef<CanvasRef>(null);
  const [fps, setFps] = useState(0);
  const [quality, setQuality] = useState<'high' | 'fast'>('high');
  const lightsRef = useRef<{
    ambient: THREE.AmbientLight;
    hemi: THREE.HemisphereLight;
    key: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
    rim: THREE.DirectionalLight;
  } | null>(null);

  // Spherical orbit state
  const theta = useRef(0);      // horizontal angle
  const phi = useRef(0.45);     // vertical angle (radians from equator)
  const radius = 6.0;
  const autoRotate = useRef(true);
  const lastTouch = useRef({ x: 0, y: 0 });

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (_, g) => {
      autoRotate.current = false;
      lastTouch.current = { x: g.x0, y: g.y0 };
    },
    onPanResponderMove: (_, g) => {
      const dx = g.moveX - lastTouch.current.x;
      const dy = g.moveY - lastTouch.current.y;
      lastTouch.current = { x: g.moveX, y: g.moveY };
      theta.current -= dx * 0.008;
      phi.current = Math.max(-0.5, Math.min(1.2, phi.current - dy * 0.006));
    },
    onPanResponderRelease: () => {
      autoRotate.current = true;
    },
  })).current;

  useEffect(() => {
    let stopped = false;

    (async () => {
      try {
        const context = ref.current!.getContext('webgpu')!;
        const { width, height } = (context as any).canvas;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#111827');

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);

        const renderer = makeWebGPURenderer(context as any);
        await renderer.init();
        if (stopped) return;

        // Tone mapping for realistic PBR look
        (renderer as any).toneMapping = THREE.ACESFilmicToneMapping;
        (renderer as any).toneMappingExposure = 1.0;

        // Lighting (intensities toggled via quality button)
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        const hemiLight = new THREE.HemisphereLight(0xeef4ff, 0x445566, 2.0);
        const keyLight = new THREE.DirectionalLight(0xfff8f0, 5.0);
        keyLight.position.set(3, 5, 6);
        const fillLight = new THREE.DirectionalLight(0xbbddff, 2.5);
        fillLight.position.set(-5, 3, 4);
        const rimLight = new THREE.DirectionalLight(0xffffff, 2.0);
        rimLight.position.set(0, 4, -5);
        scene.add(ambientLight, hemiLight, keyLight, fillLight, rimLight);
        lightsRef.current = { ambient: ambientLight, hemi: hemiLight, key: keyLight, fill: fillLight, rim: rimLight };

        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(20, 20),
          new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.8, metalness: 0.0, envMapIntensity: 0.3 }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Start rendering immediately (dark background while loading)
        let frameCount = 0;
        let lastFpsTime = performance.now();

        renderer.setAnimationLoop(() => {
          if (autoRotate.current) theta.current += 0.004;
          const x = radius * Math.cos(phi.current) * Math.sin(theta.current);
          const y = radius * Math.sin(phi.current) + 0.8;
          const z = radius * Math.cos(phi.current) * Math.cos(theta.current);
          camera.position.set(x, y, z);
          camera.lookAt(0, 0.6, 0);
          renderer.render(scene, camera);
          (context as any).present();

          frameCount++;
          const now = performance.now();
          if (now - lastFpsTime >= 500) {
            setFps(Math.round(frameCount * 1000 / (now - lastFpsTime)));
            frameCount = 0;
            lastFpsTime = now;
          }
        });

        // Read bundle assets via react-native-nitro-file-system (JSI, zero-copy)
        const gltfText = readAssetText('porsche/scene.gltf');
        const binBuf = readAssetBuf('porsche/scene_geometry.bin');
        if (stopped) return;

        const gltfJson = JSON.parse(gltfText);
        for (const img of gltfJson.images ?? []) {
          if (img.uri && TEX_FILES.has(img.uri)) img.uri = TEX_SENTINEL + img.uri;
        }
        const BIN_SENTINEL = '__porsche_bin__';
        for (const buf of gltfJson.buffers ?? []) {
          if (buf.uri?.endsWith('.bin')) buf.uri = BIN_SENTINEL;
        }

        // Patch ImageBitmapLoader: serve textures from bundle via RNBU,
        // and create ImageBitmap from ArrayBuffer (RN-WGPU only accepts ArrayBuffer)
        const IBL = (THREE as any).ImageBitmapLoader;
        const origIBLLoad = IBL.prototype.load;
        IBL.prototype.load = function(url: string, onLoad: any, _: any, onError: any) {
          const i = typeof url === 'string' ? url.indexOf(TEX_SENTINEL) : -1;
          if (i >= 0) {
            const rel = url.slice(i + TEX_SENTINEL.length);
            try {
              const buf = readAssetBuf('porsche/' + rel);
              createImageBitmap(buf as any).then(onLoad).catch(onError);
            } catch (e) { onError && onError(e); }
            return null;
          }
          fetch(url).then(r => r.arrayBuffer()).then(buf => createImageBitmap(buf as any)).then(onLoad).catch(onError);
          return null;
        };

        // GLTFLoader uses THREE.FileLoader (XHR) — intercept sentinel for .bin
        const FL = (THREE as any).FileLoader;
        const origFLLoad = FL.prototype.load;
        FL.prototype.load = function(url: string, onLoad: any, onProgress: any, onError: any) {
          if (typeof url === 'string' && url.endsWith(BIN_SENTINEL)) {
            setTimeout(() => onLoad && onLoad(binBuf), 0);
            return;
          }
          return origFLLoad.call(this, url, onLoad, onProgress, onError);
        };

        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.parse(JSON.stringify(gltfJson), '', resolve, reject);
        });
        FL.prototype.load = origFLLoad;
        IBL.prototype.load = origIBLLoad;

        if (stopped) return;

        gltf.scene.traverse((node: any) => {
          if (!node.isMesh) return;
          node.castShadow = true;
          node.receiveShadow = true;
          // Boost env map intensity for glossy look
          if (node.material) {
            node.material.envMapIntensity = 1.5;
            node.material.needsUpdate = true;
          }
        });

        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);
        const scale = 3 / Math.max(size.x, size.y, size.z);
        gltf.scene.scale.setScalar(scale);
        // Center X/Z, place bottom of car at y=0 (on ground)
        gltf.scene.position.set(
          -center.x * scale,
          -box.min.y * scale,   // lift so bottom sits on y=0
          -center.z * scale,
        );
        scene.add(gltf.scene);

      } catch (e: any) {
        console.error('[Porsche]', e?.message, e?.stack);
      }
    })();

    return () => { stopped = true; };
  }, [ref]);

  const toggleQuality = useCallback(() => {
    const lights = lightsRef.current;
    if (!lights) return;
    setQuality(prev => {
      const next = prev === 'high' ? 'fast' : 'high';
      if (next === 'fast') {
        // Fast: only ambient + key light
        lights.ambient.intensity = 3.0;
        lights.hemi.intensity = 0;
        lights.key.intensity = 4.0;
        lights.fill.intensity = 0;
        lights.rim.intensity = 0;
      } else {
        // High: full showroom 3-point
        lights.ambient.intensity = 2.0;
        lights.hemi.intensity = 2.0;
        lights.key.intensity = 5.0;
        lights.fill.intensity = 2.5;
        lights.rim.intensity = 2.0;
      }
      return next;
    });
  }, []);

  return (
    <View style={s.root} {...panResponder.panHandlers}>
      <Canvas ref={ref} style={StyleSheet.absoluteFill} />
      <View style={s.fpsWrap} pointerEvents="none">
        <Text style={s.fpsText}>{fps} FPS</Text>
      </View>
      <TouchableOpacity style={s.btn} onPress={toggleQuality}>
        <Text style={s.btnText}>{quality === 'high' ? '✦ Quality' : '⚡ Fast'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827' },
  fpsWrap: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  fpsText: { color: '#0f0', fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
  btn: { position: 'absolute', bottom: 36, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
