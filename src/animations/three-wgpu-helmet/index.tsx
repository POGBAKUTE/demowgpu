import { StyleSheet, Text, View } from 'react-native';

import { useEffect, useRef, useState } from 'react';

import type { CanvasRef } from 'react-native-wgpu';
import { Canvas } from 'react-native-wgpu';
import * as THREE from 'three';

import { makeWebGPURenderer } from '../three-wgpu-box/components/makeWebGPURenderer';

export const ThreeWGPUHelmet = () => {
  const ref = useRef<CanvasRef>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const context = ref.current?.getContext('webgpu');
    if (!context) return;

    const { width, height } = (context as any).canvas;
    const clock = new THREE.Clock();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.25, 20);
    camera.position.set(-1.8, 0.6, 2.7);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#101821');

    const renderer = makeWebGPURenderer(context as any);
    renderer.init();
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const keyLight = new THREE.DirectionalLight('#ffffff', 1.2);
    keyLight.position.set(2, 2.5, 2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#8fb3ff', 0.55);
    fillLight.position.set(-2, 1.4, -1.4);
    scene.add(fillLight);

    const helmetLikeMesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.45, 0.14, 220, 32),
      new THREE.MeshStandardMaterial({
        color: '#a8b5c7',
        metalness: 0.85,
        roughness: 0.22,
      }),
    );
    scene.add(helmetLikeMesh);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 60),
      new THREE.MeshStandardMaterial({
        color: '#1e2a39',
        roughness: 0.95,
        metalness: 0.05,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.95;
    scene.add(floor);

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const distance = 2.2;
      camera.position.x = Math.sin(elapsed * 0.55) * distance;
      camera.position.z = Math.cos(elapsed * 0.55) * distance;
      camera.lookAt(new THREE.Vector3(0, 0, 0));

      helmetLikeMesh.rotation.y += 0.005;
      renderer.render(scene, camera);
      (context as any).present();
    };

    renderer.setAnimationLoop(animate);
    setReady(true);

    return () => {
      renderer.setAnimationLoop(null);
    };
  }, []);

  return (
    <View style={styles.root}>
      {!ready && <Text>Loading assets...</Text>}
      <View style={StyleSheet.absoluteFill}>
        <Canvas ref={ref} style={{ flex: 1 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
