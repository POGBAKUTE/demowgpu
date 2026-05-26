import * as THREE from 'three';
import { VSMShadowMap } from 'three';
import type { CanvasRef } from 'react-native-wgpu';
import { Canvas } from 'react-native-wgpu';
import { View, Text } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { makeWebGPURenderer } from '../three-helpers/makeWebGPURenderer';

export const ThreeWGPUBoxClone = () => {
  const ref = useRef<CanvasRef>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let stopped = false;

    (async () => {
      try {
        const context = ref.current!.getContext('webgpu')!;
        const { width, height } = (context as any).canvas;

        const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 20);
        camera.position.set(0.5, 0.6, 1.2);
        camera.lookAt(0, 0, 0);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0b1320');

        scene.add(new THREE.AmbientLight('#ffffff', 0.4));

        const light = new THREE.DirectionalLight('#ffffff', 1.5);
        light.position.set(2, 4, 2);
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 20;
        light.shadow.camera.left = -2;
        light.shadow.camera.right = 2;
        light.shadow.camera.top = 2;
        light.shadow.camera.bottom = -2;
        scene.add(light);

        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.22, 0.22),
          new THREE.MeshStandardMaterial({ color: '#73d6ff', roughness: 0.35, metalness: 0.2 }),
        );
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);

        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(4, 4),
          new THREE.MeshStandardMaterial({ color: '#1a2238', roughness: 0.9 }),
        );
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.2;
        plane.receiveShadow = true;
        scene.add(plane);

        const renderer = makeWebGPURenderer(context as any);
        console.log('[BOX] before init, shadowMap.enabled =', (renderer as any).shadowMap?.enabled);
        await renderer.init();
        console.log('[BOX] after init');
        if (stopped) return;

        (renderer as any).shadowMap.enabled = true;
        (renderer as any).shadowMap.type = VSMShadowMap;
        console.log('[BOX] shadowMap.enabled set to true');

        function animate(time: number) {
          try {
            box.rotation.x = time / 1700;
            box.rotation.y = time / 950;
            renderer.render(scene, camera);
            (context as any).present();
          } catch (e: any) {
            console.error('[BOX] animate error:', e?.message, e?.stack);
            setErr('animate: ' + e?.message);
            renderer.setAnimationLoop(null);
          }
        }

        renderer.setAnimationLoop(animate);
      } catch (e: any) {
        console.error('[BOX] setup error:', e?.message, e?.stack);
        setErr('setup: ' + e?.message);
      }
    })();

    return () => { stopped = true; };
  }, [ref]);

  return (
    <View style={{ flex: 1 }}>
      <Canvas ref={ref} style={{ flex: 1 }} />
      {err ? (
        <View style={{ position: 'absolute', bottom: 60, left: 10, right: 10, backgroundColor: 'rgba(255,0,0,0.8)', padding: 8, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontSize: 11 }}>{err}</Text>
        </View>
      ) : null}
    </View>
  );
};
