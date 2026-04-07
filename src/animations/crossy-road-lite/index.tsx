import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Asset } from 'expo-asset';
import type { CanvasRef } from 'react-native-wgpu';
import { Canvas } from 'react-native-wgpu';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

import { makeWebGPURenderer } from '../three-wgpu-box/components/makeWebGPURenderer';

type CarLane = {
  z: number;
  dir: 1 | -1;
  speed: number;
  cars: THREE.Group[];
};

type LogLane = {
  z: number;
  dir: 1 | -1;
  speed: number;
  logs: THREE.Group[];
};

type TrainLane = {
  z: number;
  speed: number;
  active: boolean;
  cooldown: number;
  cars: THREE.Group[];
};

type MoveState = {
  elapsed: number;
  duration: number;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  baseY: number;
  targetY: number;
  targetRotation: number;
};

const STARTING_ROW = 8;
const CAMERA_EASING = 0.03;
const BASE_ANIMATION_TIME = 0.1;
const GROUND_LEVEL = 0.15;

const modelRefs = {
  playerObj: require('./assets/models/characters/chicken/0.obj'),
  playerTex: require('./assets/models/characters/chicken/0.png'),
  roadObj: require('./assets/models/environment/road/model.obj'),
  roadTex: require('./assets/models/environment/road/stripes-texture.png'),
  grassObj: require('./assets/models/environment/grass/model.obj'),
  grassTex: require('./assets/models/environment/grass/light-grass.png'),
  carObj: require('./assets/models/vehicles/taxi/0.obj'),
  carTex: require('./assets/models/vehicles/taxi/0.png'),
  riverObj: require('./assets/models/environment/river/0.obj'),
  riverTex: require('./assets/models/environment/river/0.png'),
  logObj: require('./assets/models/environment/log/0/0.obj'),
  logTex: require('./assets/models/environment/log/0/0.png'),
  railObj: require('./assets/models/environment/railroad/0.obj'),
  railTex: require('./assets/models/environment/railroad/0.png'),
  trainObj: require('./assets/models/vehicles/train/middle/0.obj'),
  trainTex: require('./assets/models/vehicles/train/middle/0.png'),
} as const;

const resolveAssetUri = async (moduleId: number) => {
  const asset = Asset.fromModule(moduleId);
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }
  return asset.localUri ?? asset.uri;
};

