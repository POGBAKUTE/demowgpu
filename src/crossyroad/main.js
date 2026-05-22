"use strict";

import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Box3,
  AmbientLight,
  PCFSoftShadowMap,
  DirectionalLight,
  Color,
  Clock
} from 'three';

import { movePoulet, loose, moveCamera } from './moove.js';
import { loadModel } from './loader.js';
import { getNext, woods, cars, isHitByCar, blockPosition } from './environement.js';
import { initializeScore, updateScore } from './score.js';
import { initAudio, playSound, playSoundRiver, playSoundCar, playHorn, playHomer } from './sound.js';
import { saveScore, displayLeaderboard } from './leaderboard.js';

////////////////////////////////////IMPORTANT DEFINIONS////////////////////////////////////

const scene = new Scene();
const aspect = window.innerWidth / window.innerHeight;
const camera = new PerspectiveCamera(75, aspect, 0.1, 1000);

////////////////////////////////////LIGHT////////////////////////////////////

const light = new AmbientLight(0xffffff, 0.8);

const renderer = new WebGLRenderer();

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;

const directionalLight = new DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(12, 20, -5);
directionalLight.castShadow = true;

directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;

scene.add(directionalLight);

scene.add(light);
scene.background = new Color(0x87C6DD);

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

////////////////////////////////////CAMERA////////////////////////////////////

camera.position.set(-4, 6.5, -15);
camera.lookAt(4, -1, 0);

////////////////////////////////////START POPUP////////////////////////////////////
const startPopup = document.createElement('div');
startPopup.id = 'startPopup';

const startButton = document.createElement('button');
startButton.innerText = 'START';
startButton.id = 'startButton';

startPopup.appendChild(startButton);
document.body.appendChild(startPopup);

startButton.addEventListener('click', () => {
  startPopup.style.display = 'none';
  initAudio(camera);
  animation();
});

////////////////////////////////////LOAD MODEL////////////////////////////////////

let poulet = null;

export async function addModel(modelPath, texturePath) {
  const model = await loadModel(modelPath, texturePath);

  model.position.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(model);

  poulet = model;
}

poulet = addModel('assets/models/characters/chicken/0.obj', 'assets/models/characters/chicken/0.png');

const clock = new Clock();

////////////////////////////////////ENVIRONEMENT////////////////////////////////////
async function addEnvironmentBlock(i) {
  const block = await getNext(0, -0.4, i);
  if (block != null) {
    block.traverse((child) => {
      if (child.isMesh && !child.name.startsWith('tree')) {
        child.castShadow = false;
        child.receiveShadow = true;
      }
    });
    scene.add(block);
  }
}
const where_blocks = []

function initEnvironmentBlocks() {
  for (let i = 0; i < 20; i++) {
    addEnvironmentBlock(i);
    where_blocks.push(i);
  }
}
initEnvironmentBlocks();

////////////////////////////////////AUDIO////////////////////////////////////
initAudio(camera);

////////////////////////////////////SCORE////////////////////////////////////
initializeScore();
let currentScore = 0;
function saveBestScore(score) {
  const bestScore = localStorage.getItem('bestScore');
  if (!bestScore || score > bestScore) {
    localStorage.setItem('bestScore', score);
  }
}

function getBestScore() {
  return localStorage.getItem('bestScore') || 0;
}

///////////////////////////////////BOUCLE DE RENDU////////////////////////////////////

const animation = () => {
  renderer.setAnimationLoop(animation);

  currentScore = updateScore(poulet);

  updateEnvironment();
  moveCamera(poulet.position.z - 5, camera);
  isLoose();

  renderer.render(scene, camera);

  const elapsed = clock.getElapsedTime();
  if (elapsed % 5 < 0.1) {
    playHorn();
  }
};

poulet.then(() => {
  animation();
});

////////////////////////////////////EVENT LISTENER////////////////////////////////////

window.addEventListener('resize', onWindowResize, false);

window.addEventListener('keydown', (event) => {
  playSound();
  if (poulet) {
    switch (event.key) {
      case 'ArrowUp':
        addEnvironmentBlock(currentScore + 20);
        movePoulet(poulet, 'up');
        break;
      case 'ArrowDown':
        movePoulet(poulet, 'down');
        break;
      case 'ArrowLeft':
        movePoulet(poulet, 'left');
        break;
      case 'ArrowRight':
        movePoulet(poulet, 'right');
        break;
      case ' ':
        movePoulet(poulet, 'jump');
        break;
    }
  }
});

let touchStartX = 0;
let touchStartY = 0;
let firstTouch = true;

window.addEventListener('touchstart', (event) => {
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
});

window.addEventListener('touchend', (event) => {
  if (firstTouch) {
    firstTouch = false;
    return;
  }
  const touchEndX = event.changedTouches[0].clientX;
  const touchEndY = event.changedTouches[0].clientY;

  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;
  playSound();
  if (Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX > 0) {
      movePoulet(poulet, 'right');
    } else {
      movePoulet(poulet, 'left');
    }
  } else {
    if (diffY > 0) {
      movePoulet(poulet, 'down');
    } else {
      addEnvironmentBlock(currentScore + 20);
      movePoulet(poulet, 'up');
    }
  }
});

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

