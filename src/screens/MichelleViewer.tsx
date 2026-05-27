import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Canvas, type CanvasRef } from 'react-native-wgpu';
import 'react-native-wgpu';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { makeWebGPURenderer } from '../three-helpers/makeWebGPURenderer';

const MICHELLE_URL =
  'https://raw.githubusercontent.com/wcandillon/react-native-webgpu/main/apps/example/src/ThreeJS/assets/michelle/model.gltf';

export const MichelleViewer = () => {
  const ref = useRef<CanvasRef>(null);
  const [status, setStatus] = useState('Loading...');
  const [fps, setFps] = useState(0);

  useEffect(() => {
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

        // Lighting
        scene.add(new THREE.HemisphereLight(0x99bbff, 0x223344, 2.0));
        const keyLight = new THREE.DirectionalLight(0xfff0e0, 4.0);
        keyLight.position.set(2, 5, 3);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0x4488ff, 2.0);
        rimLight.position.set(-3, 3, -3);
        scene.add(rimLight);

        // Ground
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(20, 20),
          new THREE.MeshStandardMaterial({ color: '#161b22', roughness: 0.9 }),
        );
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        const renderer = makeWebGPURenderer(context as any);
        await renderer.init();
        if (stopped) return;

        (renderer as any).toneMapping = THREE.ACESFilmicToneMapping;
        (renderer as any).toneMappingExposure = 1.2;

        // Patch ImageBitmapLoader: react-native-wgpu createImageBitmap only accepts ArrayBuffer
        const IBL = (THREE as any).ImageBitmapLoader;
        const origLoad = IBL.prototype.load;
        IBL.prototype.load = function (url: string, onLoad: any, _: any, onError: any) {
          fetch(url)
            .then(r => r.arrayBuffer())
            .then(buf => createImageBitmap(buf as any))
            .then(onLoad)
            .catch(onError);
          return null;
        };

        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(MICHELLE_URL, resolve, undefined, reject);
        });
        IBL.prototype.load = origLoad;

        if (stopped) return;
        setStatus('');

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
        setStatus('Error: ' + e?.message);
      }
    })();

    return () => { stopped = true; };
  }, [ref]);

  return (
    <View style={s.root}>
      <Canvas ref={ref} style={StyleSheet.absoluteFill} />
      <View style={s.fpsWrap} pointerEvents="none">
        <Text style={s.fpsText}>{fps} FPS</Text>
      </View>
      {status ? (
        <View style={s.statusWrap} pointerEvents="none">
          <Text style={s.statusText}>{status}</Text>
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
