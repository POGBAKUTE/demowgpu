import { useEffect, useRef, useState, useCallback } from 'react';
import { Animated } from 'react-native';
import {
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, type CanvasRef } from 'react-native-wgpu';
import {
  AmbientLight,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  VSMShadowMap,
} from 'three';

import { makeWebGPURenderer } from '../three-helpers/makeWebGPURenderer';
// @ts-ignore plain .js files
import { loadModel } from '../crossyroad/loader.js';
// @ts-ignore
import { getNext, woods, cars, isHitByCar, resetEnvironment } from '../crossyroad/environement.js';
// @ts-ignore
import { movePoulet, loose, moveCamera } from '../crossyroad/moove.js';
// @ts-ignore
import { initializeScore, updateScore, getScore } from '../crossyroad/score.js';
// @ts-ignore
import {
  initAudio,
  playSound,
  playSoundRiver,
  playSoundCar,
  playHorn,
  playHomer,
} from '../crossyroad/sound.js';
// @ts-ignore
import {
  getBestScore,
  saveBestScore,
  getUserName,
  setUserName,
} from '../crossyroad/storage.js';

const CHARACTERS: { id: string; label: string; path: string }[] = [
  { id: 'chicken', label: 'Chicken', path: 'assets/models/characters/chicken/0.obj' },
  { id: 'palmer', label: 'Palmer', path: 'assets/models/characters/palmer/palmer.obj' },
  { id: 'juwan', label: 'Juwan', path: 'assets/models/characters/juwan/juwan.obj' },
  { id: 'wheeler', label: 'Wheeler', path: 'assets/models/characters/wheeler/wheeler.obj' },
  { id: 'avocoder', label: 'Avocoder', path: 'assets/models/characters/avocoder/avocoder.obj' },
  { id: 'bacon', label: 'Bacon', path: 'assets/models/characters/bacon/bacon.obj' },
  { id: 'brent', label: 'Brent', path: 'assets/models/characters/brent/0.obj' },
];

