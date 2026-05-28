import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Canvas, type CanvasRef } from 'react-native-wgpu';
import 'react-native-wgpu';
import * as THREE from 'three';
import { useGLTF } from '../three-helpers/AssetManager';
import { makeWebGPURenderer } from '../three-helpers/makeWebGPURenderer';

export const MichelleViewer = () => {
  const ref = useRef<CanvasRef>(null);
  const gltf = useGLTF(
    require('../../assets/models/michelle/model.gltf'),
    'michelle/model.gltf',
  );
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!gltf) return;
    let stopped = false;

    (async () => {
      try {
        const context = ref.current!.getContext('webgpu')!;
        const { width, height } = (context as any).canvas;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0d1117');
        scene.fog = new THREE.Fog('#0d1117', 8, 20);

        const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 100);
        camera.position.set(0, 1.4, 3.5);
        camera.lookAt(0, 1, 0);

        scene.add(new THREE.HemisphereLight(0x99bbff, 0x223344, 2.0));
        const keyLight = new THREE.DirectionalLight(0xfff0e0, 4.0);
        keyLight.position.set(2, 5, 3);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0x4488ff, 2.0);
        rimLight.position.set(-3, 3, -3);
        scene.add(rimLight);

        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(20, 20),
          new THREE.MeshStandardMaterial({ color: '#161b22', roughness: 0.9 }),
        );
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        const renderer = makeWebGPURenderer(context as any);
        if (stopped) return;

        (renderer as any).toneMapping = THREE.ACESFilmicToneMapping;
        (renderer as any).toneMappingExposure = 1.2;

        const model = gltf.scene;
        model.traverse((node: any) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        scene.add(model);

        const mixer = new THREE.AnimationMixer(model);
        if (gltf.animations?.length) {
          mixer.clipAction(gltf.animations[0]).play();
        }

        const clock = new THREE.Clock();
        let angle = 0;
        let frameCount = 0;
        let lastFpsTime = performance.now();

        renderer.setAnimationLoop(() => {
          const delta = clock.getDelta();
          mixer.update(delta);

          angle += delta * 0.3;
          camera.position.x = Math.sin(angle) * 3.5;
          camera.position.z = Math.cos(angle) * 3.5;
          camera.lookAt(0, 1, 0);

          renderer.render(scene, camera);
          (context as any).present();

          const now = performance.now();
          frameCount++;
          if (now - lastFpsTime >= 500) {
            setFps(Math.round(frameCount * 1000 / (now - lastFpsTime)));
            frameCount = 0;
            lastFpsTime = now;
          }
        });
      } catch (e: any) {
        console.error('[Michelle]', e?.message, e?.stack);
      }
    })();

    return () => { stopped = true; };
  }, [gltf]);

  return (
    <View style={s.root}>
      <Canvas ref={ref} style={StyleSheet.absoluteFill} />
      <View style={s.fpsWrap} pointerEvents="none">
        <Text style={s.fpsText}>{fps} FPS</Text>
      </View>
      {!gltf ? (
        <View style={s.statusWrap} pointerEvents="none">
          <Text style={s.statusText}>Loading...</Text>
        </View>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d1117' },
  statusWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  statusText: { color: '#8b949e', fontSize: 14 },
  fpsWrap: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  fpsText: { color: '#0f0', fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
});
