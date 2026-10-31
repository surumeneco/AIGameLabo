import Phaser from 'phaser';
import {SIZE,LANES,PADS,TOWERS,ENEMIES,REWARDS,WAVES,newGame,preview,build,remove,begin,choose,advanceBattle} from './games/dualkeep.js';

// This is a fresh, recoverable mobile presentation of the deterministic tower-defense engine.
// Combat requires no simultaneous taps: the player's decisions occur during preparation.
const el=id=>document.getElementById(id);
const STORE='aigamelabo:dualkeep:save:v2';
const phaseLabels={planning:'準備',battle:'迎撃',reward:'強化',won:'勝利',lost:'敗北'};
function validSave(s){
  if(!s||typeof s!=='object'||!Object.hasOwn(phaseLabels,s.phase))return false;
  if(!Number.isInteger(s.wave)||s.wave<0||s.wave>=WAVES.length)return false;
  if(!Number.isInteger(s.gold)||s.gold<0||s.gold>100)return false;
  if(!Number.isInteger(s.core)||s.core<0||s.core>8)return false;
  if(!Number.isInteger(s.seed)||!Number.isFinite(s.clock)||!Number.isFinite(s.elapsed))return false;
  if(!Number.isInteger(s.spawned)||s.spawned<0||s.spawned>WAVES[s.wave].length)return false;
  if(!Array.isArray(s.towers)||!Array.isArray(s.enemies)||!Array.isArray(s.upgrades)||!Array.isArray(s.choices))return false;
  if(s.towers.length>PADS.length||s.enemies.length>WAVES[s.wave].length)return false;
  if(new Set(s.towers.map(t=>t.slot)).size!==s.towers.length)return false;
  if(!s.towers.every(t=>Number.isInteger(t.slot)&&t.slot>=0&&t.slot<PADS.length&&Object.hasOwn(TOWERS,t.kind)&&Number.isFinite(t.cd)))return false;
  if(!s.enemies.every(e=>Object.hasOwn(ENEMIES,e.kind)&&Object.hasOwn(LANES,e.lane)&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.hp)&&Number.isFinite(e.slow)))return false;
  if(!s.choices.every(c=>Object.hasOwn(REWARDS,c))||!s.upgrades.every(c=>Object.hasOwn(REWARDS,c)))return false;
  return true;
}
function readState(){try{const v=JSON.parse(localStorage.getItem(STORE));if(validSave(v))return v;}catch{}return newGame();}
let game=readState(),chosen='bolt',selectedPad=null,paused=game.phase==='battle',speed=1,frame=0,lastPhase='';
function save(){try{localStorage.setItem(STORE,JSON.stringify(game));return true;}catch{return false;}}
function notify(message){el('status').textContent=message;}
function slotSummary(slot){const tower=game.towers.find(t=>t.slot===slot);return tower?`地点${slot+1}：${TOWERS[tower.kind].name}（タップで撤去を選択）`:`地点${slot+1}：${TOWERS[chosen].name}を建設可能`;}
function forecast(){
  const next=preview(game);const count=(lane,kind)=>next.filter(e=>(lane===null||e.lane===lane)&&(!kind||e.kind===kind)).length;
  if(game.phase==='planning')return `次の敵：左 ${count('left')}体・右 ${count('right')}体　歩兵 ${count(null,'scout')}／重装 ${count(null,'brute')}／俊足 ${count(null,'runner')}`;
  if(game.phase==='battle')return `残敵 ${next.length-game.spawned+game.enemies.length}体　撃破 ${game.kills}体　侵入 ${game.leaks}体`;
  return game.lastResult;
}
function describe(){
  if(game.phase==='planning')return '次の敵を確認し、弓塔・霜塔の配置を決めよう。';
  if(game.phase==='battle')return paused?'防衛を一時停止中。いつでも再開できます。':'塔が自動で迎撃中。敵が砦に入ると耐久が減ります。';
  if(game.phase==='reward')return '防衛成功。次の襲撃に備える強化をひとつ選ぼう。';
  return game.phase==='won'?'3波を守り切りました。配置を変えて再挑戦もできます。':'砦が陥落しました。次は配置を変えてみましょう。';
}
function render(force=false){
  el('core').textContent=`${game.core} / 8`;
  el('gold').textContent=`${game.gold} G`;
  el('wave').textContent=`${game.wave+1} / 3`;
  el('phase').textContent=paused&&game.phase==='battle'?'停止':phaseLabels[game.phase];
  el('goal').textContent=describe();el('forecast').textContent=forecast();
  const preparing=game.phase==='planning';
  el('build-tools').hidden=!preparing;
  for(const kind of Object.keys(TOWERS)){
    el(kind).disabled=!preparing;
    el(kind).classList.toggle('active',chosen===kind);
    el(kind).setAttribute('aria-pressed',String(chosen===kind));
  }
  el('selection-info').textContent=selectedPad===null?'水色の建設地点をタップして配置':slotSummary(selectedPad);
  el('remove').hidden=!preparing||selectedPad===null||!game.towers.some(t=>t.slot===selectedPad);
  el('start').hidden=!preparing;el('start').disabled=!game.towers.length;
  el('pause').hidden=game.phase!=='battle';el('pause').textContent=paused?'再開':'一時停止';
  el('speed').hidden=game.phase!=='battle';el('speed').textContent=`速度 ${speed}×`;
  el('reward').hidden=game.phase!=='reward';
  if(game.phase==='reward'&&(force||lastPhase!=='reward')){
    const actions=el('reward-options');actions.replaceChildren();
    for(const id of game.choices){
      const button=document.createElement('button');button.type='button';button.textContent=`${REWARDS[id].name}：${REWARDS[id].detail}`;
      button.addEventListener('click',()=>{
        if(!choose(game,id))return;
        selectedPad=null;save();notify(game.lastResult);render(true);
      });actions.appendChild(button);
    }
  }
  if(lastPhase!==game.phase){
    lastPhase=game.phase;
    if(['reward','won','lost'].includes(game.phase)){save();notify(game.lastResult);}
  }
}
function place(slot){
  if(game.phase!=='planning')return;
  selectedPad=slot;
  if(game.towers.some(t=>t.slot===slot)){notify('配置済みの塔です。撤去（全額返金）で変更できます。');}
  else{const result=build(game,slot,chosen);notify(result.reason);if(result.ok&&!save())notify('建設しました。端末の保存領域を利用できないため、再読み込みすると進行が失われます。');}
  render();
}
for(const kind of Object.keys(TOWERS))el(kind).addEventListener('click',()=>{chosen=kind;selectedPad=null;notify(`${TOWERS[kind].name}を選択。建設地点をタップして配置。`);render();});
for(const button of document.querySelectorAll('[data-slot]'))button.addEventListener('click',()=>place(Number(button.dataset.slot)));
el('remove').addEventListener('click',()=>{
  if(selectedPad===null)return;const result=remove(game,selectedPad);notify(result.reason);if(result.ok)save();render();
});
el('start').addEventListener('click',()=>{
  if(!begin(game))return notify('先に塔を最低1基配置してください。');
  paused=false;save();notify('敵が進軍中。一時停止はいつでもできます。');render(true);
});
el('pause').addEventListener('click',()=>{if(game.phase!=='battle')return;paused=!paused;save();notify(paused?'一時停止しました。':'再開しました。');render();});
el('speed').addEventListener('click',()=>{speed=speed===1?2:1;render();});
el('reset').addEventListener('click',()=>{
  if(!window.confirm('現在の防衛を最初からやり直しますか？'))return;
  game=newGame();selectedPad=null;chosen='bolt';paused=false;speed=1;lastPhase='';save();notify('最初の準備に戻りました。');render(true);
});
el('help').addEventListener('click',()=>{const guide=el('guide');guide.hidden=!guide.hidden;el('help').setAttribute('aria-expanded',String(!guide.hidden));});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&game.phase==='battle'){paused=true;save();render();}
});
const colors={field:0x295c52,path:0xceb48d,blue:0x94e1ef,gold:0xffdfa2};
class DualKeepScene extends Phaser.Scene{
  constructor(){super('dualkeep');}
  create(){
    this.pen=this.add.graphics();
    this.input.on('pointerdown',pointer=>{
      if(game.phase!=='planning')return;
      let nearest=-1,distance=31;
      for(let i=0;i<PADS.length;i++){
        const d=Phaser.Math.Distance.Between(pointer.x,pointer.y,PADS[i].x,PADS[i].y);
        if(d<distance){distance=d;nearest=i;}
      }
      if(nearest>=0)place(nearest);
    });
    render(true);
  }
  update(_clock,delta){
    if(game.phase==='battle'&&!paused&&!document.hidden){
      advanceBattle(game,delta/1000,speed);
      if(frame%18===0)save();
    }
    if(frame%6===0)render();
    frame++;
    this.paint();
  }
  paint(){
    const g=this.pen;g.clear();g.fillStyle(colors.field);g.fillRoundedRect(4,4,352,352,16);
    for(const x of Object.values(LANES)){
      g.fillStyle(0x836b51);g.fillRoundedRect(x-24,2,48,349,12);
      g.fillStyle(colors.path);g.fillRoundedRect(x-19,2,38,343,10);
      g.lineStyle(2,0xf3e3b8,.5);g.lineBetween(x,20,x,329);
      g.fillStyle(0x193240);g.fillRoundedRect(x-24,1,48,19,5);
    }
    g.fillStyle(0x122d3c);g.fillRoundedRect(87,332,186,26,8);g.lineStyle(2,colors.gold);g.strokeRoundedRect(87,332,186,26,8);
    g.fillStyle(colors.gold);g.fillTriangle(172,343,180,335,188,343);
    for(let i=0;i<PADS.length;i++){
      const pad=PADS[i],tower=game.towers.find(t=>t.slot===i),highlight=game.phase==='planning'&&i===selectedPad;
      if(tower){
        if(game.phase==='planning'){
          g.lineStyle(highlight?2:1,highlight?0xffdc85:0x8ed5cf,highlight?.85:.24);
          g.strokeCircle(pad.x,pad.y,TOWERS[tower.kind].range);
        }
        g.fillStyle(tower.kind==='bolt'?0x437e68:0x5e82a7);g.fillCircle(pad.x,pad.y,18);
        g.lineStyle(3,0xf5e9c8);g.strokeCircle(pad.x,pad.y,18);
        if(tower.kind==='bolt'){
          g.fillStyle(0xffe4a8);g.fillTriangle(pad.x,pad.y-12,pad.x-8,pad.y+9,pad.x+8,pad.y+9);
        }else{
          g.fillStyle(0xc2f3ff);g.fillCircle(pad.x,pad.y,8);
          g.lineStyle(1,0xe9f9ff);g.strokeCircle(pad.x,pad.y,11);
        }
      }else{
        g.fillStyle(0x193d4b);g.fillCircle(pad.x,pad.y,23);
        g.lineStyle(2,highlight?0xffe3a1:colors.blue);g.strokeCircle(pad.x,pad.y,23);
        g.lineBetween(pad.x-8,pad.y,pad.x+8,pad.y);
        g.lineBetween(pad.x,pad.y-8,pad.x,pad.y+8);
        if(highlight){g.lineStyle(1,0xffe3a1,.55);g.strokeCircle(pad.x,pad.y,TOWERS[chosen].range);}
      }
    }
    for(const enemy of game.enemies){
      const r=enemy.kind==='brute'?15:enemy.kind==='runner'?9:12;
      g.fillStyle(enemy.kind==='brute'?0xad91d4:enemy.kind==='runner'?0xf2c46e:0xec978e);g.fillCircle(enemy.x,enemy.y,r);
      if(enemy.slow>0){g.lineStyle(2,0xb4edff);g.strokeCircle(enemy.x,enemy.y,r+3);}
      g.fillStyle(0x12303a);g.fillRect(enemy.x-15,enemy.y-r-8,30,4);
      g.fillStyle(0xbff3c3);g.fillRect(enemy.x-15,enemy.y-r-8,30*Math.max(0,enemy.hp)/ENEMIES[enemy.kind].hp,4);
    }
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'arena',width:SIZE.width,height:SIZE.height,
  backgroundColor:'#0c2631',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[DualKeepScene]});
render(true);
