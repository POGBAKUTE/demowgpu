// RN port — score read via getScore(), no DOM.
let _score = 0;
export function initializeScore() { _score = 0; }
export function updateScore(poulet) {
  if (poulet != null) {
    const cur = Math.floor(poulet.position.z);
    if (cur >= _score) _score = cur;
    return _score;
  }
  return _score;
}
export function getScore() { return _score; }
