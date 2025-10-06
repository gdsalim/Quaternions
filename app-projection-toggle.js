// App with projection toggle: 'W-Perspective' and 'Stereographic S^3'
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import GUI from 'https://unpkg.com/lil-gui@0.19/dist/lil-gui.esm.js';
import { projectStereographic } from './projection-stereographic.js';

// ---------- Quaternion helpers ----------
function qMul(a, b){
  return {
    w: a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z,
    x: a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
    y: a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,
    z: a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w,
  };
}
function qConj(q){ return { w:q.w, x:-q.x, y:-q.y, z:-q.z }; }
function qNormalize(q){ const n=Math.hypot(q.w,q.x,q.y,q.z)||1; return {w:q.w/n,x:q.x/n,y:q.y/n,z:q.z/n}; }
function qFromAxisAngle(axis, angle){
  const [x,y,z] = axis; const h = angle*0.5; const s = Math.sin(h);
  const len = Math.hypot(x,y,z) || 1; return qNormalize({ w: Math.cos(h), x: s*x/len, y: s*y/len, z: s*z/len });
}

function rotate4D(v, a, b){
  const q = { w: v[0], x: v[1], y: v[2], z: v[3] };
  const res = qMul(qMul(a, q), qConj(b));
  return [res.w, res.x, res.y, res.z];
}

// ---------- 4D Shapes ----------
function genTesseract(size=1){
  const verts=[]; const s=size;
  for (let w of [-s, s]) for (let x of [-s, s]) for (let y of [-s, s]) for (let z of [-s, s]) verts.push([w,x,y,z]);
  const edges=[];
  for (let i=0;i<verts.length;i++) for (let j=i+1;j<verts.length;j++){
    let diff=0; for (let k=0;k<4;k++) if(verts[i][k]!==verts[j][k]) diff++;
    if (diff===1) edges.push([i,j]);
  }
  return { verts, edges };
}
function genOrthoplex(size=1){
  const s=size; const verts=[ [s,0,0,0], [-s,0,0,0], [0,s,0,0], [0,-s,0,0], [0,0,s,0], [0,0,-s,0], [0,0,0,s], [0,0,0,-s] ];
  const edges=[]; // connect all pairs except exact opposites
  for (let i=0;i<verts.length;i++) for (let j=i+1;j<verts.length;j++){
    const opp = (verts[i][0]===-verts[j][0] && verts[i][1]===-verts[j][1] && verts[i][2]===-verts[j][2] && verts[i][3]===-verts[j][3]);
    if (!opp) edges.push([i,j]);
  }
  return { verts, edges };
}
function genSimplex(size=1){
  const e = [ [1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,0,1] ];
  const c = [1/5,1/5,1/5,1/5,1/5];
  const verts = e.map(v=> v.map((vi,i)=> (vi - c[i])) ).map(v=> [v[0],v[1],v[2],v[3]] );
  const norm = Math.hypot(...verts[0]);
  const s = size/norm; for (let v of verts){ v[0]*=s; v[1]*=s; v[2]*=s; v[3]*=s; }
  const edges=[]; for (let i=0;i<verts.length;i++) for (let j=i+1;j<verts.length;j++) edges.push([i,j]);
  return { verts, edges };
}

const SHAPES = {
  'Tesseract (8-cell)': genTesseract,
  'Orthoplex (16-cell)': genOrthoplex,
  'Simplex (5-cell)': genSimplex,
};

// ---------- three.js scene ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 100);
camera.position.set(0,0,6);
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
// grid
const grid = new THREE.GridHelper(8, 16, 0x223344, 0x223344);
grid.rotation.x = Math.PI/2; grid.position.z = -2.5; scene.add(grid);
// light
const light = new THREE.AmbientLight(0xffffff, 0.9); scene.add(light);

