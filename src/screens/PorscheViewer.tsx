import { useEffect, useRef, useState } from 'react';
import { View, Image, PanResponder, StyleSheet, Text } from 'react-native';
import { Canvas, type CanvasRef } from 'react-native-wgpu';
import 'react-native-wgpu';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { makeWebGPURenderer } from '../three-helpers/makeWebGPURenderer';

// @ts-ignore
const GLTF_ASSET = require('../../assets/models/porsche_911_gt3/scene.gltf');
// @ts-ignore
const BIN_ASSET = require('../../assets/models/porsche_911_gt3/scene.bin');

const TEX_URIS: Record<string, any> = {
  'textures/Porsche_911GT3_2022BadgeA_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022BadgeA_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022BadgeA_Material_normal.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022BadgeA_Material_normal.png'),
  'textures/Porsche_911GT3_2022Carbon1_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Carbon1_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022Carbon1_Material_normal.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Carbon1_Material_normal.png'),
  'textures/Porsche_911GT3_2022Coloured_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Coloured_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022Grille1A_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille1A_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022Grille1A_Material_normal.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille1A_Material_normal.png'),
  'textures/Porsche_911GT3_2022Grille2A_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille2A_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022Grille2A_Material_normal.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille2A_Material_normal.png'),
  'textures/Porsche_911GT3_2022Grille3A_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille3A_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022Grille3A_Material_normal.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille3A_Material_normal.png'),
  'textures/Porsche_911GT3_2022Grille4A_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille4A_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022Grille4A_Material_normal.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille4A_Material_normal.png'),
  'textures/Porsche_911GT3_2022Grille5A_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille5A_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022Grille5A_Material_normal.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille5A_Material_normal.png'),
  'textures/Porsche_911GT3_2022Grille6A_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille6A_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022Grille7A_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille7A_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022Grille7A_Material_normal.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022Grille7A_Material_normal.png'),
  'textures/Porsche_911GT3_2022InteriorA_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022InteriorA_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022InteriorA_Material_normal.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022InteriorA_Material_normal.png'),
  'textures/Porsche_911GT3_2022InteriorTillingA_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022InteriorTillingA_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022InteriorTillingA_Material_normal.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022InteriorTillingA_Material_normal.png'),
  'textures/Porsche_911GT3_2022LightA_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022LightA_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022ManufacturerPlateA_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022ManufacturerPlateA_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022_CallipersCalliperA_Zone_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022_CallipersCalliperA_Zone_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022_Wheel1A_3D_3DWheel1A_Material_baseColor.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022_Wheel1A_3D_3DWheel1A_Material_baseColor.png'),
  'textures/Porsche_911GT3_2022_Wheel1A_3D_3DWheel1A_Material_normal.png': require('../../assets/models/porsche_911_gt3/textures/Porsche_911GT3_2022_Wheel1A_3D_3DWheel1A_Material_normal.png'),
};

export const PorscheViewer = () => {
  const ref = useRef<CanvasRef>(null);
  const [fps, setFps] = useState(0);

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

        // Hemisphere (sky/ground) + key light — enough for good PBR look
        scene.add(new THREE.HemisphereLight(0xddeeff, 0x222830, 1.5));
        const keyLight = new THREE.DirectionalLight(0xfff4e0, 3.5);
        keyLight.position.set(4, 8, 4);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0x8899ff, 1.0);
        rimLight.position.set(-4, 3, -4);
        scene.add(rimLight);

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
          camera.lookAt(0, 0.8, 0);
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

        // Pre-fetch everything before touching GLTFLoader
        const [gltfText, binBuf] = await Promise.all([
          fetch(Image.resolveAssetSource(GLTF_ASSET).uri).then(r => r.text()),
          fetch(Image.resolveAssetSource(BIN_ASSET).uri).then(r => r.arrayBuffer()),
        ]);
        if (stopped) return;

        // Patch GLTF JSON: texture URIs → Metro absolute, bin → base64 data URI
        const gltfJson = JSON.parse(gltfText);
        for (const img of gltfJson.images ?? []) {
          if (img.uri && TEX_URIS[img.uri])
            img.uri = Image.resolveAssetSource(TEX_URIS[img.uri]).uri;
        }
        // Embed bin as base64 so loader.parse doesn't need a network fetch
        const bytes = new Uint8Array(binBuf);
        let b64 = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
          b64 += btoa(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
        }
        for (const buf of gltfJson.buffers ?? []) {
          if (buf.uri?.endsWith('.bin'))
            buf.uri = 'data:application/octet-stream;base64,' + b64;
        }

        // Patch ImageBitmapLoader: RN-WGPU createImageBitmap only accepts ArrayBuffer, not Blob
        const IBL = (THREE as any).ImageBitmapLoader;
        const origIBLLoad = IBL.prototype.load;
        IBL.prototype.load = function(url: string, onLoad: any, _: any, onError: any) {
          fetch(url).then(r => r.arrayBuffer()).then(buf => createImageBitmap(buf as any)).then(onLoad).catch(onError);
          return null;
        };

        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.parse(JSON.stringify(gltfJson), '', resolve, reject);
        });
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
        const sc = center.multiplyScalar(scale);
        gltf.scene.position.set(-sc.x, -sc.y, -sc.z);
        gltf.scene.position.y = 0;
        scene.add(gltf.scene);

      } catch (e: any) {
        console.error('[Porsche]', e?.message, e?.stack);
      }
    })();

    return () => { stopped = true; };
  }, [ref]);

  return (
    <View style={s.root} {...panResponder.panHandlers}>
      <Canvas ref={ref} style={StyleSheet.absoluteFill} />
      <View style={s.fpsWrap} pointerEvents="none">
        <Text style={s.fpsText}>{fps} FPS</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827' },
  fpsWrap: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  fpsText: { color: '#0f0', fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
});
