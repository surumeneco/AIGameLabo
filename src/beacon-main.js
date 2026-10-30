import Phaser from 'phaser';
import {CENTER,WIDTH,HEIGHT,WAVES,PERKS,newRun,start,aim,slash,guard,choose,tick,attackRadius,guardRadius} from './games/beacon.js';
const $=id=>document.getElementById(id);
const BEST='aigamelabo:beacon-keep:best:v1';
const readBest=()=>{try{return Number(localStorage.getItem(BEST))||0;}catch{return 0;}};
let best=readBest();let run=newRun();let scene;let lastPhase='';let frame=0;let soundEnabled=false;
function saveBest(){const points=run.kills*10+Math.max(0,run.beaconHp)*5+(run.phase==='won'?200:0);if(points<=best)return;best=points;try{localStorage.setItem(BEST,String(best));}catch{}}
function message(text){$('notice').textContent=text;}
function renderUi(){
 $('wave').textContent=run.phase==='won'?'防衛完了':`第${run.wave+1}波 / 3`;
 $('objective').textContent=run.phase==='ready'?'中央の灯火を守り、3回の襲撃を突破しよう。':run.phase==='choice'?'好きな強化をひとつ選び、戦い方を変えよう。':run.phase==='won'?'3回の襲撃を突破。次は別の強化を試せる。':run.phase==='lost'?'今回は防衛失敗。別の立ち回りで再挑戦できる。':'影を斬って灯火を守ろう。敵の位置を見て移動。';
 $('hp').textContent=`${Math.max(0,run.player.hp)} / 15`;$('beacon').textContent=`${Math.max(0,run.beaconHp)} / 12`;$('kills').textContent=run.kills;
 $('best').textContent=best;$('clock').textContent=run.phase==='fighting'?(run.elapsed>=WAVES[run.wave]?`残敵 ${run.enemies.length}体`:`残り ${Math.max(0,Math.ceil(WAVES[run.wave]-run.elapsed))} 秒`):'準備中';
 $('meter').style.width=`${Math.min(100,run.elapsed/WAVES[run.wave]*100)}%`;
 $('attack').disabled=run.phase!=='fighting'||run.attackCd>0;
 $('attack').textContent=run.attackCd>0?`斬撃 ${run.attackCd.toFixed(1)}s`:'斬撃';
 $('guard').disabled=run.phase!=='fighting'||run.guardCd>0;
 $('guard').textContent=run.guardCd>0?`盾 ${run.guardCd.toFixed(1)}s`:'盾を構える';
 if(run.phase!==lastPhase){
  lastPhase=run.phase;message(run.message);
  const pane=$('phase-panel');pane.hidden=run.phase==='fighting';
  const title=$('panel-title'),detail=$('panel-detail'),actions=$('panel-actions');actions.replaceChildren();
  const button=(label,fn,klass='')=>{const b=document.createElement('button');b.type='button';b.className=klass;b.textContent=label;b.addEventListener('click',fn);actions.append(b);};
  if(run.phase==='ready'){title.textContent='灯火の砦';detail.textContent='影が灯火に迫る。地面をタップして移動し、近くの影を「斬撃」で倒そう。「盾」は一瞬だけ攻撃を防ぐ。3波守り切れば勝利。';button('防衛を始める',()=>{start(run);renderUi();});}
  else if(run.phase==='choice'){title.textContent='次の戦い方を選ぶ';detail.textContent='どれを選んでも次へ進める。効果は最後まで続く。';for(const id of run.offers){button(`${PERKS[id].name} — ${PERKS[id].detail}`,()=>{choose(run,id);renderUi();},'perk');}}
  else if(run.phase==='lost'||run.phase==='won'){saveBest();title.textContent=run.phase==='won'?'防衛成功':'灯火を守りきれなかった';detail.textContent=`撃破 ${run.kills}体 ・ 灯火耐久 ${Math.max(0,run.beaconHp)}。強化の選び方と立ち位置を変えて再挑戦。`;button('もう一度遊ぶ',()=>{run=newRun();lastPhase='';renderUi();});}
 }
}
$('attack').addEventListener('click',()=>{const hits=slash(run);if(run.phase==='fighting')message(hits?`${hits}体に斬撃が届いた。`:'近くに敵がいない。距離を詰めよう。');renderUi();});
$('guard').addEventListener('click',()=>{if(guard(run))message(run.message);renderUi();});
$('help').addEventListener('click',()=>{const el=$('instructions');el.hidden=!el.hidden;$('help').setAttribute('aria-expanded',String(!el.hidden));});
$('restart').addEventListener('click',()=>{if(run.phase==='fighting'&&!window.confirm('この挑戦を最初からやり直しますか？'))return;run=newRun();lastPhase='';renderUi();});
const PALETTE={sky:0x0c2335,field:0x153c40,field2:0x20514d,grid:0x2f6260,glow:0xfad587,hero:0x8fdce1};
class KeepScene extends Phaser.Scene{
 constructor(){super('keep');}
 create(){scene=this;this.g=this.add.graphics();this.g.setDepth(3);this.input.on('pointerdown',p=>{if(aim(run,p.x,p.y)){message('移動先を指定した。');renderUi();}});this.input.on('pointermove',p=>{if(p.isDown)aim(run,p.x,p.y);});renderUi();}
 update(_,delta){if(run.phase==='fighting'&&!document.hidden){let seconds=Math.min(delta/1000,.08);while(seconds>0){const part=Math.min(seconds,.04);tick(run,part);seconds-=part;}}if(++frame%7===0)renderUi();this.draw();}
 draw(){const g=this.g;g.clear();g.fillStyle(PALETTE.sky);g.fillRect(0,0,WIDTH,HEIGHT);
  // An actual arena rather than a diagram: dark turf, masonry, glowing flora.
  g.fillStyle(PALETTE.field);g.fillRoundedRect(13,13,394,454,32);g.lineStyle(3,0x518b80,.55);g.strokeRoundedRect(13,13,394,454,32);
  for(let i=0;i<15;i++){const x=27+(i*71%362),y=30+(i*97%410);g.lineStyle(1,0x639484,.25);g.lineBetween(x,y,x+12,y-3);g.fillStyle(0x96d5b0,.35);g.fillCircle(x-4,y+3,2);}
  for(let i=0;i<4;i++){const r=42+i*32;g.lineStyle(1,PALETTE.grid,.33);g.strokeCircle(CENTER.x,CENTER.y,r);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4;g.fillStyle(0x3c6669,.8);g.fillCircle(CENTER.x+Math.cos(a)*163,CENTER.y+Math.sin(a)*163,7);}
  // Glowing beacon; HP influences its brightness.
  const b=run.beaconHp/12;g.fillStyle(0xf0b866,.09+b*.16);g.fillCircle(CENTER.x,CENTER.y,48+b*18);g.fillStyle(0x334955);g.fillCircle(CENTER.x,CENTER.y,26);g.lineStyle(3,0x8cabb1);g.strokeCircle(CENTER.x,CENTER.y,25);
  const pulse=1+Math.sin(this.time.now/320)*.09;g.fillStyle(b>0?0xffd17c:0x53626a,.95);g.fillTriangle(CENTER.x,CENTER.y-21*pulse,CENTER.x-12,CENTER.y+10,CENTER.x+12,CENTER.y+10);g.fillStyle(0xfff1be,.86*b);g.fillCircle(CENTER.x,CENTER.y,8);
  if(run.flash>0){g.fillStyle(0xe46069,run.flash*.3);g.fillRect(0,0,WIDTH,HEIGHT);}
  // Current movement destination and range give immediate, accurate feedback.
  if(run.phase==='fighting'){const p=run.player;g.lineStyle(1,0x8ec9c2,.45);g.strokeCircle(p.x,p.y,attackRadius(run));g.lineStyle(2,0x9edbd0,.55);g.strokeCircle(p.tx,p.ty,9);g.lineBetween(p.tx-5,p.ty,p.tx+5,p.ty);g.lineBetween(p.tx,p.ty-5,p.tx,p.ty+5);}
  for(const e of run.enemies){const heavy=e.kind==='heavy',swift=e.kind==='swift';const col=e.hit>0?0xffffff:e.kind==='shooter'?0x9ce3a0:heavy?0xb78ae8:swift?0xf2bc76:0xef7080;
   g.fillStyle(0x091520,.58);g.fillEllipse(e.x+2,e.y+10,29,11);g.fillStyle(col);if(heavy)g.fillRoundedRect(e.x-16,e.y-16,32,32,7);else if(swift)g.fillTriangle(e.x,e.y-18,e.x-16,e.y+12,e.x+16,e.y+12);else g.fillCircle(e.x,e.y,14);
   g.fillStyle(0x162838);g.fillCircle(e.x-5,e.y-3,2.2);g.fillCircle(e.x+5,e.y-3,2.2);
   if(e.kind==='shooter'&&e.windup>0){g.lineStyle(2,0xd9f8ae,.3+e.windup*.5);g.lineBetween(e.x,e.y,CENTER.x,CENTER.y);}g.fillStyle(0x122b31,.8);g.fillRect(e.x-16,e.y-25,32,4);g.fillStyle(0x9be4bd);g.fillRect(e.x-16,e.y-25,32*Math.max(0,e.hp/e.maxHp),4);
  }
  const p=run.player;
  if(run.guardTime>0){g.fillStyle(0x8cddff,.13);g.fillCircle(p.x,p.y,guardRadius(run));g.lineStyle(4,0x91e4ff,.9);g.strokeCircle(p.x,p.y,guardRadius(run));}
  if(run.slashTime>0){g.lineStyle(12,0xffe19c,run.slashTime*4.6);g.strokeCircle(p.x,p.y,attackRadius(run)-8);}
  g.fillStyle(0x06151c,.5);g.fillEllipse(p.x,p.y+17,30,12);g.fillStyle(PALETTE.hero);g.fillCircle(p.x,p.y,16);g.lineStyle(3,0xf6f5d6,.85);g.strokeCircle(p.x,p.y,16);g.fillStyle(0x123947);g.fillCircle(p.x-5,p.y-4,2.6);g.fillCircle(p.x+5,p.y-4,2.6);g.fillStyle(0xffe4a4);g.fillRoundedRect(p.x-7,p.y+6,14,5,2);
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'arena',width:WIDTH,height:HEIGHT,backgroundColor:'#0c2335',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[KeepScene],render:{antialias:true}});
renderUi();
