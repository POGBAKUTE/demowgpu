import * as THREE from 'three';
import type { CanvasRef } from 'react-native-wgpu';
import { Canvas } from 'react-native-wgpu';
import { View } from 'react-native';
import { useEffect, useRef } from 'react';

import { makeWebGPURenderer } from '../three-wgpu-box/components/makeWebGPURenderer';

export const ThreeWGPUBoxClone = () => {
  const ref = useRef<CanvasRef>(null);

  useEffect(() => {
    const context = ref.current!.getContext('webgpu')!;
    const { width, height } = (context as any).canvas;

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
    camera.position.z = 1;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1320');

    const light = new THREE.DirectionalLight('#ffffff', 1.2);
    light.position.set(0.5, 1, 1);
    scene.add(light);

    const geometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const material = new THREE.MeshStandardMaterial({
      color: '#73d6ff',
      roughness: 0.35,
      metalness: 0.2,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = makeWebGPURenderer(context as any);
    renderer.init();

    function animate(time: number) {
      mesh.rotation.x = time / 1700;
      mesh.rotation.y = time / 950;

      renderer.render(scene, camera);
      (context as any).present();
    }

    renderer.setAnimationLoop(animate);
    return () => {
      renderer.setAnimationLoop(null);
    };
  }, [ref]);

  return (
    <View style={{ flex: 1 }}>
      <Canvas ref={ref} style={{ flex: 1 }} />
    </View>
  );
};
