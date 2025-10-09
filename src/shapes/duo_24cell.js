// Vertices: all permutations of (±1, ±1, 0, 0), scaled so edges match others
export function gen24Cell(scale=1){
  const verts=[];
  const idx=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
  for(const [i,j] of idx){
    for(const si of [-1,1]) for(const sj of [-1,1]){
      const v=[0,0,0,0]; v[i]=si; v[j]=sj; verts.push(v);
    }
  }
  // scale (edge length ~ others)
  for(const v of verts){ for(let k=0;k<4;k++) v[k]*=scale/Math.SQRT2; }
  // edges connect vertices at squared distance 2
  const edges=[];
  for(let a=0;a<verts.length;a++) for(let b=a+1;b<verts.length;b++){
    let d2=0; for(let k=0;k<4;k++) d2+=(verts[a][k]-verts[b][k])**2;
    if(Math.abs(d2-2)<1e-6) edges.push([a,b]);
  }
  return { verts, edges };
}
