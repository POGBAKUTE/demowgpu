import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, type CanvasRef } from 'react-native-wgpu';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import { makeWebGPURenderer } from '../three-wgpu-box/components/makeWebGPURenderer';

const NUM_BOXES = 40;
const BOX_SIZE = 0.18;
const FLOOR_SIZE = 4;

export const ThreeWGPUPhysics = () => {
  const ref = useRef<CanvasRef>(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
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

      const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
      world.broadphase = new CANNON.SAPBroadphase(world);
      world.allowSleep = true;

      const boxMat = new CANNON.Material('box');
      const floorMat = new CANNON.Material('floor');
      world.addContactMaterial(
        new CANNON.ContactMaterial(boxMat, floorMat, {
          friction: 0.4,
          restitution: 0.45,
        }),
      );
      world.addContactMaterial(
        new CANNON.ContactMaterial(boxMat, boxMat, {
          friction: 0.3,
          restitution: 0.25,
        }),
      );

      const floorBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(
          new CANNON.Vec3(FLOOR_SIZE / 2, 0.05, FLOOR_SIZE / 2),
        ),
        material: floorMat,
      });
      floorBody.position.set(0, -0.05, 0);
      world.addBody(floorBody);

      const palette = ['#ff6b6b', '#ffd166', '#06d6a0', '#73d6ff', '#c084fc'];
      const boxGeo = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
      const half = BOX_SIZE / 2;
      const shape = new CANNON.Box(new CANNON.Vec3(half, half, half));
      const items: { body: CANNON.Body; mesh: THREE.Mesh }[] = [];

      for (let i = 0; i < NUM_BOXES; i++) {
        const body = new CANNON.Body({ mass: 1, shape, material: boxMat });
        body.position.set(
          (Math.random() - 0.5) * 1.2,
          2 + Math.random() * 3,
          (Math.random() - 0.5) * 1.2,
        );
        body.quaternion.setFromEuler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        );
        world.addBody(body);

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
        world.step(1 / 60, dt, 3);

        for (const { body, mesh } of items) {
          mesh.position.set(body.position.x, body.position.y, body.position.z);
          mesh.quaternion.set(
            body.quaternion.x,
            body.quaternion.y,
            body.quaternion.z,
            body.quaternion.w,
          );
        }

        renderer.render(scene, camera);
        (context as any).present();
      }

      renderer.setAnimationLoop(animate);

      cleanup = () => {
        renderer.setAnimationLoop(null);
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Canvas ref={ref} style={{ flex: 1 }} />
      <View style={styles.hud} pointerEvents="none">
        <Text style={styles.hudText}>{fps} FPS</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  hudText: {
    color: '#0f0',
    fontFamily: 'Menlo',
    fontSize: 14,
    fontWeight: '600',
  },
});