export const CrossyRoadGame = ({ navigation }: { navigation: any }) => {
  const insets = useSafeAreaInsets();
  const ref = useRef<CanvasRef>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [characterPath, setCharacterPath] = useState(CHARACTERS[0].path);
  const [bestScore, setBestScore] = useState(0);
  const [userName, setUserNameState] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fps, setFps] = useState(0);
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const scoreOpacity = useRef(new Animated.Value(1)).current;

  const triggerScoreAnim = useCallback(() => {
    scoreAnim.setValue(0.6);
    scoreOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(scoreAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(scoreOpacity, { toValue: 0.4, duration: 300, useNativeDriver: true }),
        Animated.timing(scoreOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const log = (msg: string) => {
    console.log('[GAME]', msg);
  };

  const pouletRef = useRef<any>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const rendererRef = useRef<any>(null);
  const whereBlocksRef = useRef<number[]>([]);
  const animateRef = useRef<(t: number) => void>(() => {});
  const disposedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const [b, n] = await Promise.all([getBestScore(), getUserName()]);
      setBestScore(b);
      setUserNameState(n);
    })();
  }, []);

  const restart = () => {
    setOver(false);
    setScore(0);
    loose.car = false;
    loose.river = false;
    initializeScore();
    if (pouletRef.current) {
      pouletRef.current.position.set(0, 0.25, 0);
      pouletRef.current.rotation.set(0, 0, 0);
    }
    rendererRef.current?.setAnimationLoop(animateRef.current);
  };

  const beginGame = () => {
    initAudio();
    setStarted(true);
  };

  const onSaveName = async () => {
    const name = nameInput.trim();
    if (!name) return;
    await setUserName(name);
    setUserNameState(name);
  };

  useEffect(() => {
    if (!started) return;

    disposedRef.current = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
      log('useEffect started, ref=' + !!ref.current);
      const context = ref.current!.getContext('webgpu')!;
      log('context=' + !!context);
      const { width, height } = (context as any).canvas;
      log('canvas ' + width + 'x' + height);

      const scene = new Scene();
      sceneRef.current = scene;
      scene.background = new Color(0x87c6dd);

      const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
      cameraRef.current = camera;
      // Camera directly behind character, looking forward-down
      // Character starts at (0,0.25,0); camera at (0,6,-8) looking at (0,0,4)
      // → character appears ~65% from top, horizontally centered
      camera.position.set(0, 4, -5);
      camera.lookAt(0, 0, 2);

      scene.add(new AmbientLight(0xffffff, 0.8));
      const dir = new DirectionalLight(0xffffff, 1.5);
      dir.position.set(12, 20, -5);
      dir.castShadow = true;
      dir.shadow.mapSize.width = 2048;
      dir.shadow.mapSize.height = 2048;
      (dir.shadow as any).radius = 1; // VSMShadowMap blur radius — 1 = sharpest
      dir.shadow.camera.left = -20;
      dir.shadow.camera.right = 20;
      dir.shadow.camera.top = 20;
      dir.shadow.camera.bottom = -20;
      scene.add(dir);
      scene.add(dir.target);

      log('creating renderer...');
      const renderer = makeWebGPURenderer(context as any);
      await renderer.init();
      (renderer as any).shadowMap.enabled = true;
      (renderer as any).shadowMap.type = VSMShadowMap;
      rendererRef.current = renderer;
      log('renderer ready ' + width + 'x' + height);

      resetEnvironment();
      log('loading model: ' + characterPath);
      const chicken = await loadModel(characterPath);
      log('model loaded');
      // Center model geometry so all characters spawn at same screen position
      const bbox = new Box3().setFromObject(chicken);
      const center = new Vector3();
      bbox.getCenter(center);
      chicken.children.forEach((child: any) => {
        child.position.x -= center.x;
        child.position.z -= center.z;
        child.position.y -= bbox.min.y;
      });
      chicken.position.set(0, 0.25, 0);
      chicken.traverse((node: any) => {
        if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
      });
      scene.add(chicken);
      pouletRef.current = chicken;

      async function addEnvironmentBlock(i: number) {
        const block = await getNext(0, -0.4, i);
        if (block != null) scene.add(block);
      }
      for (let i = 0; i < 20; i++) {
        addEnvironmentBlock(i);
        whereBlocksRef.current.push(i);
      }
      log('env blocks queued');

      initializeScore();
      const clock = new Clock();
      let lastHorn = 0;

      const woodSpeed = 0.02;
      const carSpeed = 0.05;

      function moveWoodLogs() {
        woods.forEach((wood: any) => {
          wood.position.x += woodSpeed;
          if (wood.position.x > 10) wood.position.x = -10;
          if (!scene.children.includes(wood)) scene.add(wood);
        });
      }
      function moveCars() {
        cars.forEach((car: any) => {
          if (isNaN(car.position.x)) car.position.x = 0;
          car.position.x += carSpeed;
          if (car.position.x > 10) car.position.x = -10;
          if (!scene.children.includes(car)) scene.add(car);
          car.userData.box = new Box3().setFromObject(car);
        });
      }
      function removeOldBlocks(z: number) {
        scene.children.forEach((child: any) => {
          if (
            child.position.z < z - 10 &&
            child.type !== 'AmbientLight' &&
            child.type !== 'DirectionalLight' &&
            child !== chicken
          ) {
            const idx = whereBlocksRef.current.indexOf(child.position.z);
            if (idx >= 0) whereBlocksRef.current.splice(idx, 1);
            scene.remove(child);
          }
        });
      }
      function moveDirectionalLight() {
        const targetZ = chicken.position.z - 5;
        dir.position.z += (targetZ - dir.position.z) * 0.1;
        dir.target.position.z = chicken.position.z;
        dir.target.updateMatrixWorld();
      }
      async function fillMissingBlocks(currentZ: number) {
        for (let z = Math.floor(currentZ) + 10; z <= Math.floor(currentZ) + 20; z++) {
          if (!whereBlocksRef.current.includes(z)) {
            await addEnvironmentBlock(z);
            whereBlocksRef.current.push(z);
          }
        }
      }
      function updateEnvironment() {
        moveWoodLogs();
        moveCars();
        removeOldBlocks(chicken.position.z);
        moveDirectionalLight();
        fillMissingBlocks(chicken.position.z);
      }

      async function handleLoose() {
        const final = getScore();
        await saveBestScore(final);
        const b = await getBestScore();
        setBestScore(b);
        setOver(true);
        playHomer();
      }

      function isLoose() {
        if (isHitByCar(chicken.position.x, chicken.position.z) && !loose.car) {
          loose.car = true;
          chicken.rotation.z = -Math.PI / 2;
          chicken.rotation.x = Math.PI / 2;
          chicken.rotation.y = 0;
          chicken.position.x += 1.5;
          playSoundCar();
          renderer.setAnimationLoop(null);
          setTimeout(handleLoose, 1000);
          return;
        }
        if (loose.river) {
          chicken.position.y -= 0.4;
          playSoundRiver();
          renderer.setAnimationLoop(null);
          setTimeout(handleLoose, 1000);
        }
      }

      let lastScore = -1;
      let frameCount = 0;
      let fpsFrames = 0;
      let fpsLast = performance.now();
      const animate = (_t: number) => {
        const s = updateScore(chicken);
        if (s !== lastScore) {
          lastScore = s;
          setScore(s);
          if (s > 0) triggerScoreAnim();
        }
        updateEnvironment();
        // Camera slides with character (same angle, no lookAt per frame)
        camera.position.x += (chicken.position.x - camera.position.x) * 0.1;
        camera.position.z += ((chicken.position.z - 5) - camera.position.z) * 0.1;
        isLoose();

        const elapsed = clock.getElapsedTime();
        if (elapsed - lastHorn > 5) {
          lastHorn = elapsed;
          playHorn();
        }

        renderer.render(scene, camera);
        (context as any).present();
        frameCount++;
        fpsFrames++;
        const now = performance.now();
        if (now - fpsLast >= 1000) {
          setFps(Math.round(fpsFrames * 1000 / (now - fpsLast)));
          fpsFrames = 0;
          fpsLast = now;
        }
      };
      animateRef.current = animate;
      renderer.setAnimationLoop(animate);
      log('animation loop started');

      cleanup = () => renderer.setAnimationLoop(null);
      } catch (e: any) {
        console.error('GAME ERROR:', e);
        setErrorMsg(String(e?.message || e));
      }
    })();

    return () => {
      disposedRef.current = true;
      cleanup?.();
    };
  }, [started, characterPath]);

  const move = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (!pouletRef.current || over) return;
    playSound();
    if (dir === 'up') {
      const next = getScore() + 20;
      (async () => {
        // @ts-ignore
        const block = await (await import('../crossyroad/environement.js')).getNext(0, -0.4, next);
        if (block && sceneRef.current) sceneRef.current.add(block);
      })();
    }
    movePoulet(pouletRef.current, dir);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden />
      <Canvas ref={ref} style={{ flex: 1 }} />
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {!started && (
          <View style={[StyleSheet.absoluteFill, s.startContainer, { paddingTop: insets.top + 16 }]}>
            <Text style={s.title}>Crossy Road</Text>
            <Text style={s.subtitle}>Best: {bestScore}</Text>
            <Text style={s.label}>Pick a character</Text>
            <View style={s.charRow}>
              {CHARACTERS.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.charBtn, characterPath === c.path && s.charBtnActive]}
                  onPress={() => setCharacterPath(c.path)}
                >
                  <Text style={s.charText}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.startBtn} onPress={beginGame}>
              <Text style={s.startBtnText}>START</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Text style={s.backBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {started && (
          <>
            {/* Score center */}
            <Animated.View
              style={[s.scoreCenterWrap, { opacity: scoreOpacity, transform: [{ scale: scoreAnim }] }]}
              pointerEvents="none"
            >
              <Animated.Text style={s.scoreBig}>{score}</Animated.Text>
            </Animated.View>

            {/* HUD top-left */}
            <View style={[s.hudTop, { top: insets.top + 8 }]} pointerEvents="none">
              <Text style={s.bestText}>Best: {bestScore}</Text>
              {fps > 0 && <Text style={s.fpsText}>{fps} FPS</Text>}
              {userName ? <Text style={s.nameText}>{userName}</Text> : null}
              {errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}
            </View>

            {/* Top-right: Back + Home buttons */}
            <View style={[s.topRight, { top: insets.top + 8 }]}>
              <TouchableOpacity style={s.navBtn} onPress={() => { rendererRef.current?.setAnimationLoop(null); setStarted(false); setOver(false); setScore(0); initializeScore(); }}>
                <Text style={s.navBtnText}>{'< Menu'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.navBtn} onPress={() => navigation.navigate('Home')}>
                <Text style={s.navBtnText}>Home</Text>
              </TouchableOpacity>
            </View>

            {/* D-pad controls */}
            {!over && (
              <View style={[s.dpad, { bottom: insets.bottom + 8 }]}>
                <TouchableOpacity style={s.dBtn} onPress={() => move('up')}>
                  <Text style={s.dBtnText}>▲</Text>
                </TouchableOpacity>
                <View style={s.dRow}>
                  <TouchableOpacity style={s.dBtn} onPress={() => move('left')}>
                    <Text style={s.dBtnText}>◀</Text>
                  </TouchableOpacity>
                  <View style={s.dCenter} />
                  <TouchableOpacity style={s.dBtn} onPress={() => move('right')}>
                    <Text style={s.dBtnText}>▶</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={s.dBtn} onPress={() => move('down')}>
                  <Text style={s.dBtnText}>▼</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {over && (
          <View style={s.overlay}>
            <Text style={s.gameOver}>Game Over</Text>
            <Text style={s.finalScore}>Score: {score}</Text>
            <Text style={s.finalScore}>Best: {bestScore}</Text>
            {!userName && (
              <View style={s.nameRow}>
                <TextInput
                  style={s.input}
                  placeholder="Your name"
                  placeholderTextColor="#888"
                  value={nameInput}
                  onChangeText={setNameInput}
                />
                <TouchableOpacity style={s.smallBtn} onPress={onSaveName}>
                  <Text style={s.btnText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={s.btn} onPress={restart}>
              <Text style={s.btnText}>Restart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: '#73d6ff', marginTop: 10 }]} onPress={() => navigation.navigate('Home')}>
              <Text style={[s.btnText, { color: '#0a0e1a' }]}>Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  // Start screen
  startContainer: { flex: 1, backgroundColor: '#0a0e1a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 42, fontWeight: '800' },
  subtitle: { color: '#9ab', fontSize: 16, marginTop: 4, marginBottom: 24 },
  label: { color: '#fff', fontSize: 16, marginTop: 12, marginBottom: 8 },
  charRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 24 },
  charBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#1a2238', borderWidth: 2, borderColor: 'transparent' },
  charBtnActive: { borderColor: '#73d6ff' },
  charText: { color: '#fff', fontSize: 14 },
  startBtn: { paddingVertical: 14, paddingHorizontal: 48, backgroundColor: '#73d6ff', borderRadius: 12 },
  startBtnText: { color: '#0a0e1a', fontSize: 20, fontWeight: '800' },
  backBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 24 },
  backBtnText: { color: '#9ab', fontSize: 16 },

  // HUD
  hudTop: { position: 'absolute', left: 16 },
  scoreCenterWrap: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' },
  scoreBig: { color: '#fff', fontSize: 72, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 3 } },
  scoreText: { color: '#fff', fontFamily: 'Menlo', fontSize: 22, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 4 },
  bestText: { color: '#cfd', fontFamily: 'Menlo', fontSize: 14, marginTop: 2, textShadowColor: '#000', textShadowRadius: 4 },
  nameText: { color: '#fffd', fontFamily: 'Menlo', fontSize: 12, marginTop: 4, textShadowColor: '#000', textShadowRadius: 4 },
  fpsText: { color: '#0f0', fontFamily: 'Menlo', fontSize: 11, marginTop: 2, textShadowColor: '#000', textShadowRadius: 3 },
  errorText: { color: 'red', fontSize: 11, maxWidth: 300 },

  // Top-right nav buttons
  topRight: { position: 'absolute', right: 12, flexDirection: 'row', gap: 6 },
  navBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  navBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // D-pad
  dpad: { position: 'absolute', alignSelf: 'center', alignItems: 'center', gap: 2 },
  dRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dCenter: { width: 56, height: 56 },
  dBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  dBtnText: { color: '#fff', fontSize: 22, fontWeight: '700' },

  // Game over overlay
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  gameOver: { color: '#fff', fontSize: 36, fontWeight: '800' },
  finalScore: { color: '#fff', fontSize: 18, marginTop: 4 },
  nameRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
  input: { backgroundColor: '#1a2238', color: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 160 },
  smallBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#73d6ff', borderRadius: 8 },
  btn: { marginTop: 24, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: '#fff', borderRadius: 10 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
