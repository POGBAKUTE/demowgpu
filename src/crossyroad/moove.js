import { PositionOccupied, PositionOccupiedWood, PositionOccupiedRiver, isHitByCar } from "./environement";

export const loose = { river: false, car: false };

const moveQueue = [];
let isMoving = false;

export function movePoulet(poulet, direction) {
    if (moveQueue.length >= 3) {
        return;
    }
    moveQueue.push(direction);
    if (!isMoving) {
        processQueue(poulet);
    }
}

function processQueue(poulet) {
    if (moveQueue.length === 0) {
        isMoving = false;
        return;
    }

    isMoving = true;
    const direction = moveQueue.shift();
    executeMove(poulet, direction, processQueue);
}

function executeMove(poulet, direction, callback) {
    const distance = 1;
    const duration = 500;
    const startTime = performance.now();
    const startPosition = { x: poulet.position.x, z: poulet.position.z };

    function animate() {
        const currentTime = performance.now();
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        let jumped = false;
        if (PositionOccupied(Math.floor(startPosition.x), Math.floor(startPosition.z), direction)) {
            jumped = true;
        }

        if (!jumped) {
            switch (direction) {
                case 'down':
                    if (startPosition.z > 0) {
                        poulet.position.z = startPosition.z - distance * progress;
                        poulet.position.y = Math.sin(progress * Math.PI) * 0.5;
                        poulet.rotation.y = Math.PI;
                        if (progress === 1) {
                            poulet.position.z = Math.round(poulet.position.z);
                        }
                        break;
                    }
                    poulet.rotation.y = Math.PI;
                    jumped = true;
                    break;
                case 'up':
                    poulet.position.z = startPosition.z + distance * progress;
                    poulet.position.y = Math.sin(progress * Math.PI) * 0.5;
                    poulet.rotation.y = 0;
                    if (progress === 1) {
                        poulet.position.z = Math.round(poulet.position.z);
                    }
                    break;
                case 'right':
                    if (startPosition.x > -4) {
                        poulet.position.x = startPosition.x - distance * progress;
                        poulet.position.y = Math.sin(progress * Math.PI) * 0.5;
                        poulet.rotation.y = -Math.PI / 2;
                        if (progress === 1) poulet.position.x = Math.round(poulet.position.x);
                        break;
                    }
                    poulet.rotation.y = -Math.PI / 2;
                    jumped = true;
                    break;
                case 'left':
                    if (startPosition.x < 4) {
                        poulet.position.x = startPosition.x + distance * progress;
                        poulet.position.y = Math.sin(progress * Math.PI) * 0.5;
                        poulet.rotation.y = Math.PI / 2;
                        if (progress === 1) poulet.position.x = Math.round(poulet.position.x);
                        break;
                    }
                    poulet.rotation.y = Math.PI / 2;
                    jumped = true;
                    break;
                case 'jump':
                    jumped = true;
                    break;
            }
        }

        if (jumped) {
            poulet.position.y = Math.sin(progress * Math.PI) * 0.5;
        }

        if (PositionOccupiedWood(Math.floor(poulet.position.x), Math.floor(poulet.position.z))) {
            if (!poulet.movingOnWood) {
                poulet.movingOnWood = true;
                function moveOnWood() {
                    if (!poulet.movingOnWood) return;
                    poulet.position.x += 0.02;
                    requestAnimationFrame(moveOnWood);
                    if (poulet.position.x > 4) {
                        loose.river = true;
                    }
                }
                moveOnWood();
            }
        } else {
            poulet.movingOnWood = false;
        }
        if (PositionOccupiedRiver(poulet.position.x, poulet.position.z)) {
            loose.river = true;
            poulet.position.y = - Math.sin(progress * Math.PI) * 0.5;
        }
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            callback(poulet);
        }
    }

    requestAnimationFrame(animate);
}

export function moveCamera(z, camera) {
    if (!camera) {
        console.error('Poulet or camera is not defined');
        return;
    }

    const duration = 500;
    const startTime = performance.now();
    const startPosition = { z: camera.position.z, rotationY: camera.rotation.y };

    function animate() {
        const currentTime = performance.now();
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        camera.position.z = startPosition.z + (z - startPosition.z) * progress;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}