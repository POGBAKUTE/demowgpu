// InstancedMesh pool for Crossy Road trees (static, never move after spawn).
// One InstancedMesh per tree variant; trees added to scene once instead of
// per-instance Mesh clones → 1 draw call per variant regardless of tree count.
import { InstancedMesh, Matrix4, Mesh } from 'three';

const CAPACITY = 256; // upper bound on simultaneous trees of any single variant

// variant key ('tree0' | 'tree1' | 'tree2') -> { mesh: InstancedMesh, count: number, free: number[] }
const pools = {};

// Extract the first Mesh (geometry + material) from a Group returned by loadModel.
function firstMesh(group) {
  let found = null;
  group.traverse((node) => {
    if (!found && node instanceof Mesh) found = node;
  });
  return found;
}

export function initTreeInstances(variantGroups) {
  // variantGroups: { tree0: Group, tree1: Group, tree2: Group }
  for (const key of Object.keys(variantGroups)) {
    if (pools[key]) continue;
    const proto = firstMesh(variantGroups[key]);
    if (!proto) continue;
    const inst = new InstancedMesh(proto.geometry, proto.material, CAPACITY);
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.count = 0;
    inst.frustumCulled = false; // we manage positions explicitly
    pools[key] = { mesh: inst, count: 0, free: [] };
  }
}

export function getTreeMeshes() {
  return Object.values(pools).map((p) => p.mesh);
}

const _m = new Matrix4();
// Spawn an instance at world position (x, y, z). Returns instance id, or -1 if pool not init.
export function spawnTreeInstance(variant, x, y, z) {
  const pool = pools[variant];
  if (!pool) return -1;
  let id;
  if (pool.free.length > 0) {
    id = pool.free.pop();
  } else {
    if (pool.count >= CAPACITY) return -1;
    id = pool.count++;
    pool.mesh.count = pool.count;
  }
  _m.makeTranslation(x, y, z);
  pool.mesh.setMatrixAt(id, _m);
  pool.mesh.instanceMatrix.needsUpdate = true;
  return id;
}

const _zero = new Matrix4().makeScale(0, 0, 0); // hide released instances
export function releaseTreeInstance(variant, id) {
  const pool = pools[variant];
  if (!pool || id < 0) return;
  pool.mesh.setMatrixAt(id, _zero);
  pool.mesh.instanceMatrix.needsUpdate = true;
  pool.free.push(id);
}

export function resetTreeInstances() {
  for (const p of Object.values(pools)) {
    p.count = 0;
    p.free.length = 0;
    p.mesh.count = 0;
  }
}
