import { useEffect, useRef, useState, useCallback } from 'react';
import { View, PanResponder, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { Canvas, type CanvasRef } from 'react-native-wgpu';
import 'react-native-wgpu';
import * as THREE from 'three';
import { useGLTF, useRGBE } from '../three-helpers/AssetManager';
import { makeWebGPURenderer } from '../three-helpers/makeWebGPURenderer';

export const PorscheViewer = () => {
  const ref = useRef<CanvasRef>(null);
  const gltf = useGLTF(
    require('../../assets/models/porsche_911_gt3/scene.gltf'),
    'porsche/scene.gltf',
  );
  // HDR PMREM compute path crashes on some Android Vulkan stacks
  // (and hangs on x86 emulator) — keep IBL iOS-only for now.
  const HDR_ENABLED = Platform.OS === 'ios';
  const envMap = useRGBE(
    HDR_ENABLED ? require('../../assets/models/porsche_911_gt3/env_1k.hdr') : null,
    HDR_ENABLED ? 'porsche/env_1k.hdr' : undefined,
  );
  const [fps, setFps] = useState(0);
  const [quality, setQuality] = useState<'high' | 'fast'>('high');
  const lightsRef = useRef<{
    ambient: THREE.AmbientLight;
    hemi: THREE.HemisphereLight;
    key: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
    rim: THREE.DirectionalLight;
  } | null>(null);

  const theta = useRef(0);
  const phi = useRef(0.45);
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
    if (!gltf) return;
    if (HDR_ENABLED && !envMap) return;
    let stopped = false;

    (async () => {
      try {
        const context = ref.current!.getContext('webgpu')!;
        const { width, height } = (context as any).canvas;

        const scene = new THREE.Scene();
        if (envMap) {
          envMap.mapping = THREE.EquirectangularReflectionMapping;
          scene.environment = envMap;
          scene.background = envMap;
          scene.backgroundBlurriness = 0.4;
        } else {
          scene.background = new THREE.Color('#1a2030');
        }

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);

        const renderer = makeWebGPURenderer(context as any);
        if (stopped) return;

        (renderer as any).toneMapping = THREE.ACESFilmicToneMapping;
        (renderer as any).toneMappingExposure = 1.0;

        // With HDR env: low directional accents. Without: full directional lights.
        const k = envMap ? 1 : 4;
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3 * k);
        const hemiLight = new THREE.HemisphereLight(0xeef4ff, 0x445566, 0.4 * k);
        const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.5 * k);
        keyLight.position.set(3, 5, 6);
        const fillLight = new THREE.DirectionalLight(0xbbddff, 0.6 * k);
        fillLight.position.set(-5, 3, 4);
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4 * k);
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

        gltf.scene.traverse((node: any) => {
          if (!node.isMesh) return;
          node.castShadow = true;
          node.receiveShadow = true;
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
        gltf.scene.position.set(
          -center.x * scale,
          -box.min.y * scale,
          -center.z * scale,
        );
        scene.add(gltf.scene);

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
      } catch (e: any) {
        console.error('[Porsche]', e?.message, e?.stack);
      }
    })();

    return () => { stopped = true; };
  }, [gltf, envMap]);

  const toggleQuality = useCallback(() => {
    const lights = lightsRef.current;
    if (!lights) return;
    setQuality(prev => {
      const next = prev === 'high' ? 'fast' : 'high';
      if (next === 'fast') {
        lights.ambient.intensity = 3.0;
        lights.hemi.intensity = 0;
        lights.key.intensity = 4.0;
        lights.fill.intensity = 0;
        lights.rim.intensity = 0;
      } else {
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
      {(!gltf || (HDR_ENABLED && !envMap)) ? (
        <View style={s.statusWrap} pointerEvents="none">
          <Text style={s.statusText}>Loading assets...</Text>
        </View>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827' },
  fpsWrap: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  fpsText: { color: '#0f0', fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
  btn: { position: 'absolute', bottom: 36, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statusWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  statusText: { color: '#8b949e', fontSize: 14 },
});
