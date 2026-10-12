import * as THREE from 'three';
import { CHARACTER_MODELS, characterDefinition, demoProject, validateProject, restoreProject, storeProject, clone, buildEntity, disposeObject } from './palace-engine.js';
import { createPalaceScene, applyPalaceEnvironment } from './palace-scene.js';
import { PlaySession } from './palace-runtime.js';

const $=id=>document.getElementById(id),container=$('game'),context=createPalaceScene(container),{scene,camera,renderer}=context,world=new THREE.Group(),roots=new Map();scene.add(world);
let project=null,session=null,sourceLabel='',fingerprint='',checkpointData=null,toastTimer,dialogDismiss=null,drag=null,loading=false;
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('palace-project'):null;
function hash(value){let h=2166136261;for(let i=0;i<value.length;i++)h=Math.imul(h^value.charCodeAt(i),16777619);return(h>>>0).toString(16);}
function toast(value){$('toast').textContent=value;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function checkpointKey(){return 'palace-play-checkpoint-'+fingerprint;}
function storeCheckpoint(data){try{localStorage.setItem(checkpointKey(),JSON.stringify(data));checkpointData=data;}catch{toast('Backup em memória. O navegador não permitiu guardar esta partida.');}}
function readCheckpoint(){checkpointData=null;try{checkpointData=JSON.parse(localStorage.getItem(checkpointKey()));}catch{} }
const sourceOption=document.createElement('option');sourceOption.value='source';sourceOption.textContent='Personagem configurado no editor';$('gameAvatar').append(sourceOption);
for(const model of CHARACTER_MODELS){const option=document.createElement('option');option.value=model.id;option.textContent=model.label;$('gameAvatar').append(option);}
function summary(){
  if(!project)return;const cells=project.generation,assets=Object.keys(project.assets).length,disks=project.entities.filter(e=>e.type==='disk'&&e.visible).length;
  $('projectDetails').textContent=`PROJETO: ${project.name}\n${sourceLabel}\n${project.entities.length} objetos · ${assets} imagens · ${disks} memórias${cells?'\n'+cells.config.width+' × '+cells.config.depth+' / '+cells.config.levels+' andar(es) · Seed: '+cells.config.seed:''}`;
  $('activeProjectName').textContent=project.name;
  $('menuDescription').textContent=session?'Exploração pausada. Retome a partida ou recarregue o projeto salvo pelo editor.':'Este é o projeto atual da Palace Engine. Mapa, materiais, personagens e janelas são os mesmos do editor.';
  $('play').innerHTML=session?'RETOMAR EXPLORAÇÃO <span>↗</span>':checkpointData?'CARREGAR CHECKPOINT <span>↗</span>':'JOGAR PROJETO DO EDITOR <span>↗</span>';
  $('play').disabled=false;$('continueInfo').textContent=checkpointData?'Checkpoint encontrado para esta versão do mapa.':'';$('restartProject').classList.toggle('hidden',!session&&!checkpointData);
}
function disposeLevel(){if(session){session.dispose();session=null;}for(const root of roots.values())disposeObject(root);roots.clear();}
function install(data,label){
  const parsed=validateProject(data);disposeLevel();project=parsed;sourceLabel=label;fingerprint=hash(JSON.stringify({entities:project.entities,environment:project.environment,assets:project.assets,atlas:project.atlas}));
  for(const e of project.entities){const root=buildEntity(e,project,false);world.add(root);roots.set(e.id,root);}
  applyPalaceEnvironment(context,project.environment,container);resize();scene.updateMatrixWorld(true);readCheckpoint();
  $('gameAvatar').value=project.player?.model||'source';$('overlay').classList.remove('hidden');$('projectUpdate').classList.add('hidden');$('playHud').classList.add('hidden');$('bottom').classList.add('hidden');$('mapPanel').classList.add('hidden');
  const entry=project.entities.find(e=>e.type==='spawn')||project.entities.find(e=>e.type==='character'&&e.character.role==='player');const position=new THREE.Vector3(...(entry?.position||[0,0,0]));camera.position.copy(position).add(new THREE.Vector3(10,12,15));camera.lookAt(position);
  $('mapLevel').replaceChildren();for(let i=0;i<(project.generation?.levels||1);i++){const option=document.createElement('option');option.value=i;option.textContent='Andar '+(i+1);$('mapLevel').append(option);}
  summary();$('loading').classList.add('hidden');
}
async function loadEditorProject(){
  if(loading)return;loading=true;$('play').disabled=true;$('loading').classList.remove('hidden');$('loading').textContent='CARREGANDO O PROJETO DO EDITOR...';
  try{let stored=await restoreProject();const existing=!!stored;if(!stored){stored=demoProject();await storeProject(stored);}install(stored,existing?'ORIGEM: projeto compartilhado com o editor':'ORIGEM: setor de exemplo compartilhado da engine');}
  catch(error){$('menuDescription').textContent='Não foi possível abrir o projeto: '+error.message;$('loading').textContent='Abra o editor para verificar o projeto ou importe o JSON.';toast(error.message);}
  finally{loading=false;}
}
function showDialogue(title,message,onDismiss){
  dialogDismiss=onDismiss;$('dialogTitle').textContent=title;$('dialogText').textContent=message;$('portrait').textContent='◈';$('dialogButtons').replaceChildren();const b=document.createElement('button');b.textContent='Continuar';b.onclick=closeDialogue;$('dialogButtons').append(b);$('dialog').classList.remove('hidden');b.focus();
}
function closeDialogue(){if($('dialog').classList.contains('hidden'))return;$('dialog').classList.add('hidden');const callback=dialogDismiss;dialogDismiss=null;callback?.();}
function start(){
  if(!project||loading)return;
  try{
    if(!session){session=new PlaySession({scene,camera,renderer,project,roots,toast,showDialogue,mode:'play',onCheckpoint:storeCheckpoint});if(checkpointData&&!session.restoreCheckpoint(checkpointData)){checkpointData=null;toast('O backup não cabe neste mapa. A exploração começou na entrada.');}}
    session.paused=false;$('overlay').classList.add('hidden');$('playHud').classList.remove('hidden');$('bottom').classList.remove('hidden');session.cameraUpdate(1,true);session.capture();
  }catch(error){toast(error.message);$('menuDescription').textContent=error.message+' Abra o editor para ajustar a entrada.';}
}
function pause(){if(!session||session.paused)return;session.paused=true;session.keys.clear();if(document.pointerLockElement)document.exitPointerLock();$('overlay').classList.remove('hidden');summary();}
function chooseAvatar(){if(!session||session.paused)return;pause();$('gameAvatar').focus();}
$('play').onclick=start;$('reloadProject').onclick=loadEditorProject;
$('gameAvatar').onchange=()=>{
  if(!project)return;const previous=clone(project.player);project.player={model:$('gameAvatar').value,sourceId:project.player?.sourceId||null,fit:project.player?.fit!==false};
  if(session&&!session.switchAvatar()){project.player=previous;$('gameAvatar').value=previous?.model||'source';}
};
$('restartProject').onclick=()=>{if(session){session.dispose();session=null;}checkpointData=null;try{localStorage.removeItem(checkpointKey());}catch{}for(const e of project.entities)roots.get(e.id).visible=e.visible;summary();start();};
$('openProjectFile').onclick=()=>$('playProjectFile').click();$('playProjectFile').onchange=async()=>{const f=$('playProjectFile').files[0];if(!f)return;try{if(f.size>50*1024*1024)throw new Error('Projeto maior que 50 MB.');install(JSON.parse(await f.text()),'ORIGEM: arquivo '+f.name);}catch(e){toast('Projeto não aberto: '+e.message);}finally{$('playProjectFile').value='';}};
if(channel)channel.onmessage=event=>{if(event.data?.type!=='saved')return;$('projectUpdate').classList.remove('hidden');toast('O editor salvou um projeto novo. ESC → Recarregar projeto do editor.');};

function drawMap(){
  if(!session||$('mapPanel').classList.contains('hidden'))return;const canvas=$('map'),c=canvas.getContext('2d'),roofs=new Set(project.generation?.roofIds||[]),floors=project.entities.filter(e=>e.visible&&e.type==='floor'&&!roofs.has(e.id));
  const level=Number($('mapLevel').value),y=project.generation?level*8:session.player.position.y;
  const visible=floors.filter(e=>Math.abs(e.position[1]-y)<.5);if(!visible.length)return;
  const minX=Math.min(...visible.map(e=>e.position[0]-e.size[0]/2)),maxX=Math.max(...visible.map(e=>e.position[0]+e.size[0]/2)),minZ=Math.min(...visible.map(e=>e.position[2]-e.size[2]/2)),maxZ=Math.max(...visible.map(e=>e.position[2]+e.size[2]/2));const scale=Math.min(320/(maxX-minX||1),360/(maxZ-minZ||1)),ox=20-minX*scale,oz=25-minZ*scale;
  c.fillStyle='#0b1711';c.fillRect(0,0,360,420);c.fillStyle='#2b4330';visible.forEach(e=>c.fillRect(ox+(e.position[0]-e.size[0]/2)*scale,oz+(e.position[2]-e.size[2]/2)*scale,e.size[0]*scale,e.size[2]*scale));
  for(const e of project.entities.filter(e=>e.visible&&e.type==='wall'&&Math.abs(e.position[1]-y)<.5)){c.save();c.translate(ox+e.position[0]*scale,oz+e.position[2]*scale);c.rotate(-e.rotation);c.fillStyle=e.collision?'#8fbd82':'#a87599';c.fillRect(-e.size[0]*scale/2,-e.size[2]*scale/2,Math.max(1,e.size[0]*scale),Math.max(1,e.size[2]*scale));c.restore();}
  for(const e of project.entities.filter(e=>e.visible&&['disk','exit','capsule'].includes(e.type)&&Math.abs(e.position[1]-y)<.5&&!session.collected.has(e.id))){c.fillStyle=e.type==='disk'?'#e5c378':e.type==='exit'?'#8ad9c6':'#729ede';c.beginPath();c.arc(ox+e.position[0]*scale,oz+e.position[2]*scale,3,0,7);c.fill();}
  c.fillStyle='#e99bbb';c.beginPath();c.arc(ox+session.player.position.x*scale,oz+session.player.position.z*scale,4,0,7);c.fill();
}
addEventListener('keydown',e=>{
  const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
  if(e.code==='Escape'){e.preventDefault();if(!$('dialog').classList.contains('hidden'))closeDialogue();else if(session?.windowPanel.isOpen)session.windowPanel.close();else if(session?.inventoryPanel.isOpen)session.inventoryPanel.close();else if(session?.paused)start();else pause();return;}
  if(!session||typing)return;
  if(!e.repeat&&(e.code==='KeyI'||e.code==='Tab'&&!session.paused&&!session.inventoryPanel.isOpen)){e.preventDefault();session.toggleInventory();return;}
  if(session.paused)return;
  if(['Space','ControlLeft','ControlRight','Tab'].includes(e.code))e.preventDefault();session.keys.add(e.code);if(e.repeat)return;
  if(e.code==='Space')session.motion.requestJump();if(e.code==='KeyC')session.motion.toggleCrouch();if(e.code==='KeyE')session.interact();if(e.code==='KeyV')chooseAvatar();if(e.code==='KeyP')session.testPulse();if(e.code==='KeyM')$('mapPanel').classList.toggle('hidden');
});
addEventListener('keyup',e=>session?.keys.delete(e.code));addEventListener('blur',()=>{drag=null;session?.keys.clear();pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&session&&!session.paused)pause();});
renderer.domElement.addEventListener('pointerdown',e=>{if(!session||session.paused)return;renderer.domElement.focus({preventScroll:true});if(e.button===0&&session.clickWindow(e))return;if(!document.pointerLockElement){drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}});
addEventListener('pointerup',()=>drag=null);addEventListener('mousemove',e=>{if(!session||session.paused)return;if(document.pointerLockElement===renderer.domElement)session.mouse(e.movementX,e.movementY);else if(drag){session.mouse(e.clientX-drag.x,e.clientY-drag.y);drag={x:e.clientX,y:e.clientY};}});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);session?.update(dt);if(session?.windowPanel.isOpen&&session.activeWindow){const data=roots.get(session.activeWindow).userData.systemWindow,canvas=session.windowPanel.element.querySelector('canvas');if(canvas.width===data.canvas.width&&canvas.height===data.canvas.height)canvas.getContext('2d').drawImage(data.canvas,0,0);}drawMap();renderer.render(scene,camera);}addEventListener('resize',resize);resize();animate();await loadEditorProject();

