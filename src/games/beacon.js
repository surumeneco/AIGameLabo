// Beacon Keep: deterministic rule engine. No DOM or Phaser dependencies.
export const WIDTH=420, HEIGHT=480, CENTER={x:210,y:239};
export const WAVES=[12,15,18];
export const PERKS={
  edge:{name:'鋭い刃',detail:'斬撃の威力 +1',kind:'attack'},
  reach:{name:'長い刃',detail:'斬撃の届く範囲 +23',kind:'attack'},
  rhythm:{name:'連撃',detail:'斬撃の再使用が25%早い',kind:'attack'},
  stride:{name:'軽快な足取り',detail:'移動速度 +50',kind:'move'},
  bulwark:{name:'広い盾',detail:'防御範囲 +35・反撃',kind:'guard'},
  repair:{name:'灯火の修復',detail:'灯火の耐久を4回復（上限12）',kind:'repair'},
  vitality:{name:'応急手当',detail:'体力を4回復（上限15）',kind:'heal'},
  pulse:{name:'火花の追撃',detail:'斬撃が届いた敵の周囲にも1ダメージ',kind:'attack'}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rng=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296};
const has=(s,p)=>s.perks.includes(p);
export const attackRadius=s=>76+(has(s,'reach')?23:0);
export const damage=s=>2+(has(s,'edge')?1:0);
export const moveSpeed=s=>185+(has(s,'stride')?50:0);
export const attackDelay=s=>has(s,'rhythm')?.48:.66;
export const guardRadius=s=>80+(has(s,'bulwark')?35:0);
export function newRun(seed=Date.now()){
 return {version:1,seed:(seed>>>0)||1,phase:'ready',wave:0,elapsed:0,spawnClock:0,spawnCount:0,nextId:1,beaconHp:12,player:{x:210,y:330,tx:210,ty:330,hp:15},enemies:[],kills:0,perks:[],offers:[],attackCd:0,guardCd:0,guardTime:0,slashTime:0,flash:0,message:'まずは襲撃を開始。迫る影から中央の灯火を守ろう。'};
}
export function start(s){if(s.phase!=='ready')return false;s.phase='fighting';s.message='敵が来る。地面をタップして移動、斬撃で迎え撃とう。';return true;}
export function aim(s,x,y){if(s.phase!=='fighting'||!Number.isFinite(x)||!Number.isFinite(y))return false;s.player.tx=clamp(x,17,403);s.player.ty=clamp(y,20,462);return true;}
export function slash(s){if(s.phase!=='fighting'||s.attackCd>0)return 0;s.attackCd=attackDelay(s);s.slashTime=.18;let hits=0;const splashes=[];
 for(const e of s.enemies){if(dist(e,s.player)<=attackRadius(s)){e.hp-=damage(s);e.hit=.22;hits++;if(has(s,'pulse'))splashes.push(e);}}
 if(splashes.length){for(const e of s.enemies){if(e.hp<=0||splashes.includes(e))continue;if(splashes.some(h=>dist(h,e)<67)){e.hp-=1;e.hit=.22;}}}
 settle(s);return hits;
}
export function guard(s){if(s.phase!=='fighting'||s.guardCd>0)return false;s.guardCd=4.2;s.guardTime=1.25;const radius=guardRadius(s);let blocked=0;
 for(const e of s.enemies){if(dist(e,s.player)<radius){e.stun=.8;e.hit=.23;const d=dist(e,s.player)||1;e.x=clamp(e.x+(e.x-s.player.x)/d*28,10,410);e.y=clamp(e.y+(e.y-s.player.y)/d*28,10,470);if(has(s,'bulwark'))e.hp-=1;blocked++;}}
 settle(s);s.message=blocked?`盾で${blocked}体を押し返した。`:'盾を構えた。攻撃を防げるのは短い間だけ。';return true;
}
function settle(s){const before=s.enemies.length;s.enemies=s.enemies.filter(e=>e.hp>0);s.kills+=before-s.enemies.length;}
function spawn(s){const roll=rng(s),kind=s.wave>0&&roll<.27?'shooter':s.wave>0&&roll<.46?'heavy':roll>.75?'swift':'shade';const a=rng(s)*Math.PI*2;
 const r=213;const x=clamp(CENTER.x+Math.cos(a)*r,20,400),y=clamp(CENTER.y+Math.sin(a)*r,20,460);
 s.enemies.push({id:s.nextId++,kind,x,y,hp:kind==='heavy'?5:kind==='swift'?1:kind==='shooter'?2:3,maxHp:kind==='heavy'?5:kind==='swift'?1:kind==='shooter'?2:3,speed:kind==='heavy'?40:kind==='swift'?97:kind==='shooter'?53:61,stun:0,hit:0,attackCd:0,windup:0});s.spawnCount++;
}
function offers(s){const ids=Object.keys(PERKS).filter(k=>!s.perks.includes(k));for(let i=ids.length-1;i>0;i--){const j=Math.floor(rng(s)*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids.slice(0,3);}
export function choose(s,id){if(s.phase!=='choice'||!s.offers.includes(id)||!PERKS[id])return false;s.perks.push(id);
 if(id==='repair')s.beaconHp=Math.min(12,s.beaconHp+4);
 if(id==='vitality')s.player.hp=Math.min(15,s.player.hp+4);
 s.wave++;s.elapsed=0;s.spawnClock=0;s.spawnCount=0;s.enemies=[];s.offers=[];s.guardCd=0;s.attackCd=0;s.guardTime=0;s.phase='fighting';s.message=`${PERKS[id].name}を獲得。第${s.wave+1}波が始まる。`;return true;
}
export function tick(s,dt){if(s.phase!=='fighting'||!Number.isFinite(dt)||dt<=0)return;dt=clamp(dt,0,.05);s.elapsed+=dt;
 s.attackCd=Math.max(0,s.attackCd-dt);s.guardCd=Math.max(0,s.guardCd-dt);s.guardTime=Math.max(0,s.guardTime-dt);s.slashTime=Math.max(0,s.slashTime-dt);s.flash=Math.max(0,s.flash-dt);
 const dx=s.player.tx-s.player.x,dy=s.player.ty-s.player.y,d=Math.hypot(dx,dy);if(d>1){const move=Math.min(d,moveSpeed(s)*dt);s.player.x+=dx/d*move;s.player.y+=dy/d*move;}
 // Spawns vary by wave and seed; exactly a finite number of enemies per wave.
 const cap=[7,10,13][s.wave], interval=[1.65,1.45,1.30][s.wave];
 s.spawnClock+=dt;
 if(s.spawnCount<cap&&s.spawnClock>=interval&&s.elapsed<=WAVES[s.wave]){s.spawnClock-=interval;spawn(s);}
 const guarding=s.guardTime>0;
 for(const e of s.enemies){e.hit=Math.max(0,e.hit-dt);e.stun=Math.max(0,e.stun-dt);e.attackCd=Math.max(0,e.attackCd-dt);if(e.stun>0)continue;
  // Shooters must be hunted: from outside slash range they telegraph a ranged hit.
  const shooting=e.kind==='shooter';
  const target=!shooting&&e.kind!=='swift'&&dist(e,s.player)<95?s.player:CENTER;
  const ex=target.x-e.x,ey=target.y-e.y,ed=Math.hypot(ex,ey),stop=shooting?138:target===CENTER?24:23;
  if(ed>stop){const mv=Math.min(Math.max(0,ed-stop),e.speed*dt);if(ed){e.x+=ex/ed*mv;e.y+=ey/ed*mv;}}
  if(shooting&&dist(e,CENTER)<=139){e.windup+=dt;if(e.windup>=1.15){if(guarding&&dist(s.player,CENTER)<guardRadius(s)){e.stun=.65;e.hit=.2;}else{s.beaconHp--;s.flash=.22;}e.windup=-2.4;}}
  const atPlayer=dist(e,s.player)<27,atBeacon=dist(e,CENTER)<27;
  if(atPlayer&&e.attackCd<=0){e.attackCd=1.7;if(guarding){e.stun=.6;e.hit=.2;if(has(s,'bulwark'))e.hp-=1;}else{s.player.hp--;s.flash=.2;}}
  if(!shooting&&atBeacon&&e.attackCd<=0){e.attackCd=1.4;
   if(guarding&&dist(s.player,CENTER)<guardRadius(s)){e.stun=.7;e.hit=.2;if(has(s,'bulwark'))e.hp-=1;}
   else {s.beaconHp--;s.flash=.25;}
  }
 }
 settle(s);s.beaconHp=Math.max(0,s.beaconHp);s.player.hp=Math.max(0,s.player.hp);
 if(s.beaconHp<=0||s.player.hp<=0){s.phase='lost';s.message=s.beaconHp<=0?'灯火が消えた。守る位置と強化を変えて再挑戦しよう。':'倒れてしまった。盾と移動を組み合わせよう。';return;}
 if(s.elapsed>=WAVES[s.wave]&&s.enemies.length===0){if(s.wave===2){s.phase='won';s.message=`3波防衛成功。撃破${s.kills}体。異なる強化でもう一度挑戦できる。`;}else{s.phase='choice';s.offers=offers(s);s.message=`第${s.wave+1}波を突破。次の戦い方を選ぼう。`;}}
}
