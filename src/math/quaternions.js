// src/math/quaternions.js
export function qMul(a, b){ return {
  w: a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z,
  x: a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
  y: a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,
  z: a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w,
};}
export const qConj = q => ({ w:q.w, x:-q.x, y:-q.y, z:-q.z });
export function qNormalize(q){ const n=Math.hypot(q.w,q.x,q.y,q.z)||1; return {w:q.w/n,x:q.x/n,y:q.y/n,z:q.z/n}; }
export function qFromAxisAngle(axis, angle){
  const [x,y,z]=axis; const h=angle*0.5, s=Math.sin(h), L=Math.hypot(x,y,z)||1;
  return qNormalize({ w:Math.cos(h), x:s*x/L, y:s*y/L, z:s*z/L });
}
export function qSlerp(a,b,t){
  let dot=a.w*b.w+a.x*b.x+a.y*b.y+a.z*b.z;
  if(dot<0){ b={w:-b.w,x:-b.x,y:-b.y,z:-b.z}; dot=-dot; }
  if(dot>0.9995){ // lerp then renorm
    return qNormalize({ w:a.w+(b.w-a.w)*t, x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t, z:a.z+(b.z-a.z)*t });
  }
  const θ=Math.acos(Math.min(1,Math.max(-1,dot))), s=Math.sin(θ);
  const s1=Math.sin((1-t)*θ), s2=Math.sin(t*θ);
  return { w:(a.w*s1+b.w*s2)/s, x:(a.x*s1+b.x*s2)/s, y:(a.y*s1+b.y*s2)/s, z:(a.z*s1+b.z*s2)/s };
}
// Convenience: returns the pair (a,b) used in 4D rotation
export const makeDoubleRotor = (axisA,θA,axisB,θB)=>({ a:qFromAxisAngle(axisA,θA), b:qFromAxisAngle(axisB,θB) });
// 4D rotation using paired quats
export function rotate4D(v, a, b){
  const q={w:v[0],x:v[1],y:v[2],z:v[3]};
  const r=qMul(qMul(a,q), qConj(b));
  return [r.w,r.x,r.y,r.z];
}
export const normalize4 = v => { const n=Math.hypot(...v)||1; return v.map(c=>c/n); };

export function centerCube(Cube){
  return 
}