let lineGeom = new THREE.BufferGeometry();
let lineMat  = new THREE.LineBasicMaterial({ color: 0x8ab4f8 });
let lines    = new THREE.LineSegments(lineGeom, lineMat); scene.add(lines);

let ptsGeom = new THREE.BufferGeometry();
let ptsMat  = new THREE.PointsMaterial({ size: 6, sizeAttenuation: false, color: 0xffffff });
let points  = new THREE.Points(ptsGeom, ptsMat); scene.add(points);

let verts4 = [], edges = [];
let t=0, dt=1/60;

//--------------HUD-----------------
const hud = document.createElement('div');
Object.assign(hud.style, {
  position: 'fixed',
  left: '12px',
  bottom: '12px',
  padding: '8px 10px',
  background: 'rgba(0,0,0,0.45)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  font: '12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif',
  color: '#c9d1d9',
  pointerEvents: 'none',
});
document.body.appendChild(hud);

//--------------parameters------------
const params = {
  shape: 'Tesseract (8-cell)',
  size: 1,
  projection: 'W-Perspective', // 'W-Perspective' | 'Stereographic S^3'
  speedA: 1.0,
  speedB: 0.7,
  depth: 4.0,
  edgeColor: '#8ab4f8',
  vertexColor: '#ffffff',
  mode: 'Auto',       // 'Auto' | 'Manual'
  angleA: 0,          // degrees of rotation, only used in Manual
  angleB: 0           // degrees of rotation only used in Manual
};

function allocateBuffers(){
  const posLines = new Float32Array(edges.length * 2 * 3);
  lineGeom.dispose();
  lineGeom = new THREE.BufferGeometry();
  lineGeom.setAttribute('position', new THREE.BufferAttribute(posLines, 3));
  lines.geometry = lineGeom;

  const posPts = new Float32Array(verts4.length * 3);
  ptsGeom.dispose();
  ptsGeom = new THREE.BufferGeometry();
  ptsGeom.setAttribute('position', new THREE.BufferAttribute(posPts, 3));
  points.geometry = ptsGeom;
}

function buildShape(){
  const fn = SHAPES[params.shape];
  const out = fn(params.size);
  verts4 = out.verts; edges = out.edges;
  allocateBuffers();
}

function projectWPerspective(v, depth){
  const w = v[0];
  const s = depth / (depth - w);
  return [ v[1]*s, v[2]*s, v[3]*s ];
}

function update(){
  
  let thetaA, thetaB;
  if (params.mode === 'Auto') {
    t += dt;
    thetaA = params.speedA * t;
    thetaB = params.speedB * t;
  } else {
    // Manual: degrees -> radians
    thetaA = params.angleA * Math.PI / 180;
    thetaB = params.angleB * Math.PI / 180;
  }

  const axisA = [ Math.cos(0.7*t), Math.sin(0.5*t), Math.cos(0.9*t) ];
  const axisB = [ Math.sin(0.8*t), Math.cos(0.6*t), Math.sin(1.1*t) ];

  const a = qFromAxisAngle(axisA, thetaA);
  const b = qFromAxisAngle(axisB, thetaB);

  const posL = lines.geometry.attributes.position.array;
  const posP = points.geometry.attributes.position.array;

  const proj = new Array(verts4.length);

  let wmin = Infinity, wmax = -Infinity;

  // project vertices
  let pi=0; for(let i=0;i<verts4.length;i++){
    const v4 = rotate4D(verts4[i], a, b);
    wmin = Math.min(wmin, v4[0]);
    wmax = Math.max(wmax, v4[0]);

    const u  = (params.projection === 'Stereographic S^3')
      ? projectStereographic(v4)
      : projectWPerspective(v4, params.depth);
    proj[i]=u; posP[pi++]=u[0]; posP[pi++]=u[1]; posP[pi++]=u[2];
  }

  //-----HUD updates---------
  hud.textContent =
    `slice w ∈ [${wmin.toFixed(3)}, ${wmax.toFixed(3)}] · ` +
    `method: ${params.projection} · ` +
    (params.mode === 'Auto'
      ? `auto: (ωA=${params.speedA.toFixed(2)}, ωB=${params.speedB.toFixed(2)})`
      : `manual: (A=${params.angleA.toFixed(1)}°, B=${params.angleB.toFixed(1)}°)`);

  // edges
  let li=0; for(let e=0;e<edges.length;e++){
    const [i,j] = edges[e]; const A=proj[i], B=proj[j];
    posL[li++]=A[0]; posL[li++]=A[1]; posL[li++]=A[2];
    posL[li++]=B[0]; posL[li++]=B[1]; posL[li++]=B[2];
  }

  lines.geometry.attributes.position.needsUpdate = true;
  points.geometry.attributes.position.needsUpdate = true;
}