if(new URLSearchParams(location.search).has('test'))window.__PALACE_TEST__={
  project:()=>clone(project),load:(p)=>install(p,'ORIGEM: fixture de teste / mesma engine'),start,
  state:()=>session?{started:true,paused:session.paused,model:session.spawn.character.model,sourceId:session.controlledSourceId,health:session.health,noise:session.noise,player:session.player.position.toArray(),camera:session.camera.position.toArray(),inventory:session.inventory.snapshot(),disks:session.entities.filter(e=>e.type==='disk'&&session.collected.has(e.id)).map(e=>e.id),collected:[...session.collected],crouched:session.motion.crouched,grounded:session.motion.grounded,near:session.near?.id,won:session.won,windows:[...session.windows].map(([id,s])=>({id,...clone(s)}))}:{started:false},
  teleport:(x,y,z)=>{session.player.position.set(x,y,z);session.motion.reset();session.invulnerable=30;session.findInteraction();session.cameraUpdate(1,true);},interact:()=>session.near&&session.interact(),step:dt=>session.update(dt),damage:()=>{session.invulnerable=0;session.damage('TEST');},
  render:()=>({objects:world.children.length,materials:project.entities.map(e=>({id:e.id,type:e.type,material:clone(e.material),character:['spawn','character'].includes(e.type)?clone(e.character.appearance):undefined})),runtime:'PlaySession',builder:'buildEntity'}),
};
