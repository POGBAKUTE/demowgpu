import * as THREE from 'three';
import type { CanvasRef } from 'react-native-wgpu';
import { Canvas } from 'react-native-wgpu';
import { PixelRatio, Text, View, StyleSheet } from 'react-native';
import { useEffect, useRef } from 'react';
import { color, pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode';

import { useGLTF } from './assets/AssetManager';
import { makeWebGPURenderer } from '../three-wgpu-box/components/makeWebGPURenderer';

const ION_DRIVE_URL =
  'https://raw.githubusercontent.com/wcandillon/react-native-webgpu/main/apps/example/src/ThreeJS/assets/PrimaryIonDrive.glb';

export const ThreeWGPUPostProcessing = () => {
  const gltf = useGLTF(ION_DRIVE_URL);
  const ref = useRef<CanvasRef>(null);

  useEffect(() => {
    if (!gltf) {
      return;
    }

    const context = ref.current?.getContext('webgpu')!;
    const canvas = (context as any).canvas as HTMLCanvasElement;
    canvas.width = canvas.clientWidth * PixelRatio.get();
    canvas.height = canvas.clientHeight * PixelRatio.get();

    const { width, height } = (context as any).canvas;

    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 100);
    camera.position.set(-5, -8, -3.5);
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();
    (scene as any).backgroundNode = color(0);
    camera.lookAt(0, 1, 0);

    const clock = new THREE.Clock();

    const light = new THREE.SpotLight(0xffffff, 1);
    light.power = 2000;
    camera.add(light);
    scene.add(camera);

    const object = gltf.scene;
    const mixer = new THREE.AnimationMixer(object);

    const action = mixer.clipAction(gltf.animations[0]);
    action.play();

    scene.add(object);

    const renderer = makeWebGPURenderer(context as any, { antialias: false });
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.3;

    const postProcessing = new (THREE as any).PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    const scenePassColor = scenePass.getTextureNode('output');
    const bloomPass = bloom(scenePassColor);

    postProcessing.outputNode = scenePassColor.add(bloomPass);

    function animate() {
      const delta = clock.getDelta();
      mixer.update(delta);
      postProcessing.render();
      (context as any).present();
    }

    renderer.setAnimationLoop(animate);
    return () => {
      renderer.setAnimationLoop(null);
    };
  }, [gltf, ref]);

  return (
    <View style={styles.root}>
      <Text>Loading assets...</Text>
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
