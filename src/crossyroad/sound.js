// RN audio using react-native-sound.
// Loads bundled WAV/MP3 via Metro asset URI, then plays through native player.
import { Image } from 'react-native';
import Sound from 'react-native-sound';

import { AUDIO } from './audio-assets.js';

Sound.setCategory('Playback', true);

const _cache = new Map();
let _enabled = false;
let _buckIndex = 0;

function uriFor(handle) {
  return Image.resolveAssetSource(handle)?.uri ?? null;
}

function getSound(key, handle) {
  if (_cache.has(key)) return _cache.get(key);
  const uri = uriFor(handle);
  if (!uri) return null;
  const s = new Sound(uri, undefined, (err) => {
    if (err) console.warn('[sound] load failed', key, err.message);
  });
  _cache.set(key, s);
  return s;
}

function play(key, handle, volume = 0.6) {
  if (!_enabled) return;
  const s = getSound(key, handle);
  if (!s) return;
  s.stop(() => {
    s.setVolume(volume);
    s.play();
  });
}

export function initAudio() {
  _enabled = true;
  // Pre-warm a few sounds so first jump isn't laggy
  AUDIO.buck.forEach((h, i) => getSound(`buck${i}`, h));
  getSound('water', AUDIO.water);
  getSound('carHit', AUDIO.carHit);
  getSound('carSquish', AUDIO.carSquish);
  getSound('horn', AUDIO.horn);
  getSound('homer', AUDIO.homer);
}

export function playSound() {
  const i = _buckIndex % AUDIO.buck.length;
  _buckIndex = (_buckIndex + 1) % AUDIO.buck.length;
  play(`buck${i}`, AUDIO.buck[i], 0.5);
}

export function playSoundRiver() {
  play('water', AUDIO.water, 0.7);
}

export function playSoundCar() {
  // Mimic the original: pick between two car-impact samples.
  const choice = Math.random() < 0.5 ? 'carHit' : 'carSquish';
  const handle = choice === 'carHit' ? AUDIO.carHit : AUDIO.carSquish;
  play(choice, handle, 0.7);
}

export function playHorn() {
  play('horn', AUDIO.horn, 0.7);
}

export function playHomer() {
  // Homer plays one-shot on game over.
  const uri = uriFor(AUDIO.homer);
  if (!uri) return;
  const s = new Sound(uri, undefined, (err) => {
    if (err) return;
    s.setVolume(0.7);
    s.play(() => s.release());
  });
}
