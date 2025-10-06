// Stereographic projection from S^3 -> R^3
// Input: 4D vector v = [w, x, y, z]
// Steps:
// 1) Normalize v onto S^3 (unit 3-sphere): u = v / ||v||
// 2) Project from north pole N = (-1, 0, 0, 0) onto the hyperplane w = 0:
//    sigma(u) = (x, y, z) / (1 + w)
// Edge cases: if 1 + w ~= 0, push slightly to avoid blow-up.

export function projectStereographic(v) {
  const w=v[0], x=v[1], y=v[2], z=v[3];
  const n = Math.hypot(w,x,y,z) || 1;
  const W = w/n, X = x/n, Y = y/n, Z = z/n; // normalized to S^3
  let denom = 1 + W;
  // Avoid division by ~0 near the north pole
  if (Math.abs(denom) < 1e-6) denom = (denom >= 0 ? 1e-6 : -1e-6);
  return [ X/denom, Y/denom, Z/denom ];
}