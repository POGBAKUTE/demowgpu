import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useEffect, useRef, useState } from 'react';

import type { CanvasRef } from 'react-native-wgpu';
import { Canvas } from 'react-native-wgpu';
import * as THREE from 'three';

import { makeWebGPURenderer } from '../three-wgpu-box/components/makeWebGPURenderer';

export const ThreeWGPUMiniGame = () => {
  const ref = useRef<CanvasRef>(null);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const moveDirRef = useRef(0);

  useEffect(() => {
    const context = ref.current!.getContext('webgpu')!;
    const { width, height } = (context as any).canvas;

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 20);
    camera.position.set(0, 2.2, 3.2);
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1117');

    const ambient = new THREE.AmbientLight('#ffffff', 0.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight('#ffffff', 1.3);
    sun.position.set(2, 4, 1.5);
    scene.add(sun);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 8),
      new THREE.MeshStandardMaterial({ color: '#192332' }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.35;
    scene.add(floor);

    const player = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.35),
      new THREE.MeshStandardMaterial({ color: '#4ade80' }),
    );
    player.position.set(0, -0.1, 0.5);
    scene.add(player);

    const target = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 16),
      new THREE.MeshStandardMaterial({ color: '#f97316' }),
    );
    target.position.set(0, 1.4, 0.5);
    scene.add(target);

    const resetTarget = () => {
      target.position.x = (Math.random() - 0.5) * 2.6;
      target.position.y = 1.6;
    };

    const renderer = makeWebGPURenderer(context as any);
    renderer.init();

    let last = 0;
    function animate(time: number) {
      const dt = Math.min((time - last) / 1000 || 0.016, 0.033);
      last = time;

      player.position.x += moveDirRef.current * dt * 2.6;
      player.position.x = Math.max(-1.4, Math.min(1.4, player.position.x));

      target.position.y -= dt * 1.65;
      target.rotation.y += dt * 3.5;

      const hitX = Math.abs(target.position.x - player.position.x) < 0.28;
      const hitY = Math.abs(target.position.y - player.position.y) < 0.22;

      if (hitX && hitY) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        resetTarget();
      } else if (target.position.y < -0.35) {
        resetTarget();
      }

      renderer.render(scene, camera);
      (context as any).present();
    }

    renderer.setAnimationLoop(animate);
    return () => {
      renderer.setAnimationLoop(null);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Canvas ref={ref} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.hud}>
        <Text style={styles.score}>Score: {score}</Text>
        <Text style={styles.help}>Hold left/right side to move</Text>
      </View>
      <View style={styles.controls}>
        <Pressable
          style={styles.half}
          onPressIn={() => {
            moveDirRef.current = -1;
          }}
          onPressOut={() => {
            moveDirRef.current = 0;
          }}
        />
        <Pressable
          style={styles.half}
          onPressIn={() => {
            moveDirRef.current = 1;
          }}
          onPressOut={() => {
            moveDirRef.current = 0;
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d1117',
    flex: 1,
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  half: {
    flex: 1,
  },
  help: {
    color: '#aab6c4',
    fontSize: 12,
    marginTop: 4,
  },
  hud: {
    left: 16,
    position: 'absolute',
    top: 48,
  },
  score: {
    color: '#e9f3ff',
    fontSize: 22,
    fontWeight: '700',
  },
});
