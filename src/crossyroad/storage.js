// AsyncStorage helpers for persistent best score + user name.
import AsyncStorage from '@react-native-async-storage/async-storage';

const BEST_KEY = 'crossyroad.bestScore';
const NAME_KEY = 'crossyroad.userName';

export async function getBestScore() {
  const v = await AsyncStorage.getItem(BEST_KEY);
  return v ? parseInt(v, 10) : 0;
}

export async function saveBestScore(score) {
  const cur = await getBestScore();
  if (score > cur) await AsyncStorage.setItem(BEST_KEY, String(score));
}

export async function getUserName() {
  return (await AsyncStorage.getItem(NAME_KEY)) ?? '';
}

export async function setUserName(name) {
  await AsyncStorage.setItem(NAME_KEY, name);
}
