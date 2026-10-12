import * as THREE from 'three';
import { buildCharacter, createEntity, clone, characterDefinition, validCharacter, characterRadius, localPoint } from './palace-engine.js';

export function resolveAvatar(project) {
  const entities=project.entities, settings=project.player || {};
  const explicit=entities.find(e=>e.id===settings.sourceId&&e.visible&&['spawn','character'].includes(e.type));
  const source=explicit || entities.find(e=>e.visible&&e.type==='character'&&e.character.role==='player') || entities.find(e=>e.visible&&e.type==='spawn');
  if(!source) throw new Error('Coloque uma entrada ou marque um personagem como jogador.');
  const entry=entities.find(e=>e.visible&&e.type==='spawn') || source;
  const override=validCharacter(settings.model);
  const character=override ? createEntity('spawn',settings.model,project).character : clone(source.character);
  return { source, entry, character, size: override ? [1,1,1] : [...source.size], fit:settings.fit!==false, label: override ? characterDefinition(character.model).label : source.type==='spawn' ? characterDefinition(character.model).label : source.name };
}
export function prepareAvatar(project, descriptor, position) {
  const root=buildCharacter(descriptor.character,project), body=new THREE.Box3().setFromObject(root), originalHeight=body.max.y-body.min.y;
  // All species use a floor-level pivot, including floating enemies when selected as protagonists.
  for(const child of root.children) child.position.y-=body.min.y;
  let factor=1;
  if(descriptor.fit) {
    let clearance=3.2;
    for(const e of project.entities) {
      if(!e.visible||!e.collision||!['floor','box','wall'].includes(e.type)) continue;
      const p=localPoint(e,position.x,position.z);if(Math.abs(p.x)>e.size[0]/2||Math.abs(p.z)>e.size[2]/2)continue;
      const bottom=e.position[1]-(e.type==='floor'?e.size[1]:0); if(bottom>position.y+.15)clearance=Math.min(clearance,bottom-position.y-.12);
    }
    factor=Math.min(1,Math.max(.65,clearance)/(originalHeight*descriptor.size[1]));
  }
  const size=descriptor.size.map(v=>v*factor);root.scale.fromArray(size);
  const height=originalHeight*size[1], visualWidth=Math.max(body.max.x-body.min.x,body.max.z-body.min.z)*Math.max(size[0],size[2]);
  return { root,size,height,radius:characterRadius(descriptor.character,size), cameraHeight:height*.58, cameraDistance:Math.max(4.6,height*2.1,Math.min(8.5,visualWidth*1.4)), factor };
}