const loadObjTemplate = async (
  objRef: number,
  _texRef: number,
  color: string,
) => {
  const objUri = await resolveAssetUri(objRef);

  const objText = await (await fetch(objUri)).text();

  const group = new OBJLoader().parse(objText);
  group.traverse((child: any) => {
    if (child instanceof THREE.Mesh) {
      child.material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.05,
      });
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
};

export const CrossyRoadLite = () => {
  const ref = useRef<CanvasRef>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const queuedMoveRef = useRef<{ x: number; z: number } | null>(null);
  const restartRef = useRef<(() => void) | null>(null);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderRelease: (_, gesture) => {
          if (gameOverRef.current) {
            restartRef.current?.();
            return;
          }
          const { dx, dy } = gesture;
          if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
          if (Math.abs(dx) > Math.abs(dy)) {
            queuedMoveRef.current = { x: dx > 0 ? -1 : 1, z: 0 };
          } else {
            queuedMoveRef.current = { x: 0, z: dy > 0 ? -1 : 1 };
          }
        },
      }),
    [],
  );

  useEffect(() => {
    const context = ref.current?.getContext('webgpu');
    if (!context) return;

    let mounted = true;
    const renderer = makeWebGPURenderer(context as any, { antialias: true });

    const setup = async () => {
      await renderer.init();
      if (!mounted) return;

      const [
        playerTpl,
        roadTpl,
        grassTpl,
        carTpl,
        riverTpl,
        logTpl,
        railTpl,
        trainTpl,
      ] = await Promise.all([
        loadObjTemplate(modelRefs.playerObj, modelRefs.playerTex, '#f2f2f2'),
        loadObjTemplate(modelRefs.roadObj, modelRefs.roadTex, '#3b3b3b'),
        loadObjTemplate(modelRefs.grassObj, modelRefs.grassTex, '#78b84b'),
        loadObjTemplate(modelRefs.carObj, modelRefs.carTex, '#ffb000'),
        loadObjTemplate(modelRefs.riverObj, modelRefs.riverTex, '#4ea6ff'),
        loadObjTemplate(modelRefs.logObj, modelRefs.logTex, '#8c6239'),
        loadObjTemplate(modelRefs.railObj, modelRefs.railTex, '#6b6b6b'),
        loadObjTemplate(modelRefs.trainObj, modelRefs.trainTex, '#d64545'),
      ]);
      if (!mounted) return;

      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 1.1;

      const { width, height } = (context as any).canvas;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#87c6ff');

      const camera = new THREE.OrthographicCamera(
        -(width || 1),
        width || 1,
        height || 1,
        -(height || 1),
        -30,
        30,
      );
      camera.position.set(-1, 2.8, -2.9);
      camera.lookAt(0, 0, 0);
      camera.zoom = 400;
      camera.updateProjectionMatrix();

      const ambient = new THREE.AmbientLight('#ffffff', 1.1);
      scene.add(ambient);
      const sun = new THREE.DirectionalLight('#ffffff', 0.9);
      sun.position.set(5, 12, -2);
      scene.add(sun);

      const world = new THREE.Group();
      world.position.set(0, 0, -STARTING_ROW);
      scene.add(world);

      const floorGroup = new THREE.Group();
      world.add(floorGroup);

      const carLanes: CarLane[] = [];
      const logLanes: LogLane[] = [];
      const trainLanes: TrainLane[] = [];
      const laneCount = 30;
      for (let i = 0; i < laneCount; i++) {
        let laneKind: 'grass' | 'road' | 'river' | 'rail' = 'grass';
        if (i > 0 && i % 9 === 0) laneKind = 'rail';
        else if (i > 0 && i % 5 === 0) laneKind = 'river';
        else if (i % 2 === 1) laneKind = 'road';

        const laneModel =
          laneKind === 'road'
            ? roadTpl.clone(true)
            : laneKind === 'river'
              ? riverTpl.clone(true)
              : laneKind === 'rail'
                ? railTpl.clone(true)
                : grassTpl.clone(true);
        laneModel.position.set(0, 0, i);
        laneModel.scale.set(1, 1, 1);
        floorGroup.add(laneModel);

        if (laneKind === 'road') {
          const dir: 1 | -1 = i % 4 === 1 ? 1 : -1;
          const speed = (0.02 + Math.random() * 0.06) * 60;
          const cars: THREE.Group[] = [];
          const carCount = Math.floor(Math.random() * 2) + 1;
          for (let c = 0; c < carCount; c++) {
            const car = carTpl.clone(true);
            car.scale.set(0.85, 0.85, 0.85);
            car.position.set(-6 * dir - c * (Math.random() * 3 + 5) * dir, 0.08, i);
            if (dir < 0) car.rotation.y = Math.PI;
            world.add(car);
            cars.push(car);
          }
          carLanes.push({ z: i, dir, speed, cars });
        } else if (laneKind === 'river') {
          const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
          const speed = (0.02 + Math.random() * 0.05) * 60;
          const logs: THREE.Group[] = [];
          const logCount = Math.floor(Math.random() * 2) + 2;
          for (let c = 0; c < logCount; c++) {
            const log = logTpl.clone(true);
            log.scale.set(0.8, 0.8, 0.8);
            log.position.set(-6 * dir - c * (Math.random() * 3 + 5) * dir, 0.05, i);
            if (dir < 0) log.rotation.y = Math.PI;
            world.add(log);
            logs.push(log);
          }
          logLanes.push({ z: i, dir, speed, logs });
        } else if (laneKind === 'rail') {
          const trainCars: THREE.Group[] = [];
          for (let c = 0; c < 4; c++) {
            const trainCar = trainTpl.clone(true);
            trainCar.scale.set(0.95, 0.95, 0.95);
            trainCar.position.set(-20 - c * 1.4, 0.1, i);
            world.add(trainCar);
            trainCars.push(trainCar);
          }
          trainLanes.push({
            z: i,
            speed: 0.8 * 60,
            active: false,
            cooldown: 2 + (i % 3),
            cars: trainCars,
          });
        }
      }

      const player = playerTpl.clone(true);
      player.scale.set(0.9, 0.9, 0.9);
      player.position.set(0, GROUND_LEVEL, STARTING_ROW);
      player.rotation.y = Math.PI;
      world.add(player);

      const state = {
        targetX: 0 as number,
        targetZ: STARTING_ROW as number,
        moving: false,
        move: null as MoveState | null,
        onLog: null as null | { lane: LogLane; log: THREE.Group },
      };

      const resetGame = () => {
        gameOverRef.current = false;
        setGameOver(false);
        scoreRef.current = 0;
        setScore(0);
        player.position.set(0, GROUND_LEVEL, STARTING_ROW);
        player.rotation.set(0, Math.PI, 0);
        state.targetX = 0;
        state.targetZ = STARTING_ROW;
        state.moving = false;
        state.move = null;
        world.position.set(0, 0, -STARTING_ROW);
        state.onLog = null;
        queuedMoveRef.current = null;
      };
      restartRef.current = resetGame;

      const clock = new THREE.Clock();
      setLoading(false);

      const animate = () => {
        const dt = Math.min(clock.getDelta(), 0.033);

        if (!gameOverRef.current) {
          state.onLog = null;

          for (const lane of carLanes) {
            for (const car of lane.cars) {
              car.position.x += lane.speed * lane.dir * dt;
              if (car.position.x > 6) car.position.x = -6;
              if (car.position.x < -6) car.position.x = 6;

              const nearLane = Math.abs(car.position.z - player.position.z) < 0.4;
              const nearX = Math.abs(car.position.x - player.position.x) < 0.55;
              if (nearLane && nearX) {
                gameOverRef.current = true;
                setGameOver(true);
              }
            }
          }

          for (const lane of logLanes) {
            for (const log of lane.logs) {
              log.position.x += lane.speed * lane.dir * dt;
              if (log.position.x > 6) log.position.x = -6;
              if (log.position.x < -6) log.position.x = 6;

              const nearLane = Math.abs(log.position.z - player.position.z) < 0.38;
              const nearX = Math.abs(log.position.x - player.position.x) < 0.62;
              if (nearLane && nearX) {
                state.onLog = { lane, log };
              }
            }
          }

          for (const lane of trainLanes) {
            lane.cooldown -= dt;
            if (!lane.active && lane.cooldown <= 0) {
              lane.active = true;
              const fromLeft = Math.random() > 0.5;
              lane.speed = fromLeft ? 0.8 * 60 : -0.8 * 60;
              lane.cars.forEach((car, idx) => {
                car.rotation.y = lane.speed > 0 ? 0 : Math.PI;
                car.position.x = (lane.speed > 0 ? -20 : 20) - idx * 1.4 * Math.sign(lane.speed);
              });
            }

            if (lane.active) {
              for (const car of lane.cars) {
                car.position.x += lane.speed * dt;
                const nearLane = Math.abs(car.position.z - player.position.z) < 0.35;
                const nearX = Math.abs(car.position.x - player.position.x) < 0.7;
                if (nearLane && nearX) {
                  gameOverRef.current = true;
                  setGameOver(true);
                }
              }
              const allGone =
                lane.speed > 0
                  ? lane.cars.every(car => car.position.x > 20)
                  : lane.cars.every(car => car.position.x < -20);
              if (allGone) {
                lane.active = false;
                lane.cooldown = 2 + Math.random() * 3;
              }
            }
          }

          const move = queuedMoveRef.current;
          if (move && !state.moving) {
            queuedMoveRef.current = null;
            const nextX = THREE.MathUtils.clamp(state.targetX + move.x, -4, 4);
            const nextZ = Math.max(STARTING_ROW, state.targetZ + move.z);

            const dir = { x: nextX - state.targetX, z: nextZ - state.targetZ };
            let targetRotation = player.rotation.y;
            if (dir.x > 0) targetRotation = Math.PI * 0.5;
            if (dir.x < 0) targetRotation = -Math.PI * 0.5;
            if (dir.z > 0) targetRotation = 0;
            if (dir.z < 0) targetRotation = Math.PI;

            state.targetX = nextX;
            state.targetZ = nextZ;
            state.moving = true;
            state.move = {
              elapsed: 0,
              duration: BASE_ANIMATION_TIME * 2,
              fromX: player.position.x,
              fromZ: player.position.z,
              toX: state.targetX,
              toZ: state.targetZ,
              baseY: GROUND_LEVEL,
              targetY: GROUND_LEVEL,
              targetRotation,
            };

            if (move.z > 0 && state.targetZ > STARTING_ROW) {
              scoreRef.current += 1;
              setScore(scoreRef.current);
            }
          }

          if (state.move) {
            state.move.elapsed += dt;
            const t = Math.min(1, state.move.elapsed / state.move.duration);
            const airT = t <= 0.5 ? t / 0.5 : (t - 0.5) / 0.5;

            if (t <= 0.5) {
              player.position.x = THREE.MathUtils.lerp(state.move.fromX, state.move.fromX + (state.move.toX - state.move.fromX) * 0.75, airT);
              player.position.z = THREE.MathUtils.lerp(state.move.fromZ, state.move.fromZ + (state.move.toZ - state.move.fromZ) * 0.75, airT);
              player.position.y = THREE.MathUtils.lerp(state.move.baseY, state.move.targetY + 0.5, airT);
            } else {
              player.position.x = THREE.MathUtils.lerp(state.move.fromX + (state.move.toX - state.move.fromX) * 0.75, state.move.toX, airT);
              player.position.z = THREE.MathUtils.lerp(state.move.fromZ + (state.move.toZ - state.move.fromZ) * 0.75, state.move.toZ, airT);
              player.position.y = THREE.MathUtils.lerp(state.move.targetY + 0.5, state.move.targetY, airT);
            }

            player.rotation.y += (state.move.targetRotation - player.rotation.y) * 0.45;

            if (t >= 1) {
              player.position.set(state.move.toX, state.move.targetY, state.move.toZ);
              state.moving = false;
              state.move = null;
            }
          }

          const targetWorldZ = -(player.position.z - STARTING_ROW);
          world.position.z -= (world.position.z - targetWorldZ) * CAMERA_EASING;
          const targetWorldX = Math.max(-3, Math.min(2, -player.position.x));
          world.position.x += (targetWorldX - world.position.x) * CAMERA_EASING;

          const currentLane = Math.round(player.position.z);
          const onRiverLane = logLanes.some(l => l.z === currentLane);
          if (onRiverLane) {
            if (state.onLog) {
              player.position.x += state.onLog.lane.speed * state.onLog.lane.dir * dt;
              state.targetX = player.position.x;
            } else if (!state.moving && !state.move) {
              gameOverRef.current = true;
              setGameOver(true);
            }
          }

          if (player.position.z < camera.position.z - 1 || player.position.x < -5 || player.position.x > 5) {
            gameOverRef.current = true;
            setGameOver(true);
          }
        }

        renderer.render(scene, camera);
        (context as any).present();
      };

      renderer.setAnimationLoop(animate);
    };

    setup();

    return () => {
      mounted = false;
      renderer.setAnimationLoop(null);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Canvas ref={ref} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.hud}>
        {loading ? (
          <Text style={styles.loading}>Loading 3D models...</Text>
        ) : (
          <>
            <Text style={styles.score}>SCORE {score}</Text>
            {gameOver && (
              <Text style={styles.gameOver}>GAME OVER - SWIPE TO RESTART</Text>
            )}
          </>
        )}
      </View>
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gameOver: {
    color: '#ffeb3b',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  hud: {
    left: 14,
    position: 'absolute',
    top: 44,
  },
  loading: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  score: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
});
