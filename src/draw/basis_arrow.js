// Draw 4D basis arrows (1, i, j, k) as 3D ArrowHelpers after 4D rotation + projection.
import * as THREE from 'three';

export class FourDBasisArrows {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    // Four arrows: 1 (w), i (x), j (y), k (z)
    this.labels = ['1','i','j','k'];
    this.colors = {
      '1': 0xffffff,
      'i': 0xff5555,
      'j': 0x55ff55,
      'k': 0x5599ff,
    };

    this.headLength = 0.25;   // default proportions in 3D
    this.headWidth  = 0.12;
    this.lambda = 1.0;

    this.arrows = this.labels.map(() => new THREE.ArrowHelper(
      new THREE.Vector3(1,0,0),  // dir (temporary)
      new THREE.Vector3(0,0,0),  // origin
      1,                         // length
      0xffffff,                  // color
      this.headLength,
      this.headWidth
    ));

    // set per-color and add
    this.labels.forEach((L, idx) => {
      this.arrows[idx].setColor(new THREE.Color(this.colors[L]));
      this.group.add(this.arrows[idx]);
    });

    // origin “dot”
    const dotGeom = new THREE.SphereGeometry(0.02);
    const dotMat  = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.originDot = new THREE.Mesh(dotGeom, dotMat);
    this.group.add(this.originDot);
  }

  setColors({color1, colori, colorj, colork}) {
    if (color1) this.colors['1'] = new THREE.Color(color1).getHex();
    if (colori) this.colors['i'] = new THREE.Color(colori).getHex();
    if (colorj) this.colors['j'] = new THREE.Color(colorj).getHex();
    if (colork) this.colors['k'] = new THREE.Color(colork).getHex();
    this.labels.forEach((L, idx) => this.arrows[idx].setColor(this.colors[L]));
  }

  setHead(headLength, headWidth) {
    this.headLength = headLength; this.headWidth = headWidth;
    // ArrowHelper doesn’t expose setters for head sizes; rebuild helpers:
    const newArrows = [];
    this.labels.forEach((L, idx) => {
      const old = this.arrows[idx];
      const a = new THREE.ArrowHelper(
        old.getDirection(new THREE.Vector3()),
        old.position.clone(),
        old.line.geometry.attributes.position.array.length ? old.length : 1,
        this.colors[L],
        this.headLength,
        this.headWidth
      );
      this.group.remove(old); this.group.add(a);
      newArrows.push(a);
    });
    this.arrows = newArrows;
  }

  setLambda(lambda) { this.lambda = lambda; }

  // rotate4D: (v4, a, b) -> v4'; project: v4' -> [x,y,z]
  // a,b: left/right unit quaternions; project is your active projection function
  update(rotate4D, project, a, b) {
    const basis = [
      [1,0,0,0], // 1 (w)
      [0,1,0,0], // i (x)
      [0,0,1,0], // j (y)
      [0,0,0,1], // k (z)
    ];

    // Projected origin (0,0,0,0)
    const O = project([0,0,0,0]);
    this.originDot.position.set(O[0], O[1], O[2]);

    for (let i=0;i<basis.length;i++){
      const v = basis[i].map(c => c * this.lambda);
      const v4 = rotate4D(v, a, b);
      const P  = project(v4);
      const dir = new THREE.Vector3(P[0]-O[0], P[1]-O[1], P[2]-O[2]);
      const len = dir.length() || 1e-8;
      dir.normalize();

      const arrow = this.arrows[i];
      arrow.position.set(O[0], O[1], O[2]);
      arrow.setDirection(dir);
      arrow.setLength(len, this.headLength, this.headWidth);
    }
  }
}
