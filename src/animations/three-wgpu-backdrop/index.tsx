import * as THREE from 'three';
import type { CanvasRef } from 'react-native-wgpu';
import { Canvas } from 'react-native-wgpu';
import { PixelRatio, Text, View, StyleSheet } from 'react-native';
import { useEffect, useRef } from 'react';
import {
  float,
  vec3,
  color,
  viewportSharedTexture,
  checker,
  uv,
  time,
  oscSine,
  output,
  posterize,
  hue,
  grayscale,
  saturation,
  blendOverlay,
  viewportUV,
  viewportSafeUV,
  screenUV,
} from 'three/tsl';

import { useGLTF } from '../three-wgpu-post-processing/assets/AssetManager';
import { makeWebGPURenderer } from '../three-wgpu-box/components/makeWebGPURenderer';

const MICHELLE_URL =
  'https://raw.githubusercontent.com/wcandillon/react-native-webgpu/main/apps/example/src/ThreeJS/assets/michelle/model.gltf';

export const ThreeWGPUBackdrop = () => {
  const gltf = useGLTF(MICHELLE_URL);
  const ref = useRef<CanvasRef>(null);

  useEffect(() => {
    if (!gltf) {
      return;
    }

    const context = ref.current?.getContext('webgpu')!;
    const rotate = true;
    const canvas = (context as any).canvas as HTMLCanvasElement;
    canvas.width = canvas.clientWidth * PixelRatio.get();
    canvas.height = canvas.clientHeight * PixelRatio.get();

    const { width, height } = (context as any).canvas;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 100);
    camera.position.set(1, 2, 3);

    const scene = new THREE.Scene();
    (scene as any).backgroundNode = screenUV.y.mix(color(0x66bbff), color(0x4466ff));
    camera.lookAt(0, 1, 0);

    const clock = new THREE.Clock();

    const light = new THREE.SpotLight(0xffffff, 1);
    light.power = 2000;
    camera.add(light);
    scene.add(camera);

    const object = gltf.scene;
    const mixer = new THREE.AnimationMixer(object);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { material } = object.children?.[0]?.children?.[0] as any;

    if (material) {
      material.outputNode = oscSine(time.mul(0.1)).mix(
        output,
        posterize(output.add(0.1), 4).mul(2),
      );
    }

    if (gltf.animations?.[0]) {
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }

    scene.add(object);

    const geometry = new THREE.SphereGeometry(0.3, 32, 16);

    const portals = new THREE.Group();
    scene.add(portals);

    function addBackdropSphere(backdropNode: any, backdropAlphaNode: any = null) {
      const distance = 1;
      const id = portals.children.length;
      const rotation = THREE.MathUtils.degToRad(id * 45);

      const material = new (THREE as any).MeshStandardNodeMaterial({
        color: 0x0066ff,
      });
      material.roughnessNode = float(0.2);
      material.metalnessNode = float(0);
      material.backdropNode = backdropNode;
      material.backdropAlphaNode = backdropAlphaNode;
      material.transparent = true;

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        Math.cos(rotation) * distance,
        1,
        Math.sin(rotation) * distance,
      );

      portals.add(mesh);
    }

    addBackdropSphere(hue(viewportSharedTexture().bgr, oscSine().mul(Math.PI)));
    addBackdropSphere(viewportSharedTexture().rgb.oneMinus());
    addBackdropSphere(grayscale(viewportSharedTexture().rgb));
    addBackdropSphere(saturation(viewportSharedTexture().rgb, 10), oscSine());
    addBackdropSphere(
      blendOverlay(viewportSharedTexture().rgb, checker(uv().mul(10))),
    );
    addBackdropSphere(
      viewportSharedTexture(viewportSafeUV(viewportUV.mul(40).floor().div(40))),
    );
    addBackdropSphere(
      viewportSharedTexture(
        viewportSafeUV(viewportUV.mul(80).floor().div(80)),
      ).add(color(0x0033ff)),
    );
    addBackdropSphere(vec3(0, 0, viewportSharedTexture().b));

    const renderer = makeWebGPURenderer(context as any, { antialias: false });
    renderer.setAnimationLoop(animate);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.3;

    function animate() {
      const delta = clock.getDelta();
      mixer.update(delta);

      if (rotate) {
        portals.rotation.y += delta * 0.5;
      }

      renderer.render(scene, camera);
      (context as any).present();
    }

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
