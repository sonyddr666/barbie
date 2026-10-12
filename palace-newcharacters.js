import * as THREE from 'three';

export function buildNewCharacter(ch, a) {
  const g = new THREE.Group(); g.userData.animation = { limbs: [], wings: [], clockHands: [] }; g.userData.materials = a;
  const part = (parent, geo, material, x=0,y=0,z=0) => { const m = new THREE.Mesh(geo,material); m.position.set(x,y,z); m.castShadow=true;m.receiveShadow=true;m.userData.materialSlot=material.name;parent.add(m);return m; };
  const box = (p,m,x,y,z,w,h,d) => part(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
  const sphere = (p,m,x,y,z,r=.3) => part(p,new THREE.SphereGeometry(r,10,8),m,x,y,z);
  const capsule = (p,m,x,y,z,r=.1,length=.5) => part(p,new THREE.CapsuleGeometry(r,length,3,6),m,x,y,z);
  const face = (p,m,x,y,z,w,h) => { const o=part(p,new THREE.PlaneGeometry(w,h),m,x,y,z);o.rotation.y=Math.PI;return o; };
  const head = (height) => {const o=new THREE.Group();o.position.y=height;o.scale.setScalar(ch.headScale);g.add(o);return o;};
  const limb = o => {g.userData.animation.limbs.push(o);return o;};
  if(ch.model==='error404') {
    sphere(g,a.body,0,2.35,0,.96).scale.set(1.12,.88,1);
    const mouth=part(g,new THREE.TorusGeometry(.62,.16,7,20),a.body,0,2.4,-.92);mouth.rotation.x=.05;
    sphere(g,a.mouth,0,2.4,-.93,.58).scale.z=.18;
    for(let i=0;i<18;i++){const angle=i/18*Math.PI*2;const tooth=part(g,new THREE.ConeGeometry(.065,.24,4),a.teeth,Math.cos(angle)*.54,2.4+Math.sin(angle)*.54,-1.045);tooth.rotation.z=angle-Math.PI/2;}
    for(let i=0;i<3;i++){const angle=i/3*Math.PI*2;const p=new THREE.Group();p.position.set(Math.cos(angle)*.63,1.15,Math.sin(angle)*.63);g.add(p);limb(capsule(p,a.legs,0,0,0,.075,1.95));p.rotation.z=-Math.cos(angle)*.2;p.rotation.x=Math.sin(angle)*.2;}
    for(const sign of [-1,1]) {box(g,a.body,sign*1.05,3.15,0,.95,.8,.32);face(g,a.screens,sign*1.05,3.15,-.17,.85,.68);const alert=face(g,a.alerts,sign*1.17,1.75,-.22,.85,.6);alert.rotation.z=sign*.15;}
    face(g,a.alerts,0,3.78,-.18,1.1,.67);sphere(g,a.core,0,2.6,.8,.24);
  } else if(ch.model==='crtcat') {
    capsule(g,a.body,0,.94,0,.34,.55);const h=head(1.83);box(h,a.head,0,0,0,1.05,.78,.52);face(h,a.screen,0,0,-.27,.87,.6);
    for(const sign of [-1,1]){const ear=part(h,new THREE.ConeGeometry(.19,.46*ch.earScale,3),a.ears,sign*.36,.57,0);ear.rotation.z=-sign*.1;limb(capsule(g,a.body,sign*.47,.93,0,.09,.35));limb(capsule(g,a.feet,sign*.2,.23,-.02,.12,.2));}
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.5,.3),new THREE.Vector3(.4,.75,.65),new THREE.Vector3(.55,1.3,.7)]);part(g,new THREE.TubeGeometry(curve,10,.065,5,false),a.tail);sphere(g,a.core,0,1.05,-.32,.13);
  } else if(ch.model==='diskbot') {
    box(g,a.body,0,.95,0,.65,.83,.44);const h=head(1.78);box(h,a.head,0,0,0,.95,.98,.18);box(h,a.shutter,0,.28,-.1,.58,.26,.025);
    for(const sign of [-1,1]){box(h,a.eyes,sign*.21,-.02,-.11,.12,.08,.025);limb(capsule(g,a.hands,sign*.47,.9,0,.095,.35));limb(capsule(g,a.feet,sign*.22,.25,0,.12,.26));}
    box(g,a.core,0,.94,-.235,.5,.24,.025);for(const sign of[-1,1])part(g,new THREE.TorusGeometry(.07,.018,4,12),a.shutter,sign*.13,.94,-.26);
  } else if(ch.model==='patchdoll') {
    part(g,new THREE.CylinderGeometry(.24,.5,.72,7),a.cloth,0,.82,0);const h=head(1.56);sphere(h,a.head,0,0,0,.5);
    for(const sign of [-1,1]){const eye=sphere(h,a.eyes,sign*.2,.04,-.44,.12);eye.scale.z=.3;limb(capsule(g,a.body,sign*.42,.97,0,.08,.34));limb(capsule(g,a.body,sign*.18,.25,0,.095,.28));sphere(h,a.hair,sign*.37,.36,.05,.23);}
    for(let i=0;i<5;i++){const stitch=box(h,a.stitches,-.3+i*.14,-.22,-.45,.06,.025,.015);stitch.rotation.z=i%2?.5:-.5;}box(g,a.stitches,0,.8,-.43,.035,.5,.015);sphere(g,a.emblem,0,1.08,-.28,.08);
  } else if(ch.model==='filemoth') {
    capsule(g,a.body,0,.8,0,.24,.86);const h=head(1.5);sphere(h,a.head,0,0,0,.43);
    for(const sign of [-1,1]){sphere(h,a.eyes,sign*.18,.04,-.36,.12);const antenna=capsule(h,a.antennae,sign*.2,.6,0,.028,.55*ch.earScale);antenna.rotation.z=-sign*.25;limb(capsule(g,a.body,sign*.16,.18,0,.07,.18));
      const wing=new THREE.Group();wing.position.set(sign*.22,1,0);g.add(wing);const s=new THREE.Shape();s.moveTo(0,0);s.lineTo(sign*1.65,.65);s.lineTo(sign*1.35,-.9);s.lineTo(sign*.5,-.45);s.closePath();const geo=new THREE.ShapeGeometry(s);geo.computeBoundingBox();const b=geo.boundingBox,uv=geo.attributes.uv,pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const u=(pos.getX(i)-b.min.x)/(b.max.x-b.min.x);uv.setXY(i,sign<0?1-u:u,(pos.getY(i)-b.min.y)/(b.max.y-b.min.y));}part(wing,geo,a.wings);g.userData.animation.wings.push(wing);for(let i=0;i<3;i++){const mark=box(wing,a.markings,sign*(.5+i*.25),.12-i*.12,-.012,.19,.03,.018);mark.rotation.z=sign*.25;}}
    sphere(g,a.core,0,.92,-.24,.14);
  } else if(ch.model==='chronoguard') {
    part(g,new THREE.CylinderGeometry(.28,.58,1.55,7),a.body,0,1.7,0);const h=head(2.95);part(h,new THREE.CylinderGeometry(.5,.5,.2,16),a.head).rotation.x=Math.PI/2;face(h,a.dial,0,0,-.115,.88,.88);
    for(const length of [.27,.37]){const hand=new THREE.Group();hand.position.z=-.14;h.add(hand);box(hand,a.hands,0,length/2,0,.04,length,.02);g.userData.animation.clockHands.push(hand);}
    for(const sign of [-1,1]){limb(capsule(g,a.limbs,sign*.55,1.85,0,.09,1.1));limb(capsule(g,a.limbs,sign*.22,.57,0,.11,.9));const gear=part(g,new THREE.TorusGeometry(.13,.045,4,10),a.gears,sign*.4,2.23,-.25);gear.rotation.z=sign*.2;}
    capsule(g,a.core,0,1.32,-.42,.085,.45);
  }
  const bounds=new THREE.Box3().setFromObject(g);if(Number.isFinite(bounds.min.y)) for(const child of g.children) child.position.y-=bounds.min.y;
  return g;
}
