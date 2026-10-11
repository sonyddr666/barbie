// Exact face-to-face placement for rectangular construction pieces.
const TYPES = ['floor', 'wall', 'box', 'ramp'];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const center = e => [e.position[0], e.position[2]];
const aligned = e => Math.abs(Math.sin(e.rotation * 2)) < .00001;
function axes(e) { const c = Math.cos(e.rotation), s = Math.sin(e.rotation); return [[c, -s], [s, c]]; }
function extent(e, axis) { const [x, z] = axes(e); return Math.abs(dot(axis, x)) * e.size[0] / 2 + Math.abs(dot(axis, z)) * e.size[2] / 2; }
function tangentCenters(current, target, half, targetHalf, tolerance) {
  const options = [current, target, target + targetHalf - half, target - targetHalf + half];
  return options.filter((p, i) => options.indexOf(p) === i && Math.abs(p - current) <= tolerance && Math.min(p + half, target + targetHalf) - Math.max(p - half, target - targetHalf) >= 2 * Math.min(half, targetHalf) - .00001);
}
export function snapConnection(entity, others, tolerance = 1) {
  if (!TYPES.includes(entity.type) || !aligned(entity)) return null;
  const candidates = [], original = entity.position;
  const add = (position, target, kind, rank = 0) => {
    const distance = Math.hypot(...position.map((v, i) => v - original[i]));
    if (distance > tolerance + .00001) return;
    candidates.push({ position, targetId: target.id, kind, distance, score: distance + rank * tolerance });
  };
  for (const target of others) {
    if (target.id === entity.id || !target.visible || !TYPES.includes(target.type) || !aligned(target)) continue;
    if (entity.type === 'floor' && target.type === 'ramp') {
      const inverse = snapConnection(target, [entity], tolerance);
      if (inverse) add(original.map((v, i) => v - (inverse.position[i] - target.position[i])), target, inverse.kind);
      continue;
    }
    if (entity.type === 'ramp' && target.type === 'floor') {
      const [cross, depth] = axes(entity);
      for (const end of ['high', 'low']) {
        const height = original[1] + (end === 'high' ? entity.size[1] : 0);
        if (Math.abs(target.position[1] - height) > .25) continue;
        const forward = end === 'high' ? depth.map(v => -v) : depth;
        const a = dot(center(entity), forward), b = dot(center(target), forward);
        if (b < a - .001) continue;
        const desired = b - extent(target, forward) - entity.size[2] / 2;
        const ta = dot(center(entity), cross), tb = dot(center(target), cross);
        for (const tangent of tangentCenters(ta, tb, entity.size[0] / 2, extent(target, cross), tolerance)) {
          add([original[0] + forward[0] * (desired - a) + cross[0] * (tangent - ta), original[1] + target.position[1] - height, original[2] + forward[1] * (desired - a) + cross[1] * (tangent - ta)], target, end === 'high' ? 'topo da rampa / piso' : 'base da rampa / piso');
        }
      }
      continue;
    }
    if (entity.type === 'ramp' || target.type === 'ramp' || Math.abs(original[1] - target.position[1]) > .15) continue;
    const sameType = entity.type === target.type;
    for (const normal of axes(target)) {
      const tangent = [-normal[1], normal[0]], a = dot(center(entity), normal), b = dot(center(target), normal);
      const ha = extent(entity, normal), hb = extent(target, normal), ta = dot(center(entity), tangent), tb = dot(center(target), tangent);
      for (const sign of [-1, 1]) {
        const desired = b + sign * (ha + hb);
        for (const t of tangentCenters(ta, tb, extent(entity, tangent), extent(target, tangent), tolerance)) {
          add([original[0] + normal[0] * (desired - a) + tangent[0] * (t - ta), target.position[1], original[2] + normal[1] * (desired - a) + tangent[1] * (t - ta)], target, 'faces alinhadas', sameType ? 0 : 1);
        }
      }
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0] || null;
}
