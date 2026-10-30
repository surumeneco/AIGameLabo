import Phaser from 'phaser';
import {NODES,newIsland,objective,available,interact,craft,validSave,progress,decorate} from './games/island.js';

const $ = id => document.getElementById(id);
const SAVE_KEY='aigamelabo:komorebi-island:v3';
function getSaved(){try{const x=JSON.parse(localStorage.getItem(SAVE_KEY));return validSave(x)?x:newIsland();}catch{return newIsland();}}
let state=getSaved(); let scene; let busy=false; let toastTimer; let plantColor='sky';
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));return true;}catch{return false;}}
function notice(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400);}
function commit(result){if(!result.changed){notice(result.reason);return;}state=result.state;const saved=persist();sync();notice(saved?result.reason:result.reason+'（保存できません。ブラウザの設定をご確認ください。）');}
function drawUi(){const info=objective(state);$('chapter').textContent=info.chapter;$('goal').textContent=info.title;$('detail').textContent=info.detail;$('hint').textContent=info.hint;$('wood').textContent=state.wood;$('flowers').textContent=state.flowers;$('crystals').textContent=state.crystals;$('progress').style.width=`${progress(state)*100}%`;const container=$('actions');container.replaceChildren();
 const add=(name,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',fn);container.append(b);};
 if(info.action==='bridge')add('🪵 橋を架ける（木材3）',()=>commit(craft(state,'bridge')));
 if(info.action==='garden'){add('💠 水色の庭を作る',()=>commit(craft(state,'garden','sky')));add('🌻 夕焼け色の庭を作る',()=>commit(craft(state,'garden','sunset')));}
 if(info.action==='beacon')add('✨ 灯台を灯す（光る石2）',()=>commit(craft(state,'beacon')));
 if(info.action==='decorate'){add('💠 水色の花を植える'+(plantColor==='sky'?' ✓':''),()=>{plantColor='sky';drawUi();});add('🌻 夕焼け色の花を植える'+(plantColor==='sunset'?' ✓':''),()=>{plantColor='sunset';drawUi();});}
}
function sync(){drawUi();if(scene)scene.redraw();}
function reset(){if(!window.confirm('島の開拓を最初からやり直しますか？'))return;state=newIsland();const saved=persist();sync();notice(saved?'新しい開拓が始まりました。':'新しい開拓が始まりましたが、保存できません。');}
$('help-btn').addEventListener('click',()=>{const guide=$('guide');guide.hidden=!guide.hidden;$('help-btn').setAttribute('aria-expanded',String(!guide.hidden));});
$('reset').addEventListener('click',reset);

const C={night:0x132738,water:0x1b5473,waterLight:0x337e97,grass:0x54866d,grassLight:0x6ba581,earth:0x3e6657,wood:0x8c6343,leaf:0x3c8060,brightLeaf:0x7cbe86,stone:0x7b8da1,gold:0xffe0a7};
function circle(g,x,y,r,color,alpha=1){g.fillStyle(color,alpha);g.fillCircle(x,y,r);}
function rect(g,x,y,w,h,color,alpha=1){g.fillStyle(color,alpha);g.fillRoundedRect(x,y,w,h,9);}
function text(s,x,y,str,size,color='#e9f7ed',stroke='#14232c'){return s.add.text(x,y,str,{fontFamily:'system-ui, sans-serif',fontSize:`${size}px`,fontStyle:'bold',color,stroke,strokeThickness:stroke?2:0}).setOrigin(.5);}
function sparkle(s,x,y,color){const e=s.add.circle(x,y,7,color,.9).setDepth(20);s.tweens.add({targets:e,y:y-45,alpha:0,scale:2,duration:700,ease:'Cubic.Out',onComplete:()=>e.destroy()});}
class IslandScene extends Phaser.Scene {
 constructor(){super('island');this.motes=[];}
 create(){scene=this;this.redraw();this.input.on('pointerdown',pointer=>{if(state.beacon){const r=decorate(state,pointer.x,pointer.y,plantColor);if(r.changed){commit(r);sparkle(this,pointer.x,pointer.y,0xffe3a2);}else notice(r.reason);}});}
 drawTerrain(g){
  rect(g,0,0,420,570,0x194158);rect(g,0,275,420,83,C.water);
  for(let y=287;y<358;y+=16)for(let x=16+(y%3)*5;x<430;x+=74){g.lineStyle(2,0x6fb4c4,.28);g.beginPath();g.moveTo(x,y);g.lineTo(x+24,y);g.strokePath();}
  circle(g,195,160,156,0x376e63);circle(g,205,161,147,C.grass);circle(g,190,154,119,C.grassLight,.3);
  circle(g,221,458,163,0x376e63);circle(g,218,460,149,C.grass);circle(g,185,438,118,C.grassLight,.25);
  // Tiny raised flowered patches, not a grid.
  for(const [x,y] of [[46,95],[102,84],[303,78],[355,154],[33,253],[344,276],[48,390],[356,414],[210,524],[287,535],[74,514]]){
   circle(g,x,y,3.5,0xd5eab5,.58);circle(g,x+7,y-5,2.5,0xf9da9c,.65);
  }
  // Footprints: each step visually suggests traversable terrain.
  for(const [x,y] of [[190,266],[199,256],[200,240],[214,226],[218,213]])circle(g,x,y,2,0xc1d7a3,.25);
  // Dock on the north edge, and bridge area in the centre.
  rect(g,161,261,84,20,0xb58b57);
  if(state.bridge){rect(g,171,275,71,89,C.wood);for(let y=282;y<360;y+=13){rect(g,174,y,65,9,0xc99e64);g.lineStyle(1,0x705138,.8);g.lineBetween(179,y+5,232,y+5);} }
  else{rect(g,174,278,18,17,0xc3986b);rect(g,218,278,18,17,0xc3986b);g.lineStyle(3,0xa8c2c6,.5);g.lineBetween(184,297,227,297);}
  // Lighthouse in the distance, dark until fixed.
  rect(g,331,376,33,89,0xd7d8c6);rect(g,325,372,45,19,0x6f7e86);rect(g,330,358,35,21,0x8b6a4f);
  if(state.beacon){circle(g,347,365,15,0xffed9d,.65);circle(g,347,365,7,0xfff6cc);}else circle(g,347,365,5,0x576875);
  // A physical island home.
  rect(g,169,190,67,51,0xd7b38a);g.fillStyle(0x9b5e4f);g.fillTriangle(161,197,243,197,201,156);
  rect(g,185,211,17,30,0x704b43);rect(g,210,208,14,12,0xffdba2);
  circle(g,155,230,7,0xd4bd8b);
  if(!state.bridge)rect(g,0,361,420,209,0x0f203a,.64);
 }
 drawTree(n,used){const s=this, g=s.add.graphics();g.setDepth(4);if(used){circle(g,n.x,n.y+10,13,0x815c3d);circle(g,n.x,n.y+10,7,0xbba77a);circle(g,n.x-2,n.y+12,3,0x8c6946);text(s,n.x,n.y+32,'若木',10,'#d8ebca');return;}
  rect(g,n.x-9,n.y+2,18,33,0x74543e);circle(g,n.x-17,n.y-11,27,0x356a4e);circle(g,n.x+18,n.y-17,25,C.leaf);circle(g,n.x-1,n.y-34,28,C.brightLeaf);circle(g,n.x-10,n.y-36,7,0xb2e3a4,.55);
  this.makeHotspot(n,n.x,n.y-5,92,98);
 }
 drawFlower(n,used){const g=this.add.graphics();g.setDepth(5);if(used){circle(g,n.x,n.y+8,9,0x56795c);return;}circle(g,n.x,n.y+8,10,0x2e7b57);const color=n.id==='flower-1'?0xa9d5f5:0xffd58f;for(let a=0;a<6;a++){const ang=a*Math.PI/3;circle(g,n.x+13*Math.cos(ang),n.y+13*Math.sin(ang),11,color);}circle(g,n.x,n.y,7,0xfff1ae);this.makeHotspot(n,n.x,n.y,87,92);}
 drawCrystal(n,used){const g=this.add.graphics();g.setDepth(4);if(used){circle(g,n.x,n.y,10,0x63716e);return;}g.fillStyle(0x97e4fb);g.fillTriangle(n.x-20,n.y+15,n.x,n.y-27,n.x+20,n.y+15);g.fillStyle(0xd8fcff,.75);g.fillTriangle(n.x,n.y-27,n.x+20,n.y+15,n.x,n.y+6);this.makeHotspot(n,n.x,n.y,88,89);}
 makeHotspot(n,x,y,w,h){const zone=this.add.zone(x,y,w,h).setDepth(14).setInteractive({useHandCursor:true});zone.setData('node',n.id);zone.on('pointerdown',()=>this.collect(n));const ring=this.add.circle(x,y,42,0xfff3ab,0).setStrokeStyle(2,0xffe6a0,.78).setDepth(8);this.tweens.add({targets:ring,alpha:{from:.2,to:.85},scale:{from:.88,to:1.15},duration:950,yoyo:true,repeat:-1});}
 drawGarden(g){if(!state.garden)return;const flower=state.garden==='sky'?0x9dddf2:0xffc889;circle(g,220,440,44,0x3d7955);for(const [dx,dy] of [[0,0],[-23,-14],[23,-7],[-11,24],[22,25]]){circle(g,220+dx,440+dy,9,flower);circle(g,220+dx,440+dy,4,0xfff2af);} }
 drawDecorations(g){
  this.drawGarden(g);
  for(const d of state.decorations??[]){circle(g,d.x,d.y,10,d.color==='sky'?0xa2e4ff:0xffc98c);circle(g,d.x,d.y,4,0xfff1a0);}
  if(state.bridge){rect(g,155,354,96,9,0xd4b67b);circle(g,190,363,4,0xece19e);}
  if(state.beacon){const aura=this.add.circle(348,365,54,0xffe6aa,.18).setDepth(6);this.tweens.add({targets:aura,alpha:{from:.12,to:.42},scale:{from:.9,to:1.3},duration:1150,yoyo:true,repeat:-1});const beam=this.add.rectangle(348,365,153,8,0xffeac0,.34).setOrigin(0,.5).setDepth(6);this.tweens.add({targets:beam,angle:360,duration:7000,repeat:-1});}
 }
 drawHero(){const x=state.hero?.x??196,y=state.hero?.y??250;const g=this.add.graphics();g.setDepth(11);circle(g,x,y+15,20,0x21483c,.65);circle(g,x,y,14,0xc68a53);circle(g,x-8,y-8,9,0xefc38b);circle(g,x+8,y-8,9,0xefc38b);circle(g,x,y-3,12,0xf6dbaa);circle(g,x-4,y-5,2,0x213f44);circle(g,x+4,y-5,2,0x213f44);circle(g,x,y+1,2,0x925b4b);const mark=text(this,x,y+29,'あなた',11,'#ffffff');mark.setDepth(12);}
 redraw(){this.tweens.killAll();this.children.removeAll(true);const g=this.add.graphics();this.drawTerrain(g);g.setDepth(0);this.drawDecorations(g);
  for(const n of NODES){const used=state.used.includes(n.id);if(n.kind==='wood')this.drawTree(n,used);if(state.bridge){if(n.kind==='flower'&&(state.garden||available(state,n)||used))this.drawFlower(n,used);if(n.kind==='crystal'&&(state.garden||state.beacon)&&(!state.beacon||used))this.drawCrystal(n,used);}}
  if(!state.bridge){const lbl=text(this,213,443,'橋を直すと探索できる',17);lbl.setDepth(9);}
  else if(state.beacon){const lbl=text(this,207,543,'開拓成功！',21,'#fff2b4');lbl.setDepth(9);}
  this.drawHero();
 }
 collect(n){if(busy)return;const result=interact(state,n.id);if(!result.changed){notice(result.reason);return;}busy=true;const oldx=state.hero.x,oldy=state.hero.y;const x=n.x,y=n.y+35;const cursor=this.add.circle(oldx,oldy,12,0xffffff,.001);this.tweens.add({targets:cursor,x,y,duration:250,ease:'Sine.InOut',onComplete:()=>{cursor.destroy();busy=false;commit(result);sparkle(this,n.x,n.y,0xffe3a2);}});}
}
new Phaser.Game({type:Phaser.AUTO,width:420,height:570,parent:'game',backgroundColor:'#16394a',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[IslandScene],render:{antialias:true},input:{activePointers:2}});
drawUi();