////////////////////////////////////UPDATE ENVIRONNEMENT////////////////////////////////////
const woodSpeed = 0.02;
const carSpeed = 0.05;

function moveWoodLogs() {
  woods.forEach(wood => {
    wood.position.x += woodSpeed;
    if (wood.position.x > 10) {
      wood.position.x = -10;
    }
    if (!scene.children.includes(wood)) {
      scene.add(wood);
    }
  });
}

function moveCars() {
  cars.forEach(car => {
    if (isNaN(car.position.x)) {
      car.position.x = 0;
    }

    car.position.x += carSpeed;
    if (car.position.x > 10) {
      car.position.x = -10;
    }
    if (!scene.children.includes(car)) {
      scene.add(car);
    }
    const carBox = new Box3().setFromObject(car);
    car.userData.box = carBox;
  });
}

function removeOldBlocks(z) {
  scene.children.forEach(child => {
    if (child.position.z < z - 10 && child !== light) {
      where_blocks.splice(where_blocks.indexOf(child.position.z), 1);
      scene.remove(child);
    }
  });
}

function movedirectionalLight() {
  const targetZ = poulet.position.z - 5;
  directionalLight.position.z += (targetZ - directionalLight.position.z) * 0.1;
  directionalLight.target.position.z = poulet.position.z;
  directionalLight.target.updateMatrixWorld();
}

async function fillMissingBlocks(currentZ) {
  for (let z = Math.floor(currentZ) + 10; z <= Math.floor(currentZ) + 20; z++) {
    if (!where_blocks.includes(z)) {
      await addEnvironmentBlock(z);
      where_blocks.push(z);
    }
  }
}

function updateEnvironment() {
  moveWoodLogs();
  moveCars();
  removeOldBlocks(poulet.position.z);
  movedirectionalLight();
  fillMissingBlocks(poulet.position.z);
}

////////////////////////////////////USER NAME////////////////////////////////////
function getUserName() {
  return localStorage.getItem('userName');
}

function setUserName(name) {
  localStorage.setItem('userName', name);
}

////////////////////////////////////LOOOOOOOOOOOOOOOOSE////////////////////////////////////
function isLoose() {
  saveBestScore(currentScore);
  if (isHitByCar(poulet.position.x, poulet.position.z)) {
    loose.car = true;
    poulet.rotation.z = -Math.PI / 2;
    poulet.rotation.x = Math.PI / 2;
    poulet.rotation.y = 0;
    poulet.position.x += 1.5;
  }
  if (loose.river) {
    poulet.position.y -= 0.4;
    playSoundRiver();
    renderer.setAnimationLoop(null);
    setTimeout(() => {
      popUpLoose();
      playHomer();
    }, 1000);
  }
  if (loose.car) {
    playSoundCar();
    renderer.setAnimationLoop(null);
    setTimeout(() => {
      popUpLoose();
      playHomer();
    }, 1000);
  }
}

function popUpLoose() {
  const loosePopup = document.createElement('div');
  loosePopup.id = 'loosePopup';

  const scoreMessage = document.createElement('div');
  scoreMessage.innerText = `Score: ${currentScore}`;
  scoreMessage.id = 'scoreMessage';

  const bestScore = getBestScore();
  const bestScoreMessage = document.createElement('div');
  bestScoreMessage.innerText = `Best Score: ${bestScore}`;
  bestScoreMessage.id = 'bestScoreMessage';

  const restartButton = document.createElement('button');
  restartButton.innerText = 'Restart';
  restartButton.id = 'restartButton';
  restartButton.addEventListener('click', () => {
    window.location.reload();
  });

  loosePopup.appendChild(scoreMessage);
  loosePopup.appendChild(bestScoreMessage);
  loosePopup.appendChild(restartButton);

  const userName = getUserName();
  if (userName) {
    if (currentScore >= getBestScore()) {
      saveScore(userName, currentScore);
    }
    displayLeaderboard();
  } else {
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Enter your name';
    nameInput.id = 'nameInput';

    const saveButton = document.createElement('button');
    saveButton.innerText = 'Save Score';
    saveButton.id = 'saveButton';
    saveButton.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (name) {
        setUserName(name);
        if (currentScore >= getBestScore()) {
          saveScore(name, currentScore);
        }
        displayLeaderboard();
        nameInput.style.display = 'none';
        saveButton.style.display = 'none';
      }
    });

    loosePopup.appendChild(nameInput);
    loosePopup.appendChild(saveButton);
  }

  document.body.appendChild(loosePopup);

  displayLeaderboard();
}

////////////////////////////////////DISPLAY LEADERBOARD ON LOAD////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
  displayLeaderboard();
});