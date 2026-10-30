import Phaser from 'phaser';
import {games} from './games/registry.js';
import {ecologyStart,ecologyAct,ecologyInfo,ecologyLevels} from './games/ecology.js';
import {combatStart,combatAct,combatInfo,combatUpgrade,relics} from './games/combat.js';
import {machineryStart,machineryAct,machineryInfo,machineryLevels,traceBeam} from './games/machinery.js';

const $=id=>document.getElementById(id);
const SAVE_PREFIX='aigamelabo-prototypes-v1:';
const NOTE_PREFIX='aigamelabo-feedback-v1:';
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function load(key){try{return JSON.parse(localStorage.getItem(key) || 'null');}catch{return null;}}
function start(id){return id==='ecology'?ecologyStart():id==='combat'?combatStart():machineryStart();}
let active='ecology',state=start(active),mode='move',scene;
const history={ecology:[],combat:[],machinery:[]};
const tabs=$('game-tabs'),board=$('board');
const colors={ecology:{bg:0x182f2f,ground:0x29463e,accent:0x77d2b1},combat:{bg:0x231b2d,ground:0x42344f,accent:0xffbf81},machinery:{bg:0x18283d,ground:0x30455d,accent:0x89cafa}};
function change(id){
 active=id;mode='move';history[id]=[];const stored=load(SAVE_PREFIX+id);state=stored?.kind===id&&typeof stored.phase==='string'?stored:start(id);
 save('aigamelabo-current-v1',id);
 for(const button of tabs.querySelectorAll('button')){button.classList.toggle('active',button.dataset.id===id);button.setAttribute('aria-pressed',String(button.dataset.id===id));}
 const note=load(NOTE_PREFIX+id)||{};$('score').value=note.score||'';$('note').value=note.note||'';$('save-state').textContent='';update();
}
function apply(next){if(next!==state){history[active].push(structuredClone(state));if(history[active].length>30)history[active].shift();}state=next;save(SAVE_PREFIX+active,state);update();}
function undo(){if(!history[active].length)return;state=history[active].pop();save(SAVE_PREFIX+active,state);update();}
function tileAction(pos){
 if(active==='ecology')apply(ecologyAct(state,{type:mode,pos}));
 if(active==='combat'&&mode==='move')apply(combatAct(state,{type:'move',pos}));
 if(active==='machinery')apply(machineryAct(state,pos));
}
function control(label,fn,{selected=false,wide=false,disabled=false}={}){
 const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;if(selected)b.classList.add('selected');if(wide)b.classList.add('wide');b.addEventListener('click',fn);$('controls').append(b);
}
function update(){
 const info=active==='ecology'?ecologyInfo(state):active==='combat'?combatInfo(state):machineryInfo(state);
 $('game-title').textContent=games.find(g=>g.id===active).name;
 $('game-subtitle').textContent=`${games.find(g=>g.id===active).tag} · ${info.name}`;
 $('objective').textContent=info.goal;
 const status=$('status');status.textContent=state.message;status.className='status '+(state.phase==='won'?'win':state.phase==='lost'?'loss':'');
 $('help').textContent=info.help;
 const actions=$('controls');actions.replaceChildren();
 if(state.phase==='won'&&(active==='ecology'?state.level<ecologyLevels-1:active==='machinery'&&state.level<machineryLevels-1)){
   control('次のステージへ',()=>apply(active==='ecology'?ecologyStart(state.level+1):machineryStart(state.level+1)),{wide:true});
 }
 if(state.phase==='lost')control('もう一度試す',()=>apply(active==='ecology'?ecologyStart(state.level):combatStart()),{wide:true});
 if(state.phase==='upgrade'){
  for(const r of relics.filter(r=>!state.build.includes(r.id)))control(`${r.label}／${r.desc}`,()=>apply(combatUpgrade(state,r.id)));
 }
 if(state.phase==='playing'&&active==='ecology'){
   control('移動',()=>{mode='move';update()},{selected:mode==='move'});
   control(`灯り ${state.lights}`,()=>{mode='light';update()},{selected:mode==='light',disabled:state.lights===0});
   control('待機',()=>apply(ecologyAct(state,{type:'wait',pos:state.player})));
 }
 if(state.phase==='playing'&&active==='combat'){
   control('移動',()=>{mode='move';update()},{selected:mode==='move'});
   control('斬撃',()=>apply(combatAct(state,{type:'strike'})));
   control('防御',()=>apply(combatAct(state,{type:'guard'})));
   control(`投擲 ${state.charges}`,()=>apply(combatAct(state,{type:'throw'})),{disabled:state.charges<=0});
 }
 if(state.phase==='playing'&&active==='machinery')control('鏡の台座をタップして回す',()=>{}, {wide:true,disabled:true});
 if(state.phase==='won'&&!(active==='combat'&&state.wave===2))control('同じ盤面を再挑戦',()=>apply(active==='ecology'?ecologyStart(state.level):machineryStart(state.level)),{wide:true});
 control('ひと手戻す',undo,{wide:true,disabled:history[active].length===0});
 if(scene)render(scene);
}
function label(scene,x,y,text,color='#fff',size=23){scene.add.text(x,y,text,{fontFamily:'system-ui, sans-serif',fontSize:`${size}px`,color,fontStyle:'bold'}).setOrigin(.5);}
function token(scene,p,char,bg,fg='#ffffff',size=22){if(!p)return;const x=36+p[0]*72,y=36+p[1]*72;scene.add.circle(x,y,24,bg).setStrokeStyle(2,0xffffff,.5);label(scene,x,y,char,fg,size);}
function render(s){
 s.children.removeAll(true);
 const c=colors[active];s.cameras.main.setBackgroundColor(c.bg);
 const size=72;
 for(let y=0;y<5;y++)for(let x=0;x<5;x++){
   let fill=(x+y)%2===0?c.ground:c.bg;
   if(active==='combat'&&state.phase==='playing'&&x===state.intentX)fill=0x743d52;
   const tile=s.add.rectangle(x*size+36,y*size+36,69,69,fill).setStrokeStyle(1,0xa2c2cc,.2);
   tile.setInteractive({useHandCursor:true});tile.on('pointerdown',()=>tileAction([x,y]));
 }
 if(active==='ecology'){
   for(const rock of state.rocks)token(s,rock,'▰',0x647684,'#f2f2f1',19);
   if(state.spore)token(s,state.spore,'♣',0xa677a0);
   if(state.exit)token(s,state.exit,'⌂',0x397b8a);
   if(!state.collected)token(s,state.flower,'✿',0x88633f,'#fff0ad',27);
   for(const lamp of state.lamps)token(s,lamp,'☼',0xb7853e,'#ffebaa',25);
   token(s,state.moth,'✦',0x6697bf);token(s,state.boar,'◆',state.stun?0x858fbc:0xaa6659);
   token(s,state.player,'●',0x4da793);
 }else if(active==='combat'){
   token(s,state.enemy,'◆',0x9f5363);token(s,state.player,'♜',0x399c96);
   if(state.phase==='playing')label(s,180,345,'赤い列 = 予告された攻撃', '#ffd9c5',13);
 }else{
   const beam=state.beam?.length?state.beam:traceBeam(state).path;
   for(const p of beam){const rect=s.add.rectangle(p[0]*72+36,p[1]*72+36,23,23,0x78dbff,.47);rect.setStrokeStyle(1,0xffffff,.3);}
   for(const w of state.walls)token(s,w,'■',0x596779);
   for(const p of state.slots){const k=p.join(',');const mirror=state.mirrors[k];token(s,p,mirror==='/'?'／':mirror==='\\'?'＼':'·',mirror?0x567b95:0x4b6178,mirror?'#ecfcff':'#bad6e6',25);}
   token(s,state.source,'▶',0x397eae);
   token(s,state.target,'◎',0x9f8a3b,'#fff6c1');
 }
}
for(const g of games){const b=document.createElement('button');b.textContent=g.name;b.dataset.id=g.id;b.type='button';b.addEventListener('click',()=>change(g.id));tabs.append(b);}
$('reset').addEventListener('click',()=>apply(active==='ecology'?ecologyStart(state.level):active==='combat'?combatStart():machineryStart(state.level)));
$('save-note').addEventListener('click',()=>{const ok=save(NOTE_PREFIX+active,{score:$('score').value,note:$('note').value,updatedAt:new Date().toISOString()});$('save-state').textContent=ok?'この端末に保存しました。':'保存できませんでした。ブラウザの設定をご確認ください。';});
$('export').addEventListener('click',()=>{
 const result={format:'AIGameLabo/playtest-v1',exportedAt:new Date().toISOString(),games:Object.fromEntries(games.map(g=>[g.id,{feedback:load(NOTE_PREFIX+g.id),state:load(SAVE_PREFIX+g.id)}]))};
 const u=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='aigamelabo-playtest.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
});
class BoardScene extends Phaser.Scene{constructor(){super('Board');}create(){scene=this;update();}}
new Phaser.Game({type:Phaser.AUTO,width:360,height:360,parent:'board',backgroundColor:'#132332',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[BoardScene],render:{pixelArt:false,antialias:true}});
const last=load('aigamelabo-current-v1');change(games.some(g=>g.id===last)?last:'ecology');