function onResize(){
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', onResize);

// ---------- GUI ----------
const gui = new GUI({ title: '4D Rotation Controls' });
const fShape = gui.addFolder('Shape');
fShape.add(params, 'shape', Object.keys(SHAPES)).name('Kind').onChange(buildShape);
fShape.add(params, 'size', 0.5, 2.5, 0.01).name('Size').onChange(buildShape);

//------------Projection Tab-----------------
const fProjection = gui.addFolder('Projection');
const methodCtrl = fProjection.add(params, 'projection', ['W-Perspective', 'Stereographic S^3']).name('Method');
const depthCtrl  = fProjection.add(params, 'depth', 2, 8, 0.1).name('Depth');

function syncProjectionUI() {
  // Prefer lil-gui's API; if your lil-gui version lacks .show/.hide, use the fallback below.
  if (depthCtrl.show && depthCtrl.hide) {
    (params.projection === 'W-Perspective') ? depthCtrl.show() : depthCtrl.hide();
  } else {
    // Fallback: style display
    const el = depthCtrl.domElement.parentElement;
    el.style.display = (params.projection === 'W-Perspective') ? '' : 'none';
  }
}
methodCtrl.onChange(syncProjectionUI);
syncProjectionUI(); // initialize

//-----------------Motion---------------
const fMotion = gui.addFolder('Motion');
fMotion.add(params, 'speedA', -2, 2, 0.01).name('Speed A');
fMotion.add(params, 'speedB', -2, 2, 0.01).name('Speed B');

//-----------------Rot-mode--------------
const fMode = gui.addFolder('Mode');
const modeCtrl = fMode.add(params, 'mode', ['Auto', 'Manual']).name('Rotation');

// const fMotion = gui.addFolder('Motion'); // you already have this; just keep using it
const angACtrl = fMotion.add(params, 'angleA', -360, 360, 0.1).name('Angle A (deg)');
const angBCtrl = fMotion.add(params, 'angleB', -360, 360, 0.1).name('Angle B (deg)');

function syncModeUI() {
  const show = (params.mode === 'Manual');
  if (angACtrl.show && angACtrl.hide) {
    show ? (angACtrl.show(), angBCtrl.show()) : (angACtrl.hide(), angBCtrl.hide());
  } else {
    // Fallback
    angACtrl.domElement.parentElement.style.display = show ? '' : 'none';
    angBCtrl.domElement.parentElement.style.display = show ? '' : 'none';
  }
}
modeCtrl.onChange(syncModeUI);
syncModeUI(); // initialize


//------------------Style----------------
const fStyle = gui.addFolder('Style');
fStyle.addColor(params, 'edgeColor').name('Edges').onChange(v=>{ lines.material.color.set(v); });
fStyle.addColor(params, 'vertexColor').name('Vertices').onChange(v=>{ points.material.color.set(v); });

gui.close();

buildShape();
lines.material.color.set(params.edgeColor);
points.material.color.set(params.vertexColor);

function loop(){ update(); renderer.render(scene, camera); requestAnimationFrame(loop); }
loop();
