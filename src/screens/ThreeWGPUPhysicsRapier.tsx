import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, type CanvasRef } from 'react-native-wgpu';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

import { makeWebGPURenderer } from '../three-helpers/makeWebGPURenderer';

const NUM_BOXES = 80;
const BOX_SIZE = 0.18;
const FLOOR_SIZE = 4;

export const ThreeWGPUPhysicsRapier = () => {
  const ref = useRef<CanvasRef>(null);
  const [fps, setFps] = useState(0);
  const [status, setStatus] = useState('initializing Rapier (WASM)...');

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        await RAPIER.init();
        setStatus('Rapier WASM loaded ✓');
      } catch (e: any) {
        setStatus('Rapier WASM failed: ' + e.message);
        return;
      }
      if (disposed) return;

      const context = ref.current!.getContext('webgpu')!;
      const { width, height } = (context as any).canvas;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#0a0e1a');

      const camera = new THREE.PerspectiveCamera(55, width / height, 0.05, 50);
      camera.position.set(3.2, 2.8, 3.6);
      camera.lookAt(0, 0.4, 0);

      scene.add(new THREE.HemisphereLight('#a0c4ff', '#1a1a2e', 0.55));
      const dir = new THREE.DirectionalLight('#ffffff', 1.4);
      dir.position.set(2.5, 4, 2);
      scene.add(dir);

      const floorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(FLOOR_SIZE, 0.1, FLOOR_SIZE),
        new THREE.MeshStandardMaterial({
          color: '#1f2a44',
          roughness: 0.8,
          metalness: 0.1,
        }),
      );
      floorMesh.position.y = -0.05;
      scene.add(floorMesh);

      const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(FLOOR_SIZE / 2, 0.05, FLOOR_SIZE / 2),
        floorBody,
      );

      const palette = ['#ff6b6b', '#ffd166', '#06d6a0', '#73d6ff', '#c084fc'];
      const boxGeo = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
      const items: { body: RAPIER.RigidBody; mesh: THREE.Mesh }[] = [];

      for (let i = 0; i < NUM_BOXES; i++) {
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(
          (Math.random() - 0.5) * 1.2,
          2 + Math.random() * 4,
          (Math.random() - 0.5) * 1.2,
        );
        const body = world.createRigidBody(bodyDesc);
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(BOX_SIZE / 2, BOX_SIZE / 2, BOX_SIZE / 2)
            .setRestitution(0.45)
            .setFriction(0.4),
          body,
        );

        const mat = new THREE.MeshStandardMaterial({
          color: palette[i % palette.length],
          roughness: 0.35,
          metalness: 0.25,
        });
        const mesh = new THREE.Mesh(boxGeo, mat);
        scene.add(mesh);
        items.push({ body, mesh });
      }

      const renderer = makeWebGPURenderer(context as any);
      await renderer.init();
      if (disposed) return;

      let last = performance.now();
      let frames = 0;
      let acc = 0;
      const q = new THREE.Quaternion();

      function animate(now: number) {
        const dt = Math.min((now - last) / 1000, 1 / 30);
        last = now;
        frames++;
        acc += dt;
        if (acc >= 0.5) {
          setFps(Math.round(frames / acc));
          frames = 0;
          acc = 0;
        }
        world.timestep = dt;
        world.step();

        for (const { body, mesh } of items) {
          const p = body.translation();
          const r = body.rotation();
          mesh.position.set(p.x, p.y, p.z);
          q.set(r.x, r.y, r.z, r.w);
          mesh.quaternion.copy(q);
        }

        renderer.render(scene, camera);
        (context as any).present();
      }

      renderer.setAnimationLoop(animate);
      cleanup = () => {
        renderer.setAnimationLoop(null);
        world.free();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Canvas ref={ref} style={{ flex: 1 }} />
      <View style={styles.hud} pointerEvents="none">
        <Text style={styles.hudText}>{fps} FPS</Text>
        <Text style={styles.hudSub}>{status}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    top: 60,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  hudText: {
    color: '#0f0',
    fontFamily: 'Menlo',
    fontSize: 16,
    fontWeight: '700',
  },
  hudSub: { color: '#aaa', fontFamily: 'Menlo', fontSize: 10 },
});
